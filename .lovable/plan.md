## Bring Accessory editor to parity with the Product editor

Match the accessory editor (`/admin/accessories/:id`) to the product editor (`/admin/products/:id`) so the description polish, drag-and-drop photo uploader, photo reorder, and cover-photo controls all work the same way. Skip only the pieces that are genuinely sneaker-specific.

## What gets added on accessories

- **Polish with Kicks** button next to the Description field — opens the same `PolishDescriptionDialog` used on products (accepts optional product context, so brand/model/size aren't required).
- **Big drag-and-drop photo zone** — same look and behavior as products: click to browse OR drop files anywhere in the drop zone.
- **Auto-compression** — accessory uploads go through the same `prepareProductPhoto` helper (resize to 1920px, convert to JPEG). Currently they upload the raw file at full size.
- **Drag-to-reorder** — grab-and-drop tiles to change photo order, with an optimistic UI and a "Saving order…" indicator, matching products.
- **Cover photo** — a Star toggle on each tile marks that photo as the cover; the shop grid + product-style card use it first. Requires adding an `is_primary boolean` column to `shop_accessory_photos` (default false; auto-set to true on the first uploaded photo so existing accessories still show a cover).
- **Public-page preview block** — same dashed-border preview above the Save button, showing the accessory name and price the way it appears on `/shop`.
- **Make Active button** — one-click equivalent of "Publish Now": when the accessory is saved and `active = false`, a primary button flips it to `active = true` (accessories don't have draft/available/archived — active toggle is their publish switch, so this just surfaces it more prominently).
- **Kept as-is on accessories**: variants + stock (accessory-specific), category dropdown (cleaning kit / laces / etc.), the existing Active switch inside the form.

## What is NOT copied over (intentionally)

- **Sneaker templates** ("Start from template" Jordan/Nike catalog) — has no meaning for accessories.
- **Before/after restoration photos** — Restored Kicks only.
- **Product-specific fields** (brand/model/size/condition/status enum) — accessories don't use them.

## Files touched

- Migration: add `is_primary boolean NOT NULL DEFAULT false` to `public.shop_accessory_photos` and backfill the first-by-`sort_order` photo of every existing accessory as its cover. No RLS changes.
- `src/integrations/supabase/types.ts` will regenerate after the migration.
- `src/pages/admin/AccessoryEdit.tsx`:
  - Replace the current small photo grid + queued-files flow with the product-editor's photo card (big drop zone, drag reorder, cover star, delete). The "upload before save" queueing added earlier will be removed — accessories, like products, will require saving first before uploading photos (this matches the universal behavior you asked for and avoids the buggy pending-upload path).
  - Add the Polish button + `PolishDescriptionDialog` above the Description textarea.
  - Add the public-page preview block and the "Make Active" primary button.
- `src/components/shop/AccessoryCard.tsx` + `src/pages/Shop.tsx`: when picking the display image, prefer `is_primary === true`, then fall back to lowest `sort_order` (so nothing breaks for accessories without a cover set yet).
- No changes to the Polish edge function — `product` is already an optional loose object.

## Technical notes

- Photo card, uploader, drag-reorder handlers, and drop-zone JSX will be lifted from `ProductEdit.tsx` and adapted for `shop_accessory_photos` (swap table name, storage-path prefix stays `accessories/${id}/…`).
- `prepareProductPhoto` is already generic and works for any image; no changes needed.
- `PolishDescriptionDialog` accepts an optional `product` prop — for accessories we'll pass `{ name, price }` (brand/model/size/condition omitted).
- Cover backfill is a one-time UPDATE using a lateral join to pick each accessory's lowest `sort_order` photo.

## Out of scope

- Adding a dedicated public detail page for accessories (they still render inline on `/shop`). "Preview on Shop" is therefore skipped for accessories — clicking the shop link would just open the shop grid.
- Adding a full draft/available/archived enum to accessories. The existing `active` boolean already gates visibility; the new "Make Active" button just makes toggling it a single, obvious action.
