# Customer Accounts & Portal

End-to-end plan for auto-creating customer accounts on payment, linking quotes/jobs to the right user, and giving customers a mobile-friendly self-service portal.

## 1. Payments (prerequisite)

- Enable Lovable's built-in **Stripe payments** (seamless, no API key needed).
- Add tax calculation & collection only (`automatic_tax`) — this is a hands-on service, not eligible for full merchant-of-record handling.
- For each accepted quote, create a one-time Stripe Checkout session for the quote total. On `checkout.session.completed`, mark the quote `paid` and trigger account creation.
- Add a "Pay Now" CTA on the public `/quote/:token` page that appears only when the quote status is `accepted`.

## 2. Database changes (one migration)

- New enum value `app_role.customer` (admin already exists).
- Add `user_id uuid` columns on `customers`, `quotes`, `jobs`, `booking_requests`, `payments` so rows can be scoped to a customer's auth user.
- Add `customer_visible boolean default false` to `job_photos` and an existing notes field, plus a new `job_updates` table for the timeline (admin-authored, marked customer-visible).
- New `payments` columns: `stripe_session_id`, `stripe_payment_intent`, `status`, `amount`, `paid_at`.
- RLS: customers can `SELECT` only rows where `user_id = auth.uid()`; admins keep current full access via `has_role(auth.uid(), 'admin')`. Storage policies on `request-photos` and `job-photos` buckets restrict customer reads to their own folders.
- Helper RPC `link_customer_user(_email, _user_id)` (security definer) attaches a newly-confirmed user to all existing customer/quote/job/request rows that match the email.

## 3. Account creation flow

A new edge function `stripe-webhook` (no JWT) receives Stripe events:

1. Verify signature.
2. On `checkout.session.completed`:
   - Insert `payments` row, mark quote `paid`.
   - Look up auth user by email via admin API.
   - If missing: `admin.createUser({ email, email_confirm: false })`, assign role `customer` in `user_roles`.
   - Either way: call `link_customer_user(email, user_id)` to attach all matching rows.
   - Send a branded "Set your password" email (`generateLink({ type: 'recovery', redirectTo: '/auth/set-password' })`) through the existing app-email pipeline.

New app-email template `customer-welcome.tsx` with the password-setup link and a portal preview.

## 4. Customer portal

New routes (public-shell, not under `/admin`):

- `/auth/set-password` — handles the recovery link, lets the user set a password, then redirects to `/account`.
- `/account` — protected by a new `CustomerRoute` guard (must be signed in; must NOT be admin → if admin, send to `/admin`).
- `/account/orders/:jobId` — order detail.

Portal layout: top bar with logo + sign out, single-column mobile-first content, sticky bottom nav on small screens.

**Dashboard `/account`** (titled "My Clean My Kicks Orders"):
- List of orders (one card per accepted quote / job) with: shoe, service, status badge, payment status, total, "View" link.

**Order detail `/account/orders/:jobId`**:
- Accepted quote summary + total.
- Payment status (Paid / Pending).
- Active job status + pickup/shipping status.
- Progress timeline built from `jobs.status` history + `job_updates` rows where `customer_visible = true`, chronological with timestamps.
- Before photos (from `request-photos` for the linked request).
- After photos (from `job-photos` where `customer_visible = true`).
- Updates feed (admin notes flagged customer-visible).

## 5. Auth / role separation

- `useAuth` already exposes `isAdmin`. Add `isCustomer` (has role `customer` and not admin).
- `ProtectedRoute` (admin) already blocks non-admins → unchanged.
- New `CustomerRoute` redirects admins to `/admin` and unauthenticated users to `/auth?next=/account`.
- `/auth` page: detect `next` query param and route appropriately after login.

## 6. Admin additions (minimal)

- Job detail page: checkbox on each photo "Visible to customer", and a "Post update" composer that writes to `job_updates` with a `customer_visible` toggle.
- That's it — no other admin workflow changes.

## 7. Out of scope

- Customer self-signup (accounts are only created via payment flow).
- Two-way messaging.
- Refund flow (admin can refund directly in Stripe dashboard).

## Files to add / change (technical)

```text
supabase/migrations/<ts>_customer_portal.sql
supabase/functions/create-checkout/index.ts        # creates Stripe session
supabase/functions/stripe-webhook/index.ts         # verifies + provisions account
supabase/functions/_shared/transactional-email-templates/customer-welcome.tsx
src/pages/account/Dashboard.tsx
src/pages/account/OrderDetail.tsx
src/pages/auth/SetPassword.tsx
src/components/account/CustomerRoute.tsx
src/components/account/AccountLayout.tsx
src/pages/QuoteView.tsx                            # add Pay Now button
src/pages/admin/JobDetail.tsx                      # photo visibility + updates composer
src/App.tsx                                        # new routes
src/hooks/useAuth.tsx                              # isCustomer
```

Approve and I'll start with Stripe enablement, then ship the migration, edge functions, and portal in that order.
