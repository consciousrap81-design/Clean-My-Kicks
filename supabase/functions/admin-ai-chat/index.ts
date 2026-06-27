import { createClient } from "npm:@supabase/supabase-js@2";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai@7";
import { z } from "npm:zod@4";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { loadAiPreferenceBlock } from "../_shared/ai-preferences.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

async function verifyAdmin(req: Request) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${auth}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const { data: roles } = await admin().from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return roles ? user : null;
}

function buildTools(actorId: string) {
  const a = admin();
  // Known columns per table (kept in sync with migrations). Used to detect
  // schema drift and surface a clear admin warning when a query fails.
  const KNOWN_COLUMNS: Record<string, string[]> = {
    shop_products: ["id","name","brand","model","size","condition","description","price","status","view_count","reserved_until","reserved_session_id","sold_at","sold_order_id","created_at","updated_at"],
    shop_orders: ["id","product_id","product_snapshot","user_id","customer_email","customer_name","shipping_address","amount","currency","status","stripe_session_id","stripe_payment_intent","tracking_number","tracking_carrier","paid_at","shipped_at","created_at","updated_at","review_request_sent_at","discount_cents","promo_code","shipping_method"],
    jobs: ["id","customer_id","service_id","shoe_brand","shoe_model","condition_notes","quoted_price","payment_status","status","intake_date","due_date","completion_date","admin_notes","lead_source_id","created_at","updated_at","user_id"],
  };
  function schemaError(table: string, message: string) {
    // Parse `column <table>.<col> does not exist` from PostgREST/Postgres
    const m = message.match(/column\s+(?:"?([\w.]+)"?\.)?"?([\w]+)"?\s+does not exist/i);
    const missing = m?.[2];
    return {
      error: "schema_mismatch",
      table,
      missing_column: missing ?? null,
      detail: message,
      expected_columns: KNOWN_COLUMNS[table] ?? [],
      admin_warning: missing
        ? `Schema drift detected on ${table}: column "${missing}" was requested but does not exist. Expected one of: ${(KNOWN_COLUMNS[table] ?? []).join(", ")}.`
        : `Schema error on ${table}: ${message}`,
    };
  }
  return {
    search_products: tool({
      description: "Search shop products by name/brand/model. Returns up to 20 results.",
      inputSchema: z.object({ q: z.string().optional(), status: z.enum(["draft", "available", "sold"]).optional() }),
      execute: async ({ q, status }) => {
        let query = a.from("shop_products").select("id,name,brand,model,price,status,size,condition,view_count,created_at").limit(20).order("created_at", { ascending: false });
        if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);
        if (status) query = query.eq("status", status);
        const { data, error } = await query;
        if (error) return schemaError("shop_products", error.message);
        return {
          kind: "products",
          count: data?.length ?? 0,
          products: (data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            model: p.model,
            size: p.size,
            condition: p.condition,
            status: p.status,
            price: p.price != null ? Number(p.price) : null,
            price_formatted: p.price != null ? `$${Number(p.price).toFixed(2)}` : null,
            views: p.view_count ?? 0,
            created_at: p.created_at,
          })),
        };
      },
    }),
    get_product: tool({
      description: "Get full details for a single product by id.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const { data, error } = await a.from("shop_products").select("*").eq("id", id).maybeSingle();
        if (error) return schemaError("shop_products", error.message);
        return { kind: "product", product: data };
      },
    }),
    list_orders: tool({
      description: "List recent shop orders.",
      inputSchema: z.object({ limit: z.number().min(1).max(50).default(20) }),
      execute: async ({ limit }) => {
        const { data, error } = await a.from("shop_orders").select("id,status,amount,currency,customer_email,customer_name,created_at,shipping_method,tracking_number,tracking_carrier,promo_code,discount_cents").order("created_at", { ascending: false }).limit(limit);
        if (error) return schemaError("shop_orders", error.message);
        return {
          kind: "orders",
          count: data?.length ?? 0,
          orders: (data ?? []).map((o: any) => ({
            id: o.id,
            status: o.status,
            customer: o.customer_name || o.customer_email,
            customer_email: o.customer_email,
            amount: o.amount != null ? Number(o.amount) : null,
            amount_formatted: o.amount != null ? `$${Number(o.amount).toFixed(2)} ${String(o.currency || "usd").toUpperCase()}` : null,
            discount_cents: o.discount_cents ?? 0,
            promo_code: o.promo_code,
            shipping_method: o.shipping_method,
            tracking: o.tracking_number ? `${o.tracking_carrier ?? ""} ${o.tracking_number}`.trim() : null,
            created_at: o.created_at,
          })),
        };
      },
    }),
    list_jobs: tool({
      description: "List recent restoration jobs.",
      inputSchema: z.object({ limit: z.number().min(1).max(50).default(20), status: z.string().optional() }),
      execute: async ({ limit, status }) => {
        let q = a.from("jobs").select("id,status,payment_status,shoe_brand,shoe_model,quoted_price,intake_date,due_date,completion_date,admin_notes,condition_notes,customer_id,created_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return schemaError("jobs", error.message);
        return {
          kind: "jobs",
          count: data?.length ?? 0,
          jobs: (data ?? []).map((j: any) => ({
            id: j.id,
            status: j.status,
            payment_status: j.payment_status,
            shoe: [j.shoe_brand, j.shoe_model].filter(Boolean).join(" ") || null,
            quoted_price: j.quoted_price != null ? Number(j.quoted_price) : null,
            quoted_price_formatted: j.quoted_price != null ? `$${Number(j.quoted_price).toFixed(2)}` : null,
            intake_date: j.intake_date,
            due_date: j.due_date,
            completion_date: j.completion_date,
            condition_notes: j.condition_notes,
            admin_notes: j.admin_notes,
            customer_id: j.customer_id,
            created_at: j.created_at,
          })),
        };
      },
    }),
    propose_action: tool({
      description: "Propose a write action (update product, send email, change price, publish, etc) for the admin to approve. The action is stored in the suggestions inbox and NOT executed until approved.",
      inputSchema: z.object({
        kind: z.enum(["update_product", "publish_product", "rewrite_seo", "update_job_status", "send_customer_email", "create_promo", "price_change"]),
        title: z.string(),
        summary: z.string(),
        payload: z.record(z.string(), z.any()),
      }),
      execute: async ({ kind, title, summary, payload }) => {
        const { data, error } = await a.from("ai_suggestions").insert({ kind, title, summary, payload, status: "pending" }).select("id").single();
        if (error) return { error: error.message };
        await a.from("ai_audit_log").insert({ actor: actorId, tool: "propose_action", input: { kind, title, payload }, output: { suggestion_id: data.id }, approved: true });
        return { suggestion_id: data.id, status: "pending_approval", message: "Saved to suggestions inbox. Open /admin/ai/suggestions to approve." };
      },
    }),
    web_research: tool({
      description: "Note a research finding (competitor, pricing trend, industry insight) for the admin. Use during reasoning to record useful context.",
      inputSchema: z.object({ topic: z.string(), findings: z.string() }),
      execute: async ({ topic, findings }) => ({ topic, findings, recorded: true }),
    }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const reqId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();
  const log = (label: string, data?: unknown) => {
    try {
      console.log(`[admin-ai-chat ${reqId}] ${label}`, data !== undefined ? JSON.stringify(data) : "");
    } catch {
      console.log(`[admin-ai-chat ${reqId}] ${label} <unserializable>`);
    }
  };
  log("incoming", { method: req.method, url: req.url, ua: req.headers.get("user-agent") });
  try {
    const user = await verifyAdmin(req);
    if (!user) {
      log("unauthorized");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log("admin verified", { user_id: user.id });

    const rawBodyText = await req.text();
    log("raw body", { length: rawBodyText.length, preview: rawBodyText.slice(0, 4000) });
    let body: any;
    try {
      body = JSON.parse(rawBodyText);
    } catch (parseErr) {
      log("JSON parse error", { error: String(parseErr) });
      return new Response(JSON.stringify({ error: "Invalid JSON body", detail: String(parseErr) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { messages: rawMessages, threadId } = body as { messages: UIMessage[]; threadId?: string };
    log("parsed body", {
      threadId,
      bodyKeys: Object.keys(body ?? {}),
      rawMessagesType: Array.isArray(rawMessages) ? "array" : typeof rawMessages,
      rawMessagesLen: Array.isArray(rawMessages) ? rawMessages.length : undefined,
    });
    const messages: UIMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
    if (!Array.isArray(rawMessages)) {
      console.warn("admin-ai-chat: messages was not an array", { keys: Object.keys(body ?? {}), type: typeof rawMessages });
    }
    if (messages.length === 0) {
      log("empty messages, rejecting", { rawMessages });
      return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log("messages summary", messages.map((m: any, i) => ({
      i,
      role: m?.role,
      hasParts: Array.isArray(m?.parts),
      partsLen: Array.isArray(m?.parts) ? m.parts.length : undefined,
      partTypes: Array.isArray(m?.parts) ? m.parts.map((p: any) => p?.type) : undefined,
      hasContent: m?.content !== undefined,
      contentType: typeof m?.content,
    })));
    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(messages);
      log("convertToModelMessages ok", { count: modelMessages.length });
    } catch (convErr) {
      log("convertToModelMessages FAILED", { error: String(convErr), stack: (convErr as Error)?.stack, messages });
      return new Response(JSON.stringify({ error: "Failed to convert messages", detail: String(convErr) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const gateway = createLovableAiGatewayProvider(LOVABLE_KEY);
    const model = gateway("google/gemini-3-flash-preview");
    const prefs = await loadAiPreferenceBlock();

    const result = streamText({
      model,
      system: `You are "Kicks", the Clean My Kicks Admin AI assistant. You help Clifford manage a sneaker restoration business and shop in Denton, TX.
You answer to the name "Kicks" and the wake phrase "Hey Kicks". Refer to yourself as Kicks.
Responses may be spoken out loud via browser TTS, so keep replies conversational and free of long code blocks unless explicitly asked. Skip heavy markdown formatting for short voice answers.
You can read products/orders/jobs freely, and propose any write actions via the propose_action tool — the admin will approve them from the suggestions inbox.
NEVER claim a write was performed; only that it was proposed for approval.
Be concise and concrete. Use light markdown for longer answers. When suggesting copy or prices, ground them in real data you've read.
You can also discuss your own research findings and patterns you've noticed about the shop, customers, products, and competitors — be a curious collaborator, not just a tool runner.

When tools return product/order/job data, ALWAYS include a short structured summary in your reply, formatted as a compact markdown table or bullet list with the IDs (shortened to first 8 chars), status, and price/amount fields from the tool output — do not invent or omit those fields. Keep the surrounding narrative brief.

If a tool returns { "error": "schema_mismatch" }, STOP and tell the admin clearly: name the table, the missing column, and the list of expected columns from the tool output. Suggest that a recent migration may have renamed or dropped that column. Do NOT retry the same tool with the same shape.

${prefs}`,
      messages: modelMessages,
      tools: buildTools(user.id),
      stopWhen: stepCountIs(50),
      onFinish: async ({ response }) => {
        log("onFinish", { ms: Date.now() - t0, responseMsgs: response.messages.length });
        if (!threadId) return;
        try {
          const a = admin();
          // Save the last user message + assistant response
          const lastUser = messages[messages.length - 1];
          if (lastUser?.role === "user") {
            await a.from("ai_messages").insert({ thread_id: threadId, role: "user", parts: lastUser.parts ?? [] });
          }
          for (const m of response.messages) {
            await a.from("ai_messages").insert({ thread_id: threadId, role: m.role, parts: m.content as any });
          }
          await a.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
        } catch (e) {
          log("persist error", { error: String(e), stack: (e as Error)?.stack });
        }
      },
    });

    log("streaming response start", { ms: Date.now() - t0 });
    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (e) {
    log("FATAL handler error", { error: String(e), stack: (e as Error)?.stack, ms: Date.now() - t0 });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});