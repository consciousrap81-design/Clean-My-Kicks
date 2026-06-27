import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() { return createClient(SUPABASE_URL, SERVICE_KEY); }

async function verifyAdmin(req: Request) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const c = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${auth}` } },
  });
  const { data: { user } } = await c.auth.getUser();
  if (!user) return null;
  const { data } = await admin().from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return data ? user : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await verifyAdmin(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { suggestion_id, action } = await req.json();
    const a = admin();
    const { data: sug, error } = await a.from("ai_suggestions").select("*").eq("id", suggestion_id).maybeSingle();
    if (error || !sug) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "dismiss") {
      await a.from("ai_suggestions").update({ status: "dismissed", resolved_at: new Date().toISOString() }).eq("id", suggestion_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Apply
    let result: any = { applied: true };
    const payload = sug.payload ?? {};
    try {
      switch (sug.kind) {
        case "update_product":
          if (payload.product_id && payload.updates) {
            const { error: e } = await a.from("shop_products").update(payload.updates).eq("id", payload.product_id);
            if (e) throw e;
          }
          break;
        case "publish_product":
          if (payload.product_id) {
            const { error: e } = await a.from("shop_products").update({ status: "available" }).eq("id", payload.product_id);
            if (e) throw e;
          }
          break;
        case "rewrite_seo":
        case "marketing_idea":
        case "content_idea":
        case "pricing_idea":
        case "follow_up_request":
        case "restock_alert":
          // Informational; just mark approved
          result.note = "Marked as acknowledged.";
          break;
        case "update_job_status":
          if (payload.job_id && payload.status) {
            const { error: e } = await a.from("jobs").update({ status: payload.status }).eq("id", payload.job_id);
            if (e) throw e;
          }
          break;
        case "price_change":
          if (payload.product_id && typeof payload.price_cents === "number") {
            const { error: e } = await a.from("shop_products").update({ price_cents: payload.price_cents }).eq("id", payload.product_id);
            if (e) throw e;
          }
          break;
        default:
          result.note = "Acknowledged.";
      }
      await a.from("ai_suggestions").update({ status: "applied", resolved_at: new Date().toISOString() }).eq("id", suggestion_id);
      await a.from("ai_audit_log").insert({ actor: user.id, tool: `apply:${sug.kind}`, input: payload, output: result, approved: true });
    } catch (e) {
      result = { error: String(e) };
      await a.from("ai_suggestions").update({ status: "failed" }).eq("id", suggestion_id);
    }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});