
# Accessories + Combined Cart

Adds a second product type (accessories) alongside 1-of-1 sneakers, a real cart drawer, and one Stripe checkout that can mix both.

## What you'll see as the owner

- **Admin → Shop** gets a new "Accessories" tab next to "Sneakers." Add a cleaning kit, set price, stock count, photos, and optional variants (e.g. laces: white/black/red — each with its own stock).
- **Shop page** gets a category toggle: **Sneakers** (1-of-1, Buy Now) and **Accessories** (Add to cart, qty selector).
- **Navbar** gets a cart icon with item count. Opens a slide-out drawer listing everything in the cart with quantities and a Checkout button.

## What customers experience

- Browsing sneakers works exactly as today — Buy Now goes straight to Stripe.
- Browsing accessories: pick a variant (if any), pick a quantity, "Add to cart." Cart icon updates. They keep shopping.
- They can also "Add to cart" a sneaker — this **reserves the pair for 15 minutes** while they shop. A timer shows in the cart drawer. If they don't check out in time, the pair releases.
- Checkout button = one Stripe session with all items (the sneaker + any accessories). One shipping charge, one receipt.
- Out-of-stock accessories show "Sold out" and can't be added. Sneakers already reserved by someone else stay disabled.

## Data model

New tables:

- `shop_accessories` — id, name, slug, description, base_price_cents, category (`cleaning_kit` | `laces` | `buckle` | `other`), active, photos, created_at
- `shop_accessory_variants` — id, accessory_id, name (e.g. "White, 45in"), sku, price_cents (overrides base if set), stock_qty, active
- `shop_carts` — id, session_id (anon) or user_id, created_at, expires_at
- `shop_cart_items` — id, cart_id, item_type (`sneaker` | `accessory`), product_id (sneaker id or variant id), qty, unit_price_cents, reserved_until (sneakers only)

Sneaker reservation reuses the existing `reserved_until` / `reserved_session_id` columns on `shop_products` — adding to cart sets these, removing or expiry clears them.

## Checkout flow

- `create-shop-checkout` edge function gets reworked to accept a `cart_id` instead of a single `product_id`.
- It validates: every sneaker still reserved for this session, every accessory variant has enough stock, prices haven't changed.
- Builds Stripe `line_items` from the cart, one entry per item.
- On success webhook: decrements accessory stock, marks sneaker(s) `sold`, clears cart.
- On expiry/cancel: releases sneaker reservations, leaves accessory stock alone.

## Build order

1. **Migration** — accessory tables, cart tables, GRANTs, RLS (anon can read active accessories; cart scoped to session_id or user_id).
2. **Admin UI** — Accessories tab: list, create/edit form with photos + variants + stock.
3. **Cart store** — `useCart` hook (Zustand or React context) backed by `shop_carts`/`shop_cart_items`. Add/remove/update qty/clear.
4. **Cart drawer** — Sheet component in navbar, item rows with qty steppers, sneaker reservation timer, subtotal, Checkout button.
5. **Shop page** — Category toggle, accessory cards with variant + qty selector + Add to cart, sneaker cards get a secondary "Add to cart" alongside Buy Now.
6. **Checkout edge function** — rewrite to accept cart_id, validate, build multi-line Stripe session.
7. **Webhook handler** — decrement stock on success, release reservations on expire/cancel.

## Out of scope for this pass

- Bundles/discounts ("buy 2 kits, get 10% off") — straightforward to add later on top of cart items.
- Shipping rate tiers by item count/weight — uses your current flat shipping until you ask for tiered.
- Inventory alerts / low-stock email — easy follow-up.
