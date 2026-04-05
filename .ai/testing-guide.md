# Testing Guide

## 1. Apply the database schema

Go to your Supabase dashboard → **SQL Editor** and paste the contents of `supabase/migrations/001_initial_schema.sql`. Run it.

## 2. Create storage buckets

In Supabase dashboard → **Storage**, create two buckets:
- `shared-files` (private)
- `avatars` (public)

## 3. Start the dev server

```
npm run dev
```

## 4. Create your admin account

1. Sign up through the app at `/login`
2. In Supabase dashboard → **Table Editor** → `profiles`, find your row and change `role` from `client` to `admin`
3. Refresh the app — you'll be redirected to `/dashboard`

## 5. Seed some data

From the internal app:
1. **Add resources** at `/resources/new` — create at least one studio, optionally an engineer and some equipment
2. **Invite a client** at `/clients/invite` — enter an email and name
3. **Create a booking** at `/bookings/new` — pick the client, select resources, set a time

## 6. Test the client portal

1. Sign up with a different email at `/login`
2. That account will default to `role = 'client'` and land on `/portal`
3. Request a booking, send a message, browse files

## 7. Test conflict detection

Create two bookings for the same studio at overlapping times — the second insert should fail with a constraint violation from `no_resource_conflicts`.

## Key things to verify

- **Role-based routing:** admin/staff → `/dashboard`, clients → `/portal`
- **RLS:** clients only see their own bookings/invoices/files/messages
- **Real-time:** open the calendar in two tabs, create a booking in one — it should appear in the other
- **Cancellation cleanup:** cancel a booking → its `booking_resources` rows get deleted (freeing the time slot)
