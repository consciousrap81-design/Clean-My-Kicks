# Fix AI suggestion "Apply" doing nothing

## The actual bug

Kicks's apply button is wired up correctly — the problem is the suggestions themselves don't carry the IDs needed to act on. Two compounding issues:

1. **`admin-ai-scan` never includes target IDs in the payload.** It asks the model for ideas like "publish this draft" or "restock this variant" but only saves the text — no `product_id`, `variant_id`, `request_id`, or `price_cents`. So when you click Apply, the executor has nothing to update.
2. **`admin-ai-execute` silently no-ops for unknown shapes.** When the payload has no resolvable target, it just marks the suggestion `applied` with a hidden `note: "Acknowledged."` and the toast still says "Applied" — looks successful, changes nothing. Most of the kinds the scanner produces (`marketing_idea`, `content_idea`, `pricing_idea`, `restock_alert`, `follow_up_request`) have no executor at all.

That's why you see "Applied" but nothing happens on the site.

## Fix

### 1. Scanner produces actionable payloads
Update `supabase/functions/admin-ai-scan/index.ts`:
- Pass the actual row IDs into the model prompt (draft product IDs, low-stock variant IDs, stale request IDs).
- Tighten the system prompt so each suggestion must return the matching ID field for its kind:
  - `publish_product` → `product_id`
  - `pricing_idea` → `product_id` + `price_cents`
  - `restock_alert` → `variant_id` + `add_stock`
  - `follow_up_request` → `request_id` + target `status`
  - `marketing_idea` / `content_idea` → no ID (advisory)
- Reject suggestions whose required IDs don't match a real row before insert.

### 2. Executor handles every kind
Update `supabase/functions/admin-ai-execute/index.ts`:
- Expand `resolveTarget` to cover `pricing_idea`, `restock_alert` (increments `shop_accessory_variants.stock`), `follow_up_request` (updates `booking_requests.status`).
- For advisory kinds (`marketing_idea`, `content_idea`), do **not** pretend to apply. Return a clear "Advisory — nothing to apply" response and keep the suggestion in a new `acknowledged` state instead of `applied`.
- When `resolveTarget` returns null for a kind that *should* be actionable (missing IDs), mark `status: 'failed'` with a structured error so it surfaces instead of silently succeeding.

### 3. UI surfaces what actually happened
Update `src/pages/admin/AISuggestions.tsx`:
- Show a small badge on each pending card: **Actionable** vs **Advisory** based on `kind` + presence of target IDs.
- Replace the generic "Applied" toast with the result returned by the function ("Published product X", "Restocked variant Y by 5", "Advisory acknowledged", or the failure reason).
- Render a red error chip on failed suggestions with the executor's error message so you can see why something didn't apply.

### 4. Backfill safety
The pending suggestions already in your inbox were generated under the old scanner, so they have no IDs. Add a one-time "Re-scan" prompt at the top of the page when any pending suggestion is missing an actionable target, so you can clear the stale batch and let Kicks regenerate them with IDs.

## Files touched
- `supabase/functions/admin-ai-scan/index.ts`
- `supabase/functions/admin-ai-execute/index.ts`
- `src/pages/admin/AISuggestions.tsx`

No schema changes required.
