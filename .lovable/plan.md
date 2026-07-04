## Problem

Accessory cards on `/shop` (rendered by `src/components/shop/AccessoryCard.tsx`) show only the name and a 2-line truncated description (`line-clamp-2`). Unlike sneakers, accessories have no detail page and no way to expand — so shoppers can't read the full description or see additional photos before adding to cart.

## Fix

Add a "View details" affordance on each accessory card that opens a dialog with the full product info. Presentation-only — no routing, backend, or schema changes.

### Changes to `src/components/shop/AccessoryCard.tsx`

1. Add a **"View details"** text link under the truncated description (small, primary color, with a chevron). Also make the product image clickable to open the same dialog.
2. Add a shadcn `Dialog` that shows:
   - Larger primary photo, plus a thumbnail strip for the remaining `shop_accessory_photos` (sorted by `sort_order`); clicking a thumb swaps the main image.
   - Accessory `name` and `category`.
   - **Full description** (no `line-clamp`), rendered with `whitespace-pre-wrap` so admin-entered line breaks are preserved.
   - Variant picker (same `Select` markup already in the card) with stock hints ("only N left" / "sold out").
   - Price and quantity stepper.
   - "Add to cart" button that reuses the existing `handleAdd` logic and closes the dialog on success.
3. Keep the existing card-level "Add to cart" so quick-add still works without opening the dialog.
4. Sign URLs for the extra photos lazily when the dialog first opens (reuse `signedPhotoUrl` from `@/lib/shop`) so shoppers who never open it don't pay the extra requests.

### Out of scope

- No new accessory detail route.
- No changes to sneaker cards, filters, cart, or backend.
- No changes to `src/components/Shop.tsx` (homepage section) — it doesn't render accessories today.

## Files touched

- `src/components/shop/AccessoryCard.tsx` — add dialog + trigger, lazy-sign extra photos, drop description truncation inside the dialog.
