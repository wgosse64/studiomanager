# Studio Manager

Music studio management platform. Internal app for staff/admin + client portal for external clients.

## Quick Reference

```
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # ESLint
```

Supabase project: `ubzjlcouhzutxatiljpi.supabase.co`

## Tech Stack

- **Frontend:** React 19, Vite 8, TypeScript 6, Tailwind CSS v4, shadcn/ui (base-nova style)
- **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions, Storage)
- **Payments:** Stripe (Invoicing API + Checkout Sessions + Webhooks)
- **Routing:** react-router-dom v7
- **Icons:** lucide-react
- **Path alias:** `@/` → `src/`

## Architecture

### Polymorphic Resource Model

Studios, engineers, and equipment are all `resources` with a `resource_type` discriminator. Type-specific details live in `studios`, `engineers`, and `equipment` tables (1:1 with `resources`). This gives us one conflict detection system, one calendar, one set of queries.

### Conflict Detection

Lives on `booking_resources` (join table), NOT on `bookings`. Each booking reserves N resources via `booking_resources` rows. A GIST exclusion constraint on `(resource_id, time_range)` prevents double-booking at the DB level. When a booking is cancelled, a trigger deletes its `booking_resources` rows to free the slots.

### Dual UI

- **Internal app** (`/dashboard`, `/calendar`, `/bookings`, `/clients`, `/resources`, `/invoices`, `/files`) — for admin and staff roles
- **Client portal** (`/portal/*`) — for client role, scoped to own data via RLS

### Auth & Roles

Three roles: `admin`, `staff`, `client`. Enforced via Supabase RLS using a `get_user_role()` helper function. Root route `/` redirects based on role. `ProtectedRoute` component handles route guards.

### Invoicing

Decoupled from bookings. An invoice can cover multiple bookings + freeform line items. Payments track Stripe events. Staff creates invoices, sends via Stripe, webhooks confirm payment.

## Project Structure

```
src/
  App.tsx                    # Router — all routes defined here
  main.tsx                   # Entry point
  lib/
    supabase.ts              # Supabase client
    types.ts                 # All TypeScript interfaces/types
    utils.ts                 # shadcn/ui cn() helper
  contexts/
    AuthContext.tsx           # Auth state, signIn/signUp/signOut, role helpers
  components/
    Layout.tsx               # InternalLayout, PortalLayout, PublicLayout
    ProtectedRoute.tsx       # Role-based route guard
    ui/                      # shadcn/ui components (do not edit manually)
  pages/
    AuthPage.tsx             # Login/signup
    LandingPage.tsx          # Role-based redirect
    Dashboard.tsx            # Staff dashboard with stats
    CalendarPage.tsx         # Master calendar — studios as rows
    FilesPage.tsx            # File management + upload
    bookings/
      BookingsPage.tsx       # All bookings list with filters
      BookingRequests.tsx    # Pending requests — approve/deny
      BookingDetail.tsx      # Single booking detail + messages
      NewBooking.tsx         # Create booking form
    clients/
      ClientsPage.tsx        # Client directory
      ClientDetail.tsx       # Client profile + tabs (bookings/invoices/files/messages)
      InviteClient.tsx       # Invite new client
    resources/
      ResourcesPage.tsx      # Tabbed resource list (studios/engineers/equipment)
      ResourceDetail.tsx     # Resource detail + edit
      NewResource.tsx        # Create resource (any type)
    invoices/
      InvoicesPage.tsx       # All invoices with status filter
      InvoiceDetail.tsx      # Invoice detail + actions (send/pay/void)
      NewInvoice.tsx         # Create invoice with line items
    portal/
      PortalDashboard.tsx    # Client home — upcoming bookings, invoices, stats
      PortalBookings.tsx     # Client's bookings list
      PortalBookingRequest.tsx  # Client booking request form
      PortalBookingDetail.tsx   # Booking detail + files + messages
      PortalInvoices.tsx     # Client's invoices
      PortalInvoiceDetail.tsx   # Invoice detail + pay
      PortalFiles.tsx        # Client's shared files
      PortalMessages.tsx     # Client message thread
      PortalProfile.tsx      # Edit contact info
supabase/
  migrations/
    001_initial_schema.sql   # Full schema, triggers, RLS policies
.ai/
  testing-guide.md           # How to test locally
  schema-diagram.md          # ASCII diagram of the database
```

## Database Tables

`profiles` → `resources` → `studios` / `engineers` / `equipment` → `studio_features`
`bookings` → `booking_resources` (conflict constraint here)
`invoices` → `invoice_line_items` → `payments`
`files`, `messages`

See `.ai/schema-diagram.md` for the full relationship diagram.

## Key Patterns

- **Supabase queries** use the client from `@/lib/supabase`. Always import as `import { supabase } from '@/lib/supabase'`.
- **Auth** is accessed via `useAuth()` hook from `@/contexts/AuthContext`. Provides `user`, `profile`, `isAdmin`, `isStaff`, `isClient`.
- **New shadcn/ui components** are added via `npx shadcn@latest add <component>`. They go in `src/components/ui/`. Don't edit these files manually.
- **Resource creation** is a two-step insert: first into `resources`, then into the type-specific table (`studios`/`engineers`/`equipment`).
- **Booking creation** is also two-step: insert into `bookings`, then insert N rows into `booking_resources` with the time range formatted as `[startISO,endISO)`.
- **Real-time subscriptions** are used on `booking_resources` (calendar) and `messages` (chat). Subscribe via `supabase.channel()`.
- **File access** uses Supabase Storage signed URLs — never expose storage paths directly.
- **RLS** is enabled on every table. Clients are scoped by `client_id = auth.uid()`. Staff/admin see all. The `get_user_role()` SQL function is used in policies.

## Environment Variables

```
# .env (not committed)
VITE_SUPABASE_URL=https://ubzjlcouhzutxatiljpi.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...

# Supabase Edge Function secrets (set via CLI)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

## Development Status

Phase 1 (Foundation & Auth) — complete
Phase 2 (Resources & Booking) — UI built, needs calendar drag/drop and availability checking
Phase 3 (Client Portal & Communication) — UI built, needs real invite email flow via Edge Function
Phase 4 (Invoicing & Payments) — UI built, needs Stripe Edge Functions (create-stripe-invoice, stripe-webhook)
Phase 5 (Integration & Polish) — not started

## Edge Functions (not yet implemented)

- `create-stripe-invoice` — creates Stripe Invoice from app invoice, emails payment link
- `create-checkout-session` — for upfront deposits at booking confirmation
- `stripe-webhook` — handles invoice.paid, invoice.payment_failed, charge.refunded
- `generate-invoice-number` — auto-increment invoice numbers

## Storage Buckets

- `shared-files` (private) — client/booking file uploads, accessed via signed URLs
- `avatars` (public) — profile photos
