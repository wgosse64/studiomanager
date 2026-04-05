# Production Readiness Checklist — Supabase

## Supabase Project Configuration

### Plan & Infrastructure

- [ ] Upgrade to **Supabase Pro plan** ($25/mo) — free tier has aggressive limits on storage, edge function invocations, and pauses after 1 week of inactivity
- [ ] Choose a region close to your users (probably `us-east-1` or `us-west-1`)
- [ ] Enable **Point-in-Time Recovery (PITR)** — continuous Postgres backups, not just daily snapshots
- [ ] Note your project ref and connection strings — you'll need the pooler connection string for Edge Functions

### Database

- [ ] Run all migrations via `supabase db push` or the migration system (`supabase migration new` / `supabase db reset`) — never apply schema changes by hand in production
- [ ] Verify `btree_gist` extension is enabled (required for the booking exclusion constraint)
- [ ] Verify `uuid-ossp` extension is enabled
- [ ] Test the exclusion constraint under concurrent inserts — try to double-book from two browser tabs simultaneously
- [ ] Add indexes for every FK and every column you filter/sort on in the UI (especially `booking_resources.resource_id`, `booking_resources.time_range`, `bookings.client_id`, `bookings.status`, `invoices.client_id`, `invoices.status`, `messages.client_id`)
- [ ] Add `CHECK` constraints for status columns to prevent invalid values (e.g. `CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed'))`)
- [ ] Set up a DB trigger to auto-delete `booking_resources` rows when a booking is cancelled
- [ ] Set up the `updated_at` trigger on all relevant tables
- [ ] Set up the profile creation trigger on `auth.users` insert

### Row-Level Security

- [ ] **RLS is enabled on every single table** — if you miss one, it's world-readable via the Supabase client
- [ ] Write and test policies for every table × every operation (SELECT, INSERT, UPDATE, DELETE)
- [ ] Test as each role: log in as admin, staff, and client and verify you can only see/do what you should
- [ ] Verify clients cannot see `is_internal = true` messages
- [ ] Verify clients cannot update invoice or payment records
- [ ] Verify clients can only see their own bookings, files, invoices, and messages
- [ ] Verify the `get_user_role()` helper function is `SECURITY DEFINER` (runs as the function owner, not the calling user)
- [ ] Run the Supabase **RLS Advisor** in the dashboard to catch unprotected tables

### Auth

- [ ] Disable email confirmations if not needed, or configure a custom SMTP provider (Supabase's built-in email has strict rate limits — 4 emails/hour on free)
- [ ] Set up a **custom SMTP provider** (Resend, Postmark, or SendGrid) for invite emails, password resets, and magic links
- [ ] Configure password policy (minimum length, require complexity if desired)
- [ ] Set JWT expiry to a reasonable duration (default 3600s / 1 hour is fine for most cases)
- [ ] Disable any auth providers you're not using (GitHub, Google, etc.) — only keep email/password and/or magic link
- [ ] Test the full invite flow: admin invites staff → staff gets email → staff signs up → profile created → role is correct
- [ ] Test the client invite flow end-to-end
- [ ] Set up rate limiting on auth endpoints (Supabase has built-in rate limits, but verify they're sane)

### Edge Functions

- [ ] All secrets set via `supabase secrets set` — never hardcoded
- [ ] Verify `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are all set
- [ ] Edge Functions use the **service role key** (not the anon key) for DB operations that bypass RLS (e.g. webhook handlers updating payment status)
- [ ] Add proper error handling — every function should return meaningful HTTP status codes and never leak stack traces
- [ ] Add request validation — check required fields, validate types, reject malformed input
- [ ] Stripe webhook handler verifies the signature on every request
- [ ] Test Edge Functions against Stripe's test mode before going live
- [ ] Deploy all functions: `supabase functions deploy <name>` for each

### Storage

- [ ] Create buckets: `shared-files` (private), `avatars` (public)
- [ ] Set **RLS policies on storage buckets** — Supabase storage respects RLS
- [ ] Clients can only read files where `client_id` matches their profile
- [ ] Only staff/admin can delete files
- [ ] Set a max file size per upload (Supabase default is 50MB — adjust in dashboard if needed)
- [ ] Configure allowed MIME types if you want to restrict uploads (e.g. audio files, images, PDFs only)
- [ ] Test signed URL generation — verify URLs expire correctly and scoping works

### Realtime

- [ ] Enable Realtime on the tables that need it: `booking_resources`, `messages`, `bookings`
- [ ] Do NOT enable Realtime on tables that don't need it (invoices, payments, profiles) — it adds overhead
- [ ] Verify Realtime respects RLS — clients should only receive events for their own data
- [ ] Test with multiple browser tabs to confirm live updates work

---

## Stripe Configuration

### Account Setup

- [ ] Stripe account is activated (not in test mode) with bank account connected for payouts
- [ ] Business details, tax info, and branding configured in Stripe Dashboard
- [ ] **Test mode testing is complete** before flipping to live keys

### API Keys

- [ ] Live `STRIPE_SECRET_KEY` stored as Supabase Edge Function secret
- [ ] Live `STRIPE_PUBLISHABLE_KEY` stored in React app's env (this one is safe to expose client-side)
- [ ] Test keys removed from all deployed environments

### Webhook

- [ ] Webhook endpoint created in Stripe Dashboard pointing to `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- [ ] Subscribed to events: `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `checkout.session.completed`
- [ ] Webhook signing secret stored as Supabase Edge Function secret
- [ ] Test the webhook using `stripe trigger invoice.paid` from the Stripe CLI
- [ ] Verify idempotency — if the same webhook fires twice, the app doesn't create duplicate payment records (use `stripe_payment_intent_id` uniqueness constraint)

### Invoicing

- [ ] Test full invoice flow: create → send → client pays → webhook confirms → status updates
- [ ] Test failed payment flow: client's card declines → webhook fires → invoice marked overdue
- [ ] Test refund flow: refund in Stripe Dashboard → webhook fires → payment marked refunded
- [ ] Verify Stripe Customer objects are created correctly from client profiles

---

## QuickBooks Integration

- [ ] QuickBooks Online account is set up
- [ ] Stripe ↔ QuickBooks sync is configured (native integration or Synder)
- [ ] Verify a test Stripe payment flows through to QuickBooks as an income entry
- [ ] Chart of accounts in QuickBooks is set up for the studio's needs

---

## React Frontend

### Build & Deploy

- [ ] `npm run build` completes with zero errors and zero warnings
- [ ] TypeScript strict mode enabled — no `any` types leaking through
- [ ] Environment variables are set in the hosting platform (Vercel/Netlify), not committed to git
- [ ] `.env` files are in `.gitignore`
- [ ] Verify the deployed app loads and authenticates correctly on the production Supabase project

### Auth & Routing

- [ ] Route guards work: unauthenticated users → login page
- [ ] Role-based guards work: clients → portal routes only, staff/admin → internal routes only
- [ ] Typing a protected URL directly redirects appropriately
- [ ] Session refresh works — user doesn't get logged out unexpectedly
- [ ] Logout clears all local state and Supabase session

### Error Handling

- [ ] Every API call (Supabase queries, Edge Function calls) has error handling
- [ ] User sees friendly error messages, not raw error objects
- [ ] Failed booking creation (conflict) shows a clear message about which resource is unavailable
- [ ] Network errors are handled gracefully (offline state, timeouts)
- [ ] Add a global error boundary component to catch unhandled React errors

### Loading States

- [ ] Every data fetch shows a loading indicator
- [ ] Calendar doesn't flash empty then populate — use skeleton loaders
- [ ] Buttons disable during async operations to prevent double-submits
- [ ] Optimistic UI for messages (show immediately, roll back on error)

### Forms & Validation

- [ ] All forms validate client-side before submitting (required fields, date ranges, valid times)
- [ ] Booking form checks resource availability client-side before hitting the DB
- [ ] Invoice form calculates totals correctly (line items × quantity, subtotal + tax)
- [ ] File upload shows progress and handles failures

### Accessibility & Responsive

- [ ] Calendar is usable on tablet (staff at front desk may use an iPad)
- [ ] Client portal is fully mobile-responsive
- [ ] Color-coded status indicators have non-color differentiators (icons, text labels) for color-blind users
- [ ] All interactive elements are keyboard accessible
- [ ] Form labels and ARIA attributes are present

---

## Security

### General

- [ ] Supabase anon key is in the React app — that's fine, it's designed to be public. But verify RLS is airtight because the anon key + RLS is your access control
- [ ] Service role key is ONLY used in Edge Functions, NEVER in the React app
- [ ] No secrets in git history — if any were ever committed, rotate them
- [ ] CORS is configured correctly on Supabase (should be fine by default for your frontend domain)

### Input Sanitization

- [ ] Message body text is sanitized/escaped before rendering (prevent XSS)
- [ ] File names are sanitized before storage (strip path traversal characters)
- [ ] All user input in Edge Functions is validated and typed

### Rate Limiting

- [ ] Supabase Auth has built-in rate limiting — verify it's appropriate
- [ ] Consider rate limiting Edge Functions for booking creation (prevent abuse from client portal)
- [ ] File upload size limits are enforced server-side, not just client-side

---

## Monitoring & Observability

### Supabase Dashboard

- [ ] Familiarize yourself with the Supabase Dashboard logs (API logs, Postgres logs, Edge Function logs, Auth logs)
- [ ] Set up Supabase **Log Drains** to an external service if you need long-term log retention (Supabase retains logs for limited time on Pro)

### Error Tracking

- [ ] Add **Sentry** (or similar) to the React app for frontend error tracking
- [ ] Add Sentry to Edge Functions for backend error tracking
- [ ] Verify errors include useful context (user role, route, booking ID, etc.)

### Uptime

- [ ] Set up a simple uptime monitor (UptimeRobot, Better Stack, or similar) on:
  - The frontend URL
  - The Supabase health endpoint
  - The Stripe webhook endpoint (hit it with a GET — should return 405 but confirms it's reachable)

### Alerts

- [ ] Stripe Dashboard alerts for failed payments, disputes
- [ ] Sentry alerts for new error types
- [ ] Supabase alerts for DB nearing storage limits

---

## DNS & Hosting

### Frontend (Vercel/Netlify)

- [ ] Custom domain configured (e.g. `app.studioname.com`)
- [ ] SSL certificate active (automatic with Vercel/Netlify)
- [ ] `www` redirect configured if applicable
- [ ] Preview deployments enabled for PRs (Vercel/Netlify do this by default)

### Supabase

- [ ] Custom domain for Supabase project (optional, Pro plan feature — e.g. `api.studioname.com`)
- [ ] Verify all frontend env vars point to the production Supabase project, not a dev instance

---

## Testing

### Critical Paths to Test End-to-End

- [ ] Staff creates a booking with studio + engineer + equipment → all resources show as reserved on calendar
- [ ] Client requests a booking → staff sees request → approves → client sees confirmed booking
- [ ] Attempt to double-book a resource → clear error message + DB constraint prevents it
- [ ] Staff creates invoice from booking → sends via Stripe → client pays → status updates to paid
- [ ] Client uploads a file → staff sees it → staff uploads a response → client sees it
- [ ] Client sends a message → staff sees it → staff replies → client sees reply in real-time
- [ ] Staff adds an internal note → client does NOT see it
- [ ] Booking is cancelled → resources are freed → time slot is available again
- [ ] Client logs in → sees only their own data across all sections

### Load & Concurrency

- [ ] Two staff members create bookings on the same studio at overlapping times simultaneously — only one succeeds
- [ ] Calendar loads within 2 seconds with a month's worth of bookings
- [ ] File uploads of 50MB+ complete without timeout

---

## Pre-Launch

- [ ] Seed production data: create the 3 studios, staff accounts, any default equipment
- [ ] Owner/admin account is created and tested
- [ ] Staff accounts are created and tested
- [ ] Send test client invite, complete signup, make a booking request, pay a test invoice
- [ ] Stripe is in **live mode** with real API keys deployed
- [ ] QuickBooks sync is verified with a real payment
- [ ] Backup strategy confirmed — PITR enabled, know how to restore
- [ ] Document the "bus factor" basics: where are the env vars, how to deploy, how to access Supabase dashboard, Stripe dashboard, QuickBooks. Write this down for your client in case you're not available.
