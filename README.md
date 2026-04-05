# Studio Manager

Internal management platform for a music studio with 3 bookable rooms, staff engineers, and shared equipment. Includes a client-facing portal for booking requests, communication, file sharing, and invoice payment.

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (Postgres, Auth, RLS, Edge Functions, Storage)
- **Payments:** Stripe (Invoicing API + Checkout Sessions + Webhooks)
- **Accounting:** QuickBooks Online (connected via Stripe sync)

## Architecture

### Polymorphic Resource Model

Studios, engineers, and equipment are modeled as a single `resources` table with type-specific detail tables. This gives us unified scheduling, one conflict detection system, and one calendar UI.

```
booking (time range, client, status)
  └── booking_resources (resource_id + time_range, GIST exclusion constraint)
        └── resource (type: studio | engineer | equipment)
```

### Dual Interface

- **Internal App** — Staff/admin dashboard, master calendar, booking management, client directory, resource management, invoicing, file management
- **Client Portal** — Booking requests, invoice viewing/payment, shared files, messaging with studio team

### Roles

| Role | Access |
|------|--------|
| `admin` | Full access — management, settings, team accounts |
| `staff` | Bookings, calendar, clients, files, messages, resources |
| `client` | Own bookings, invoices, files, and messages only |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- (Optional) Stripe account for payments

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

3. Run the database migrations via Supabase CLI:

```bash
supabase db push
```

4. Create storage buckets in Supabase Dashboard:
   - `shared-files` (private)
   - `avatars` (public)

5. Start the dev server:

```bash
npm run dev
```

6. Sign up, then promote yourself to admin in Supabase Table Editor → `profiles` → set `role` to `admin`.

## Development

```bash
npm run dev       # Start dev server (default: http://localhost:5173)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Project Structure

```
src/
  App.tsx                     # All routes
  lib/
    supabase.ts               # Supabase client
    types.ts                  # TypeScript interfaces
  contexts/
    AuthContext.tsx            # Auth state + role helpers
  components/
    Layout.tsx                # Internal, Portal, and Public layouts
    ProtectedRoute.tsx        # Role-based route guard
    ui/                       # shadcn/ui components
  pages/
    bookings/                 # Booking list, requests, detail, creation
    clients/                  # Client directory, detail, invite
    resources/                # Resource management (studios/engineers/equipment)
    invoices/                 # Invoice list, detail, creation
    portal/                   # Client portal pages
    Dashboard.tsx             # Staff dashboard
    CalendarPage.tsx          # Master resource calendar
    FilesPage.tsx             # File management
supabase/
  migrations/                 # SQL migrations
```

## Development Status

- [x] Phase 1 — Foundation & Auth
- [ ] Phase 2 — Resources & Booking (UI built, calendar drag/drop pending)
- [ ] Phase 3 — Client Portal & Communication (UI built, invite email flow pending)
- [ ] Phase 4 — Invoicing & Payments (UI built, Stripe Edge Functions pending)
- [ ] Phase 5 — Integration & Polish
