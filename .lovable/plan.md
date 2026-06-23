# Clean My Kicks — Admin Dashboard Plan

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud, then create migrations:

**Enums**
- `app_role`: `admin`, `user`
- `job_status`: `new_request`, `awaiting_shoes`, `received`, `in_progress`, `ready_for_payment`, `completed`, `shipped`, `picked_up`, `cancelled`
- `payment_status`: `unpaid`, `partial`, `paid`, `refunded`

**Tables (all in `public`, with GRANTs + RLS)**
- `user_roles` (user_id, role) — separate from profiles; `has_role()` security-definer function
- `lead_sources` (id, name, active)
- `services` (id, name, description, base_price, active)
- `customers` (id, name, phone, email, notes, lead_source_id, created_at)
- `jobs` (id, customer_id, service_id, shoe_brand, shoe_model, condition_notes, quoted_price, payment_status, status, intake_date, due_date, completion_date, admin_notes, lead_source_id, created_at, updated_at)
- `payments` (id, job_id, amount, method, paid_at, notes)
- `job_photos` (id, job_id, url, kind: 'before'|'after', uploaded_at)

**Storage**: `job-photos` bucket (public read) for before/after uploads.

**RLS**: All admin tables — only `has_role(auth.uid(),'admin')` can select/insert/update/delete. `user_roles` readable by authenticated.

Seed: a few default services and lead sources.

## 2. Auth

- Email/password + Google sign-in via Lovable Cloud.
- `/auth` page (login + signup).
- `ProtectedRoute` wrapper checks session + admin role; non-admins redirected to `/` with toast.
- First user that signs up: instructions to manually assign `admin` role via SQL (documented in chat). No self-elevation.

## 3. Routes

- `/auth` — login/signup
- `/admin` — dashboard overview (metrics)
- `/admin/jobs` — jobs list with filters (status, payment, search)
- `/admin/jobs/new` — create job (+ inline customer create)
- `/admin/jobs/:id` — job detail (edit fields, status, payments, before/after photo uploads, notes)
- `/admin/customers` — customer list
- `/admin/services` — manage services
- `/admin/settings` — lead sources

All under an `AdminLayout` with sidebar (shadcn sidebar) — logo, nav, sign-out, mobile-collapsible.

## 4. Dashboard Metrics

Computed client-side from queries:
- Total jobs, pending (not completed/picked_up/shipped/cancelled), completed (completed/shipped/picked_up)
- Total revenue (sum of payments)
- Unpaid balance (sum of quoted_price where payment_status in unpaid/partial, minus payments)
- Avg turnaround = avg(completion_date - intake_date) for completed
- Top services (count grouped)
- Lead sources (count grouped)

Cards + small bar chart (recharts) for status distribution and lead sources.

## 5. UI / Branding

- Reuse existing Clean My Kicks tokens from `src/index.css` (no hardcoded colors).
- Cards, badges colored per status, responsive grid (1 col mobile, 2-3 desktop), sticky topbar with `SidebarTrigger`.
- Status badge component with semantic color mapping via design tokens.

## 6. Technical notes

- Use `@supabase/supabase-js` client already wired by Cloud.
- `onAuthStateChange` listener + `getUser()` validation in `useAuth` hook.
- React Query for data fetching/caching.
- Photo uploads via Storage SDK to `job-photos/{job_id}/{before|after}/{uuid}`.
- Zod validation on job/customer forms.

## 7. Out of scope (for this iteration)

- Customer-facing booking form writing to `jobs` (can be added later).
- Email notifications.
- Multi-admin invite flow UI (manual SQL for now).

Approve and I'll build it.