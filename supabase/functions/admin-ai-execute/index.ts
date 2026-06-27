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

type Target = { table: string; id: string; updates: Record<string, unknown> } | null;

function resolveTarget(kind: string, payload: any): Target {
  switch (kind) {
    case "update_product":
      if (payload?.product_id && payload?.updates)
        return { table: "shop_products", id: payload.product_id, updates: payload.updates };
      return null;
    case "publish_product":
      if (payload?.product_id)
        return { table: "shop_products", id: payload.product_id, updates: { status: "available" } };
      return null;
    case "price_change":
      if (payload?.product_id && typeof payload?.price_cents === "number")
        return { table: "shop_products", id: payload.product_id, updates: { price_cents: payload.price_cents } };
      return null;
    case "update_job_status":
      if (payload?.job_id && payload?.status)
        return { table: "jobs", id: payload.job_id, updates: { status: payload.status } };
      return null;
    default:
      return null;
  }
}

async function applyOne(a: ReturnType<typeof admin>, userId: string, sug: any) {
  const payload = sug.payload ?? {};
  const target = resolveTarget(sug.kind, payload);
  let result: any = { applied: true };
  let historyId: string | null = null;

  try {
    if (target) {
      // Snapshot previous state for undo
      const before = await a.from(target.table).select("*").eq("id", target.id).maybeSingle();
      const beforeRow = before.data ?? null;
      const beforeSlice: Record<string, unknown> = {};
      for (const k of Object.keys(target.updates)) {
        beforeSlice[k] = beforeRow ? (beforeRow as any)[k] : null;
      }
      const { error: e } = await a.from(target.table).update(target.updates).eq("id", target.id);
      if (e) throw e;
      const h = await a.from("ai_change_history").insert({
        suggestion_id: sug.id,
        actor: userId,
        kind: sug.kind,
        table_name: target.table,
        record_id: target.id,
        before_state: beforeSlice,
        after_state: target.updates,
      }).select("id").single();
      historyId = h.data?.id ?? null;
    } else {
      result.note = "Acknowledged.";
    }
    await a.from("ai_suggestions").update({ status: "applied", resolved_at: new Date().toISOString() }).eq("id", sug.id);
    await a.from("ai_audit_log").insert({ actor: userId, tool: `apply:${sug.kind}`, input: payload, output: { ...result, history_id: historyId }, approved: true });
    return { ok: true, history_id: historyId };
  } catch (e) {
    await a.from("ai_suggestions").update({ status: "failed" }).eq("id", sug.id);
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await verifyAdmin(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { suggestion_id, suggestion_ids, action, history_id } = body;
    const a = admin();

    // Undo a previously applied change
    if (action === "undo" && history_id) {
      const { data: h } = await a.from("ai_change_history").select("*").eq("id", history_id).maybeSingle();
      if (!h) return new Response(JSON.stringify({ error: "History not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (h.undone) return new Response(JSON.stringify({ error: "Already undone" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { error: e } = await a.from(h.table_name).update(h.before_state ?? {}).eq("id", h.record_id);
      if (e) return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await a.from("ai_change_history").update({ undone: true, undone_at: new Date().toISOString() }).eq("id", history_id);
      if (h.suggestion_id) {
        await a.from("ai_suggestions").update({ status: "pending", resolved_at: null }).eq("id", h.suggestion_id);
      }
      await a.from("ai_audit_log").insert({ actor: user.id, tool: `undo:${h.kind}`, input: { history_id }, output: { reverted: h.before_state }, approved: true });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bulk actions
    const ids: string[] = Array.isArray(suggestion_ids) && suggestion_ids.length
      ? suggestion_ids
      : (suggestion_id ? [suggestion_id] : []);
    if (!ids.length) return new Response(JSON.stringify({ error: "Missing suggestion_id(s)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "dismiss") {
      await a.from("ai_suggestions").update({ status: "dismissed", resolved_at: new Date().toISOString() }).in("id", ids);
      return new Response(JSON.stringify({ ok: true, dismissed: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "apply") {
      const { data: sugs } = await a.from("ai_suggestions").select("*").in("id", ids);
      const results: any[] = [];
      for (const s of sugs ?? []) results.push({ id: s.id, ...(await applyOne(a, user.id, s)) });
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});