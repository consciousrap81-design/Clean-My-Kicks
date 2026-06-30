
# Make Kicks's "Apply" actually do work — grounded in your real inbox

I pulled your live `ai_suggestions` table. The picture:

| Kind | Pending | Applied | Stuck (failed / silent-ack) |
|---|---|---|---|
| `publish_product` | 9 | 2 | 0 — executor works |
| `pricing_idea` / `price_change` | 7 | 2 | **1 failed silently** — column bug |
| `create_promo` | 0 | 1 | **3 silent-ack** — no executor at all |
| `content_idea` / `marketing_idea` | 7 | 2 | **4 silent-ack** — no destination |

Three real holes. Fix below.

## 1. Fix the pricing column bug (real bug)

`admin-ai-execute` writes `shop_products.price_cents`. That column doesn't exist — the real column is `price` (numeric dollars). Every `pricing_idea` and `price_change` errors out and gets marked `failed` (or silently swallows in some branches).

**Fix in `supabase/functions/admin-ai-execute/index.ts`:** convert `price_cents → price` (divide by 100) and write to `shop_products.price`. Snapshot the old `price` into `ai_change_history` so the existing 30-second Undo toast restores it cleanly.

This unblocks the 7 stuck pricing suggestions immediately on next click.

## 2. Add a real executor for `create_promo` (biggest hole)

Kicks already proposes full promo campaigns (campaign_name, description, discount_percentage, target_audience) but Apply silently acknowledges. Wire it to actually create a `shop_promo_codes` row.

**New executor in `admin-ai-execute`:**
- Auto-generate `code` from campaign name (e.g. "UNT Student Fresh Start Promo" → `UNTFRESH15`). Strip non-alphanum, uppercase, append the discount %.
- `discount_type = 'percent'`, `amount = discount_percentage`.
- `active = true` (your choice — live immediately).
- `expires_at = null`, `max_redemptions = null` (you can tighten in /admin/promo-codes).
- Snapshot insert into `ai_change_history` with `table_name='shop_promo_codes'` so Undo deletes the row.
- Apply toast: ✅ "Promo `UNTFRESH15` is live — 15% off · Edit / Undo".

**Scanner update in `admin-ai-scan`:** validate `discount_percentage` is 1–50, `campaign_name` is non-empty, and the generated code doesn't collide with an existing one (append `-2`, `-3` if it does).

## 3. Make `content_idea` / `marketing_idea` actually do something — reminder + drafted post

Your pick: **both** — Apply creates a reminder *and* a Kicks-drafted social post you can copy from.

**New table `public.ai_drafts`:**
- `id`, `created_at`, `suggestion_id` (fk), `reminder_id` (fk → admin_reminders, nullable), `kind` ('social_post'), `platform` (text — 'instagram'|'tiktok'|'twitter'|'general'), `title`, `body` (markdown), `hashtags` (text[]), `cta` (text), `status` ('draft'|'used'|'archived')
- Standard RLS: admin-only, full GRANTs for `authenticated` + `service_role`.

**New executor for `content_idea` / `marketing_idea`:**
1. Call Lovable AI Gateway (`google/gemini-3-flash-preview`) with the suggestion's title + summary + Clean My Kicks brand context (already in `ai-preferences`) → returns `{title, body, hashtags[], cta, platform}`.
2. Insert into `ai_drafts`.
3. Insert a row into `admin_reminders`: `key='ai_draft_<draft_id>'`, `title='Post: <draft title>'`, `body=<truncated body>`, `due_at = now() + 3 days`.
4. Snapshot both inserts into `ai_change_history` (compound) so Undo deletes them together.
5. Apply toast: ✅ "Drafted Instagram post + reminder for Friday · View draft / Undo".

## 4. UI updates in `src/pages/admin/AISuggestions.tsx`

- Per-kind preview before Apply:
  - `pricing_idea` → "$X → $Y" with delta %
  - `create_promo` → preview the generated code + discount
  - `content_idea` → "Will draft a post + add a reminder"
- After Apply, replace the generic toast with the executor's actual message (already returned).
- Failed badge shows the real error (e.g. "Column `price_cents` not found" — though that'll be gone after fix #1).
- New "Drafts" sub-tab linking to `ai_drafts` filtered by `status='draft'`, with one-click copy buttons for caption + hashtags.

## 5. Backfill — don't make you re-scan

The 7 stuck pricing pendings and 3 silently-acked promo suggestions can be retried. Add a small "Retry stuck suggestions" button at the top of `/admin/ai-suggestions` that:
- Finds suggestions where `status IN ('failed','acknowledged')` AND `kind` now has a working executor AND `resolved_at > now() - 30 days`.
- Resets them to `pending` so you can click Apply with the new code.

## Files touched

- `supabase/functions/admin-ai-execute/index.ts` — fix `price`, add `create_promo`, add `content_idea`/`marketing_idea` executors (LLM-backed), compound undo
- `supabase/functions/admin-ai-scan/index.ts` — validation for `create_promo`, broader marketing/content context
- Migration: `ai_drafts` table + grants + RLS + updated_at trigger
- `src/pages/admin/AISuggestions.tsx` — per-kind previews, real toast messages, "Retry stuck" button, drafts tab
- `src/pages/admin/AIDrafts.tsx` *(new)* — list + copy buttons for `ai_drafts`
- `src/components/admin/AdminLayout.tsx` — sidebar link to Drafts

## What I'm explicitly NOT touching
- Auto-posting to Instagram/TikTok (would need OAuth + Meta Graph API — separate request).
- Site-wide hero/homepage copy editing (no `site_settings` table — separate request).
- The `update_product` / `publish_product` paths — they already work.
