# Mail-In Order Service

Adds a "Mail in" fulfillment option alongside existing drop-off, powered by Shippo for live carrier rates and prepaid round-trip labels. US-only at launch.

## Customer flow

1. On the booking form, customer picks **Drop off** or **Mail in**. Mail-in path asks for pickup address (used for return label + inbound rate).
2. After submit, customer lands on a **shipping kit page** (`/requests/:token/ship`) showing:
   - Prepaid inbound USPS/UPS label (PDF) generated via Shippo
   - Packing instructions + printable order slip with QR code
   - Tracking timeline: Label created → In transit → Received → Cleaning → Shipped back → Delivered
3. Same `/requests/:token` view gains a "Shipping" section so the customer can re-download labels and watch status.
4. Once we mark the job done, admin clicks "Generate return label" → customer gets email with tracking; return label uses the address captured at booking.

## Admin flow

- `booking_requests` gains `fulfillment_method` ('drop_off' | 'mail_in'), `ship_from_address` (jsonb).
- New `shipments` table: `id`, `request_id`, `direction` ('inbound' | 'outbound'), `carrier`, `service`, `tracking_number`, `tracking_url`, `label_url`, `rate_cents`, `status`, `last_event_at`, timestamps.
- Admin Requests + Jobs detail pages get a **Shipping panel**: shows both shipments, status, tracking link, "Mark received", "Generate return label" (re-quotes Shippo for outbound from shop address → customer address), "Void label" while unused.
- Pricing on the quote auto-includes round-trip shipping cost (inbound rate + estimated outbound rate, both pulled from Shippo at booking time, stored on the request as `shipping_quote_cents`). Customer sees one shipping line item.

## Cost handling

- Inbound rate fetched at booking using customer address → shop address, cheapest USPS Ground Advantage / UPS Ground.
- Outbound rate estimated at the same time (reverse direction) and added to the round-trip total.
- Round-trip cost is rolled into the quote total — customer pays it via existing Stripe checkout. No separate shipping charge.
- If actual outbound rate at ship time exceeds the estimate by >$3, admin sees a warning before purchasing the label (can absorb or contact customer).

## Tracking

- Shippo webhook → new edge function `shippo-webhook` updates `shipments.status` and `last_event_at`, appends to `job_updates`, and fires existing transactional emails (`shop-order-tracking-updated` template — reuse, or add `mail-in-status-changed`).

## International (deferred)

- Reminder task in `.lovable/plan.md` and a recurring admin Settings banner "International mail-in: revisit on <date>" that updates every 2 weeks until dismissed. Implemented as a simple `admin_reminders` table with `key`, `due_at`, `dismissed`. AdminLayout checks for due reminders.

## Technical details

**New migration:**
- `booking_requests`: add `fulfillment_method`, `ship_from_address`, `shipping_quote_cents`
- `shipments` table (RLS: admin-only writes; public read via request public_token through edge function)
- `admin_reminders` table (RLS: admin only)
- Seed one row: `key='international_mail_in'`, `due_at = now() + 14 days`

**New secrets:** `SHIPPO_API_KEY` only. `SHOP_ADDRESS_*` values are stored as non-secret config. Shippo's dashboard does not issue a webhook signing secret, so `shippo-webhook` authenticates events by re-fetching the referenced object (track / transaction) from Shippo using `SHIPPO_API_KEY` and trusting only that re-fetched payload — no HMAC verification.

**New edge functions:**
- `shippo-quote` — called from booking form; returns inbound + estimated outbound rate
- `shippo-purchase-label` — admin-triggered; buys label, persists to `shipments`
- `shippo-webhook` — receives status events, verifies signature
- `shipping-kit-view` — public, looks up by request token, returns label URLs + status

**Edited:**
- `src/components/BookingForm` (or current booking flow): add fulfillment_method radio, address fields when mail-in
- `src/pages/RequestView` (public): shipping kit section
- `src/pages/admin/Requests.tsx` + `JobDetail.tsx`: shipping panel
- `src/components/admin/AdminLayout.tsx`: reminder banner
- `supabase/functions/submit-booking/index.ts`: call `shippo-quote`, store quote + address

**New pages:**
- `src/pages/admin/Reminders.tsx` (simple list to view/dismiss/snooze)

## Out of scope

- International shipping (reminder set instead)
- Insurance upsell
- Customer-supplied labels
- Multi-package shipments

## What I need from you before building

1. Confirm shop **origin address** (street, city, state, ZIP) to use for label generation.
2. You'll need to create a Shippo account and grab your API key + webhook secret — I'll request them via add_secret when we're ready to build.
