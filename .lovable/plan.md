# Why she couldn't do it

Your admin AI ("Kicks") only knows about the **restored kicks / dead stock** catalog (`shop_products`). She has zero tools pointed at the **accessories** catalog (`shop_accessories` + `shop_accessory_variants`), and SKUs on accessories actually live on the **variant** rows (each color/size/style of an accessory has its own SKU). That's why she said she couldn't find a category — from her side of the fence, accessories literally don't exist as a thing she can search or edit.

The one exception already wired up is `restock_accessory_variant` (used to bump stock), but there's nothing for searching accessories, viewing variants, or changing a SKU / price / active flag.

# What to add

Bring accessories to full parity with products in the AI's toolbelt.

## 1. Read tools (direct-execute, no approval)

In `admin-ai-chat`:
- `search_accessories` — search `shop_accessories` by name/category, returns id, name, category, base price, active.
- `get_accessory` — full accessory record + all its variants (id, name, SKU, stock, price override, active, sort_order) + photos.
- `list_accessory_variants` — variants for a given accessory, for quick SKU/stock audits.

## 2. Write actions (propose_action → admin approves in inbox)

New proposal kinds routed through `admin-ai-execute`:
- `update_accessory` → updates `shop_accessories` (name, description, category, base_price_cents, active).
- `publish_accessory` → sets `shop_accessories.active = true`.
- `update_accessory_variant` → updates a single `shop_accessory_variants` row (SKU, stock_qty, price_cents_override, active, name).
- `bulk_set_accessory_skus` → convenience for "set SKUs on all variants of accessory X" (array of { variant_id, sku }); expands to per-row updates.

`resolveTarget` in `admin-ai-execute/index.ts` gets new cases for each kind, matching the existing `shop_products` pattern. `ACTIONABLE_KINDS` extended with the new kinds so the approval → apply path runs.

## 3. Schema hints + system prompt

- Add `shop_accessories` and `shop_accessory_variants` to the `KNOWN_COLUMNS` map in `admin-ai-chat` so schema-drift errors stay clear.
- Add a paragraph to the Kicks system prompt explaining that the shop has **two catalogs**: (a) `shop_products` = restored kicks + dead stock, SKU-less, one row per shoe; (b) `shop_accessories` = cleaning kits / laces / buckles, where **SKU lives on the variant row**, not the accessory itself. Tell her to use `search_accessories` / `list_accessory_variants` when the admin asks about accessory SKUs, prices, or stock.

## 4. No frontend or DB changes

No new migrations, no UI changes. The accessory tables and SKU column already exist and admin edit screens already show them — this is purely giving the AI the tools + vocabulary to reach them.

# Files touched

- `supabase/functions/admin-ai-chat/index.ts` — new tools + KNOWN_COLUMNS entries + system prompt note.
- `supabase/functions/admin-ai-execute/index.ts` — new cases in `resolveTarget` + `ACTIONABLE_KINDS`.

# After this ships

You'll be able to say things like:
- "Kicks, set the SKU on the white 45in laces to LACE-WHT-45"
- "What's the stock on the premium cleaning kit variants?"
- "Publish the buckle accessory"

…and she'll actually find them and propose the change for your approval, same as she does today for restored kicks.
