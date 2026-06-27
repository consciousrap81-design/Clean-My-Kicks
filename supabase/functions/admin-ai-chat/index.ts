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
  return {
    search_products: tool({
      description: "Search shop products by name/brand/model. Returns up to 20 results.",
      inputSchema: z.object({ q: z.string().optional(), status: z.enum(["draft", "available", "sold"]).optional() }),
      execute: async ({ q, status }) => {
        let query = a.from("shop_products").select("id,name,brand,model,price_cents,status,size,created_at").limit(20).order("created_at", { ascending: false });
        if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);
        if (status) query = query.eq("status", status);
        const { data, error } = await query;
        if (error) return { error: error.message };
        return { products: data };
      },
    }),
    get_product: tool({
      description: "Get full details for a single product by id.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const { data, error } = await a.from("shop_products").select("*").eq("id", id).maybeSingle();
        if (error) return { error: error.message };
        return { product: data };
      },
    }),
    list_orders: tool({
      description: "List recent shop orders.",
      inputSchema: z.object({ limit: z.number().min(1).max(50).default(20) }),
      execute: async ({ limit }) => {
        const { data, error } = await a.from("shop_orders").select("id,status,total_cents,customer_email,created_at,shipping_method,expected_delivery").order("created_at", { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { orders: data };
      },
    }),
    list_jobs: tool({
      description: "List recent restoration jobs.",
      inputSchema: z.object({ limit: z.number().min(1).max(50).default(20), status: z.string().optional() }),
      execute: async ({ limit, status }) => {
        let q = a.from("jobs").select("id,status,created_at,customer_id,notes").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { jobs: data };
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
  try {
    const user = await verifyAdmin(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { messages, threadId } = body as { messages: UIMessage[]; threadId?: string };

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

${prefs}`,
      messages: convertToModelMessages(messages),
      tools: buildTools(user.id),
      stopWhen: stepCountIs(50),
      onFinish: async ({ response }) => {
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
          console.error("persist error", e);
        }
      },
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});