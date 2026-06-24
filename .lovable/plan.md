# Cart & Checkout Enhancements

Five additions, building on the existing combined-cart system.

## 1. Promo codes (admin-managed)

**New table** `shop_promo_codes`:
- `code` (unique, uppercased), `discount_type` ('percent' | 'fixed'), `amount` (int — % or cents), `min_subtotal_cents`, `max_redemptions`, `redemption_count`, `expires_at`, `active`, `applies_to` ('all' | 'accessories' | 'sneakers')

**New table** `shop_promo_redemptions`:
- `promo_id`, `cart_id`, `order_id`, redeemed_at — used to enforce one-per-cart and increment counts safely from the webhook.

**Admin page** `/admin/promo-codes`: list + create/edit form (toggle active, set expiry, limits).

**Cart drawer**: promo input + Apply button → calls new edge function `validate-promo-code` (rate-limited, returns discount preview). Applied code stored on `shop_carts.applied_promo_code` (new nullable column). Displays discount line in summary.

**Checkout**: `create-shop-checkout` re-validates the code server-side, creates a Stripe one-shot coupon (`stripe.coupons.create` with `duration: "once"`), attaches via `discounts: [{coupon}]` on the session. Webhook records redemption + increments `redemption_count` on payment success.

## 2. Detailed shipping breakdown in cart summary

In `CartDrawer.tsx` summary section, before checkout button:
- Rate name + price (Standard / Express)
- Estimated delivery window (already computed) shown as date range
- "Free shipping over $100" hint with remaining-to-go progress when under threshold; "✓ Free shipping unlocked" when over
- Shipping method picker (radio): Standard / Express — selection passed to `create-shop-checkout` as `shippingMethod` so Stripe session pre-selects it (still editable on Stripe page)

## 3. Address collection

Per user choice: **Stripe Checkout collects + validates the address.** Already configured. We only need to ensure `shipping_address_collection` is enabled on the session with allowed countries (US only for now — confirm in implementation). No new on-site form.

## 4. Order status page (replaces /shop/order/success)

Rebuild `src/pages/ShopOrderSuccess.tsx`:
- Reads `?session_id=...`, calls new edge function `get-shop-order-status` which looks up the order by Stripe session id and returns: order #, items (with SKU + variant), shipping method, ETA window, shipping address, subtotal/discount/shipping/total, payment status, current order status.
- Polls every 3s until status moves from `pending` → `paid` (webhook race), then stops.
- Shows clear states: "Processing payment…", "Payment confirmed — order #1234", with expected delivery date prominent.
- Links to `/account/shop-orders/:id` for signed-in users.

## 5. Real-time stock warnings + checkout lockout

In `src/lib/cart.ts` (`refresh()` already pulls `stock_qty`):
- Subscribe to `shop_accessory_variants` realtime channel on mount (postgres_changes UPDATE filter by variant ids in cart) → triggers `refresh()`.
- `EnrichedCartItem` already exposes `available` + `unavailable_reason` — make sure cart drawer shows red warning badge when `qty > max_qty` or `max_qty === 0`.

In `CartDrawer.tsx`:
- Compute `hasBlockingIssue = items.some(i => !i.available)`.
- Disable Checkout button when true; show inline message "Resolve item issues to continue."
- Out-of-stock items get destructive border + "Remove" CTA prominent; over-qty items get a "Set to max (N)" quick action.

`create-shop-checkout` already re-validates stock and returns errors — keep as final safeguard.

## Technical notes

- Promo coupon math: percent → `percent_off`; fixed → `amount_off` + `currency: "usd"`. Min subtotal enforced server-side before creating the coupon.
- Stock realtime requires `shop_accessory_variants` in the supabase realtime publication (migration adds it).
- No schema change to `shop_orders` needed for promo — store `discount_cents` + `promo_code` (add two columns).

## Out of scope

- Stacking multiple promos
- BOGO / per-product discounts
- Address autocomplete on our site (deferred — Stripe handles it)
- International shipping zones

## Files

**Migrations:** new `shop_promo_codes`, `shop_promo_redemptions`; add `applied_promo_code` to `shop_carts`; add `discount_cents`, `promo_code` to `shop_orders`; enable realtime on `shop_accessory_variants`.

**New:** `supabase/functions/validate-promo-code/index.ts`, `supabase/functions/get-shop-order-status/index.ts`, `src/pages/admin/PromoCodes.tsx`, `src/pages/admin/PromoCodeEdit.tsx`.

**Edited:** `src/lib/cart.ts`, `src/components/shop/CartDrawer.tsx`, `src/pages/ShopOrderSuccess.tsx`, `supabase/functions/create-shop-checkout/index.ts`, `supabase/functions/stripe-webhook/index.ts`, `src/App.tsx`, `src/components/admin/AdminLayout.tsx`.
