# Before / After photos for Restored Kicks

Add a second photo track ("before" photos) on Restored Kicks products, uploaded from the admin editor and shown on the public product page as a draggable slider that wipes between the restored (after) and original (before) shots.

## Scope

- Restored Kicks only. New Kicks keep the current single gallery.
- Shop grid and homepage stay unchanged — surprise reveal happens on the product detail page.

## Admin (ProductEdit)

- When category = `restored`, show a second photo section titled **"Before restoration photos"** below the existing Photos card.
  - Same drag-and-drop uploader as the current one.
  - Same reorder + delete controls. No "cover" concept — before photos don't have a primary.
  - Each before photo pairs with the after photo of the same sort_order for the slider; first before ↔ first after, etc. If counts differ, extras are shown as regular thumbnails below the slider.
- When category = `new`, the section is hidden.

## Public product page

- New **BeforeAfterSlider** component: single image stage, draggable vertical handle. Right side = after (restored), left side = before. Handle draggable via mouse/touch, keyboard accessible (arrow keys move handle 5% at a time, aria-label "Compare before and after").
- Placement: replaces the top of the gallery when at least one before photo exists. Under it: a small label "Drag to compare — before / after". Thumbnails strip below still switches between all after photos; when the active after photo has a matching before, the slider is shown, otherwise the plain image.
- Fullscreen dialog: adds a "Show before" toggle instead of the slider (simpler on mobile).

## Data model

New table `shop_product_before_photos` (mirrors `shop_product_photos` minus `is_primary`):
- `product_id` (fk → shop_products, cascade delete)
- `storage_path`, `sort_order`
- RLS: public SELECT for photos of `available`/`sold` products; admin full access. Grants: `anon`/`authenticated` SELECT, `service_role` ALL, admin write via existing `has_role('admin')` pattern.
- Storage: reuse existing `shop-products` bucket, path prefix `${productId}/before/…`.

## Technical details

- Files touched:
  - `supabase/migrations/…` — new table, grants, RLS policies.
  - `src/lib/shop.ts` — add `BeforePhoto` type + fetch helper.
  - `src/pages/admin/ProductEdit.tsx` — second uploader/gallery, gated on `form.category === "restored"`.
  - `src/components/shop/BeforeAfterSlider.tsx` — new component (pointer + touch drag, keyboard nudge, clip-path or width overlay).
  - `src/components/shop/ProductGallery.tsx` — accept optional `beforeSlides`, render slider when the active index has a match.
  - `src/pages/ProductDetail.tsx` — load before photos, pass to gallery.
- Pairing rule: index-based (sort_order aligned). Documented in the admin section so the shop owner knows drag order controls which pair matches.
- No changes to shop grid, homepage, or Shop.tsx.

## Out of scope

- Hover reveal on shop cards.
- AI auto-alignment of before/after crops.
- Side-by-side layout option (can add later if slider isn't enough).
