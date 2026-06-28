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

const ADVISORY_KINDS = new Set(["marketing_idea", "content_idea"]);
const ACTIONABLE_KINDS = new Set(["publish_product", "pricing_idea", "restock_alert", "follow_up_request", "update_product", "price_change", "update_job_status"]);

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
    case "pricing_idea":
      if (payload?.product_id && typeof payload?.price_cents === "number")
        return { table: "shop_products", id: payload.product_id, updates: { price_cents: payload.price_cents } };
      return null;
    case "follow_up_request":
      if (payload?.request_id && payload?.status)
        return { table: "booking_requests", id: payload.request_id, updates: { status: payload.status } };
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

  // Advisory suggestions cannot be "applied" — acknowledge instead.
  if (ADVISORY_KINDS.has(sug.kind)) {
    await a.from("ai_suggestions").update({ status: "acknowledged", resolved_at: new Date().toISOString() }).eq("id", sug.id);
    await a.from("ai_audit_log").insert({ actor: userId, tool: `acknowledge:${sug.kind}`, input: payload, output: { note: "Advisory acknowledged" }, approved: true });
    await a.from("ai_feedback").insert({ suggestion_id: sug.id, actor: userId, action: "acknowledged", kind: sug.kind, suggestion_snapshot: { title: sug.title, summary: sug.summary, payload: sug.payload } });
    return { ok: true, advisory: true, message: "Advisory acknowledged — nothing to apply" };
  }

  // Restock is a numeric increment, not a row-level overwrite — handle specially.
  if (sug.kind === "restock_alert") {
    const variantId = payload?.variant_id;
    const addStock = Number(payload?.add_stock);
    if (!variantId || !Number.isFinite(addStock) || addStock <= 0) {
      const err = `Missing variant_id or add_stock on suggestion ${sug.id}`;
      await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: err } }).eq("id", sug.id);
      return { ok: false, error: err };
    }
    const before = await a.from("shop_accessory_variants").select("id,stock,sku").eq("id", variantId).maybeSingle();
    if (!before.data) {
      const err = `Variant ${variantId} not found`;
      await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: err } }).eq("id", sug.id);
      return { ok: false, error: err };
    }
    const newStock = (before.data.stock ?? 0) + addStock;
    const { error: e } = await a.from("shop_accessory_variants").update({ stock: newStock }).eq("id", variantId);
    if (e) {
      await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: String(e.message ?? e) } }).eq("id", sug.id);
      return { ok: false, error: String(e.message ?? e) };
    }
    const h = await a.from("ai_change_history").insert({
      suggestion_id: sug.id, actor: userId, kind: sug.kind,
      table_name: "shop_accessory_variants", record_id: variantId,
      before_state: { stock: before.data.stock }, after_state: { stock: newStock },
    }).select("id").single();
    await a.from("ai_suggestions").update({ status: "applied", resolved_at: new Date().toISOString() }).eq("id", sug.id);
    await a.from("ai_audit_log").insert({ actor: userId, tool: `apply:${sug.kind}`, input: payload, output: { history_id: h.data?.id, new_stock: newStock }, approved: true });
    await a.from("ai_feedback").insert({ suggestion_id: sug.id, actor: userId, action: "applied", kind: sug.kind, suggestion_snapshot: { title: sug.title, summary: sug.summary, payload: sug.payload } });
    return { ok: true, history_id: h.data?.id, message: `Restocked ${before.data.sku ?? "variant"} by ${addStock} (now ${newStock})` };
  }

  const target = resolveTarget(sug.kind, payload);
  let historyId: string | null = null;

  try {
    if (!target) {
      // Actionable kind with missing IDs → fail loudly instead of silent no-op.
      if (ACTIONABLE_KINDS.has(sug.kind)) {
        const err = `Suggestion of kind "${sug.kind}" is missing required target ids`;
        await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: err } }).eq("id", sug.id);
        return { ok: false, error: err };
      }
      // Unknown kind — treat as advisory acknowledgement.
      await a.from("ai_suggestions").update({ status: "acknowledged", resolved_at: new Date().toISOString() }).eq("id", sug.id);
      return { ok: true, advisory: true, message: "Acknowledged (no executor for this suggestion kind)" };
    }
    {
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
    }
    await a.from("ai_suggestions").update({ status: "applied", resolved_at: new Date().toISOString() }).eq("id", sug.id);
    await a.from("ai_audit_log").insert({ actor: userId, tool: `apply:${sug.kind}`, input: payload, output: { applied: true, history_id: historyId, target }, approved: true });
      await a.from("ai_feedback").insert({ suggestion_id: sug.id, actor: userId, action: "applied", kind: sug.kind, suggestion_snapshot: { title: sug.title, summary: sug.summary, payload: sug.payload } });
    return { ok: true, history_id: historyId, message: `Updated ${target.table}` };
  } catch (e) {
    await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: String((e as any)?.message ?? e) } }).eq("id", sug.id);
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
      await a.from("ai_feedback").insert({ suggestion_id: h.suggestion_id, actor: user.id, action: "undone", kind: h.kind, reason: body.reason ?? null, suggestion_snapshot: { before: h.before_state, after: h.after_state } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Bulk actions
    const ids: string[] = Array.isArray(suggestion_ids) && suggestion_ids.length
      ? suggestion_ids
      : (suggestion_id ? [suggestion_id] : []);
    if (!ids.length) return new Response(JSON.stringify({ error: "Missing suggestion_id(s)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "dismiss") {
      const { data: dsugs } = await a.from("ai_suggestions").select("id,kind,title,summary,payload").in("id", ids);
      await a.from("ai_suggestions").update({ status: "dismissed", resolved_at: new Date().toISOString() }).in("id", ids);
      if (dsugs?.length) {
        await a.from("ai_feedback").insert(dsugs.map((d: any) => ({
          suggestion_id: d.id, actor: user.id, action: "dismissed", kind: d.kind,
          reason: body.reason ?? null,
          suggestion_snapshot: { title: d.title, summary: d.summary, payload: d.payload },
        })));
      }
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