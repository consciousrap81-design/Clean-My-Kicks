# Investigation: missing accessory on homepage

## What I found

- Database is fine. `shop_accessories` still has **"Premium Cleaning Kit"** (active, $5.00, Default variant with stock 10). Nothing was deleted or deactivated.
- The homepage Shop section (`src/components/Shop.tsx`, rendered inside `src/pages/Index.tsx`) only ever queried the `shop_products` table (restored sneakers). It has **no code path that reads `shop_accessories`** — never has, per chat history and the current file.
- Accessories are only rendered on the standalone `/shop` page (`src/pages/Shop.tsx`), which has an "Accessories" section below the sneaker grid using `AccessoryCard`.

So no accessory was removed from the homepage in the recent changes — there was no accessory block on `/` to begin with. What you're remembering is almost certainly the `/shop` page.

## Proposal: add an accessories teaser to the homepage

Mirror the existing "restored kicks" pattern so accessories are also promoted on `/`.

### Scope (frontend only)
- Edit `src/components/Shop.tsx`:
  - Add a second query alongside the existing `shop_products` + `sold` loads:
    ```ts
    supabase
      .from("shop_accessories")
      .select("id, name, slug, description, category, base_price_cents, shop_accessory_variants(id, name, stock_qty, active, price_cents_override, sort_order), shop_accessory_photos(storage_path, sort_order)")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(3)
    ```
  - Add realtime subscription on `shop_accessories` + `shop_accessory_variants` (same channel).
  - Below the sneaker grid, render a compact "Accessories" subsection: heading + 2–3 col grid reusing `AccessoryCard` (already handles photo signing, variant picker, quantity, add-to-cart, and the details dialog). Only render when `accessories.length > 0`.
  - Keep the existing "Shop all pairs →" CTA; add nothing else.

### Out of scope
- No changes to `/shop` page, `AccessoryCard`, cart, backend, RLS, storage rules, or `shop_products` logic.

### Files touched
- `src/components/Shop.tsx` (only)

If you'd rather I just confirm the investigation and leave the homepage alone, say the word and I'll skip the edit.
