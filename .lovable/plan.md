# Adaptability Pipeline Audit + Health Panel

## 1. End-to-end audit (read-only)

Run targeted SQL via `supabase--read_query` to confirm the learning loop is recording:

- **Recent activity counts** (last 7/30 days) across `ai_feedback`, `ai_audit_log`, `ai_change_history`, `ai_suggestions`.
- **Join check**: every `ai_suggestions` row with `status in ('applied','dismissed')` in the last 30 days has a matching `ai_feedback` row with the same `suggestion_id` and matching `action`.
- **Orphans**: feedback rows whose `suggestion_id` no longer resolves, and applied suggestions missing a feedback record.
- **Undo coverage**: `ai_change_history` rows where `undone = true` paired with an `ai_feedback` row with `action = 'undone'`.
- **Error surface**: `ai_suggestions.status = 'failed'` in the last 30 days, plus recent `admin-ai-execute` edge function logs filtered for error lines.

Report findings inline (counts, gaps, sample IDs). No data changes.

## 2. New admin UI: Adaptability Health panel

Add `src/pages/admin/AIHealth.tsx` mounted at `/admin/ai/health`, linked from the AdminLayout AI section.

Three sections, all read-only, all client-side queries against existing tables:

1. **Pipeline status cards** — counts for last 24h / 7d / 30d:
   - Suggestions: pending, applied, dismissed, failed
   - Feedback events: applied, dismissed, undone
   - Audit log entries
   - Change history entries (and how many undone)

2. **Coverage checks** (computed client-side from the same queries):
   - "Applied suggestions with feedback recorded" — ratio + list of any gaps
   - "Dismissed suggestions with feedback recorded" — ratio + gaps
   - "Undo events linked to change history" — ratio + gaps
   - Each row shows green / amber / red badge based on a simple threshold (100% green, ≥90% amber, <90% red).

3. **Recent errors & failed actions**:
   - Latest `ai_suggestions` with `status = 'failed'` (id, kind, title, time).
   - Latest `ai_audit_log` rows where `output` contains an `error` field.
   - "Refresh" button to re-run all queries.

No new tables, no new edge functions, no schema changes. Pure read views over what the pipeline already writes.

## Technical notes

- All queries scoped through Supabase client (admin-only routes already enforce role via `ProtectedRoute`).
- Reuse existing UI primitives (`Card`, `Badge`, `Button`, `Table`).
- Add route in `src/App.tsx` and nav entry in `src/components/admin/AdminLayout.tsx` under the existing AI group.
