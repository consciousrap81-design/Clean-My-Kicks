## Goal
Stop credit/rate-limit failures (HTTP 402 / 429) from permanently burning AI suggestions. Detect them, keep the suggestion retryable, and surface a clear "Out of AI credits" banner with a one-click retry.

## Changes

### 1. `supabase/functions/admin-ai-execute/index.ts`
- Add a `classifyAiError(err)` helper that detects 402 ("Payment Required", credits exhausted) and 429 (rate limited) from the gateway error message/status.
- In the `marketing_idea` / `content_idea` branch (the `draftSocialPost` try/catch), when the error is 402 or 429:
  - Do NOT mark the suggestion `failed`.
  - Leave `status = 'pending'` and write `payload.last_error = { code: 'credits_exhausted' | 'rate_limited', message, at }`.
  - Return `{ ok: false, retryable: true, code, error }`.
- Same treatment in the `create_promo` branch and anywhere else `generateText` is invoked at apply time.
- Extend the `retry_stuck` action to also pick up suggestions where `status='pending'` with a `payload.last_error.code` of `credits_exhausted` / `rate_limited` (clear the `last_error` flag on the row when retried).

### 2. `src/pages/admin/AISuggestions.tsx`
- Compute `creditExhaustedCount` from items whose `payload.last_error?.code === 'credits_exhausted'`.
- Show a new amber banner above the existing "stuck" banner when count > 0:
  - "AI credits exhausted — top up to apply N suggestion(s)."
  - Buttons: "Add credits" (external link to workspace billing settings) + "Retry" (calls existing `retryStuck`).
- On per-card apply, if the returned result has `retryable: true` and `code === 'credits_exhausted'`, show a `toast.error("Out of AI credits — top up and retry.")` instead of the generic failure toast, and keep the card in the pending list (no reload needed since status stayed pending).
- Add a small "Retry" button on cards that carry `payload.last_error`.

### 3. Backfill the 3 currently-failed rows
- Migration / one-off update: for the three current `status='failed'` rows whose `payload.error = 'Payment Required'`, flip them back to `status='pending'` and move the error into `payload.last_error = { code: 'credits_exhausted', message: 'Payment Required' }` so the new UI picks them up.

## Out of scope
- No change to the hero carousel work — that resumes after this fix lands.
- No change to the scanner; only the executor + UI.

## Technical notes
- 402 from Lovable AI Gateway = workspace credits exhausted. User tops up in Settings → Workspace → Usage.
- 429 is transient; same UX path (keep pending, allow retry) but labeled "Rate limited — try again shortly."
