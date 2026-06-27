
# Admin AI Assistant

A conversational AI in `/admin` that can read your site, draft changes, run research, and execute approved actions through a small set of safe tools. Inline "AI improve" buttons appear on product/order/job pages and feed the same agent.

## What it can do

**Always allowed (no approval):**
- Read products, orders, jobs, shipments, customers, reviews.
- Web research (competitors, pricing, trends) via Semrush + web search.
- Generate suggestions, drafts, SEO rewrites, image concepts.
- Run a scheduled scan every 4 hours that stores findings + suggestions.

**Requires your approval (one-tap Apply/Reject):**
- Create/update/publish shop products (copy, price, attrs, photos).
- Generate product/marketing images.
- Update SEO meta/JSON-LD on pages.
- Update job/order/shipment status, draft & send customer emails.
- Apply suggested business actions (e.g. add a promo, change a price).

## Interface

- **Chat panel** at `/admin/ai` — full transcript, threaded, persisted in DB. Uses AI Elements (Conversation, Message, Tool, PromptInput).
- **Inline "✨ AI" buttons** on ProductEdit, ShopOrders, Job detail, and admin Shop pages. Each opens a small drawer that pre-fills context ("rewrite this description", "suggest price for this Jordan 4", "draft reply to this customer") and routes through the same agent.
- **Suggestions inbox** at `/admin/ai/suggestions` — review/approve/dismiss findings from the scheduled scan.

## Tools the agent exposes

Each tool is a typed AI SDK `tool()` with `needsApproval` set per your autonomy rules.

| Tool | Approval | Purpose |
|---|---|---|
| `search_products` / `get_product` | no | Read shop catalog |
| `update_product` / `publish_product` | yes | Edit/publish products |
| `generate_product_image` | yes | Create cover/marketing images |
| `rewrite_seo` | yes | Update title/meta/JSON-LD |
| `list_orders` / `list_jobs` / `get_shipment` | no | Read fulfillment |
| `update_job_status` / `send_customer_email` | yes | Customer ops |
| `web_search` / `competitor_scan` | no | Research |
| `propose_promo` / `propose_price_change` | yes | Business actions |

Agent loop uses `stopWhen: stepCountIs(50)` and Lovable AI Gateway with `google/gemini-3-flash-preview`.

## Scheduled research (every 4 hours)

`pg_cron` → `admin-ai-scan` edge function:
1. Pull top competitors (Semrush) for sneaker restoration in Denton/DFW.
2. Check own domain trend, broken meta, low-stock items, stale drafts.
3. Ask the model to summarize findings + concrete suggestions.
4. Insert into `ai_suggestions` (status=`pending`). Notify badge in admin sidebar.

You approve from the Suggestions inbox; approved items become tool calls with the same approval gate.

## Schema (new tables)

- `ai_threads(id, user_id, title, created_at)` — chat threads.
- `ai_messages(id, thread_id, role, parts jsonb, created_at)` — UIMessage parts.
- `ai_suggestions(id, kind, title, summary, payload jsonb, status, created_at)` — scan/agent proposals.
- `ai_audit_log(id, actor, tool, input jsonb, output jsonb, approved, created_at)` — every tool execution.

All admin-only RLS (`has_role(auth.uid(),'admin')`), full GRANTs to authenticated + service_role.

## Edge functions

- `admin-ai-chat` — streaming chat endpoint (`useChat` transport). Validates admin, runs the tool loop, persists messages, writes audit log.
- `admin-ai-scan` — scheduled research job; writes `ai_suggestions`.
- `admin-ai-execute` — runs a previously approved suggestion/tool call as the admin user.

## UI files

- `src/pages/admin/AIAssistant.tsx` — full chat surface (threads sidebar + AI Elements transcript + composer).
- `src/pages/admin/AISuggestions.tsx` — inbox with approve/dismiss.
- `src/components/admin/InlineAIButton.tsx` — reusable "✨ AI" trigger embedded in ProductEdit, ShopOrders, Job pages.
- Sidebar link in admin layout + unread suggestion badge.

## Approval UX

Tool calls render inline in chat with input params collapsed. Destructive tools show **Apply / Reject** buttons; nothing mutates DB until you click Apply. Inline buttons follow the same flow — the drawer shows the proposed change diff before applying.

## Out of scope (for this pass)

- Direct edits to source code/components (the agent can't redeploy your app).
- Refunds (Stripe refund stays manual until you ask for it).
- Autonomous mode — every write is approval-gated as you requested.
