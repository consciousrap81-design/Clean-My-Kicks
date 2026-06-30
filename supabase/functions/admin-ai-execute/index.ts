import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText } from "npm:ai@7";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function admin() { return createClient(SUPABASE_URL, SERVICE_KEY); }

function classifyAiError(e: unknown): { code: "credits_exhausted" | "rate_limited" | "other"; message: string } {
  const msg = String((e as any)?.message ?? e ?? "");
  const status = Number((e as any)?.status ?? (e as any)?.statusCode ?? 0);
  const lower = msg.toLowerCase();
  if (status === 402 || lower.includes("payment required") || lower.includes("402") || lower.includes("credits") && lower.includes("exhaust")) {
    return { code: "credits_exhausted", message: msg || "Payment Required" };
  }
  if (status === 429 || lower.includes("rate limit") || lower.includes("429") || lower.includes("too many requests")) {
    return { code: "rate_limited", message: msg || "Rate limited" };
  }
  return { code: "other", message: msg };
}

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

// Advisory kinds now ALSO have a real executor (they generate a draft + reminder).
// Keep set empty so the apply path always runs the real executor below.
const ADVISORY_KINDS = new Set<string>([]);
const ACTIONABLE_KINDS = new Set([
  "publish_product", "pricing_idea", "restock_alert", "follow_up_request",
  "update_product", "price_change", "update_job_status",
  "create_promo", "marketing_idea", "content_idea",
]);

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
    case "pricing_idea":
      // FIX: real column is `price` (numeric dollars), not `price_cents`.
      if (payload?.product_id && typeof payload?.price_cents === "number")
        return { table: "shop_products", id: payload.product_id, updates: { price: Math.round(payload.price_cents) / 100 } };
      if (payload?.product_id && typeof payload?.price === "number")
        return { table: "shop_products", id: payload.product_id, updates: { price: payload.price } };
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

function slugCode(name: string, suffix: string | number = ""): string {
  const base = String(name || "PROMO").toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "PROMO";
  return suffix ? `${base}${suffix}` : base;
}

async function uniquePromoCode(a: ReturnType<typeof admin>, seed: string, discount: number): Promise<string> {
  const base = slugCode(seed, discount);
  let code = base;
  for (let i = 2; i < 30; i++) {
    const { data } = await a.from("shop_promo_codes").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
    code = `${base}${i}`;
  }
  return `${base}${Date.now().toString().slice(-4)}`;
}

function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function draftSocialPost(sug: any): Promise<{ title: string; body: string; hashtags: string[]; cta: string; platform: string }> {
  const gateway = createLovableAiGatewayProvider(LOVABLE_KEY);
  const ctx = {
    title: sug.title,
    summary: sug.summary,
    reasoning: sug.payload?.reasoning ?? sug.payload?.raw?.reasoning ?? null,
  };
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: `You are Kicks, the social copywriter for Clean My Kicks — a sneaker restoration shop in Denton, TX (Seven Loaf Clothing brand, faith-aligned, sneakerhead-friendly voice).
Convert the marketing/content idea into ONE ready-to-post social caption.

Return VALID JSON only:
{"platform":"instagram"|"tiktok"|"twitter"|"general","title":"<short internal title, <=60 chars>","body":"<the actual caption, 2-5 short lines, no hashtags inline>","hashtags":["#tag1","#tag2",...up to 8],"cta":"<one-line call to action>"}

Rules: no emojis unless they fit naturally, no profanity, keep it authentic (not corporate). Mention Denton when relevant.`,
    prompt: JSON.stringify(ctx),
  });
  const parsed = extractJson(text);
  if (parsed?.body && parsed?.title) {
    return {
      title: String(parsed.title).slice(0, 200),
      body: String(parsed.body),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 12).map((t: any) => String(t)) : [],
      cta: String(parsed.cta ?? ""),
      platform: ["instagram", "tiktok", "twitter", "general"].includes(parsed.platform) ? parsed.platform : "general",
    };
  }
  // Fallback: minimum viable draft if the model misbehaves
  return {
    title: String(sug.title).slice(0, 200),
    body: String(sug.summary ?? sug.title),
    hashtags: ["#CleanMyKicks", "#DentonTX", "#SneakerRestoration"],
    cta: "DM us to drop off your kicks.",
    platform: "general",
  };
}

async function generateHeroImageDataUrl(promoName: string, discount: number): Promise<string | null> {
  // Use the AI Gateway image endpoint directly (non-streaming) so we can persist a single PNG.
  const prompt = `Editorial hero banner for a sneaker restoration shop promotion.
Promotion: "${promoName}" — ${discount}% off.
Scene: a pair of freshly cleaned premium sneakers (generic silhouette, no brand logos, no trademarks, no text) on a dark moody studio backdrop with warm rim light and subtle red/orange glow, reflective floor, soft haze.
Cinematic, high contrast, photo-real, ultra-detailed, 16:9 composition with strong negative space on the left for overlay text.
Do NOT render any words, letters, numbers, logos, or signage in the image.`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`image gateway ${res.status}: ${txt.slice(0, 300)}`);
    }
    const body = await res.json();
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.error("[hero-image] generation failed:", e);
    return null;
  }
}

async function applyOne(a: ReturnType<typeof admin>, userId: string, sug: any) {
  const payload = sug.payload ?? {};

  // Marketing / content ideas → draft a social post + create a reminder.
  if (sug.kind === "marketing_idea" || sug.kind === "content_idea") {
    try {
      const draft = await draftSocialPost(sug);
      const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const reminder = await a.from("admin_reminders").insert({
        key: `ai_draft_${sug.id}`,
        title: `Post: ${draft.title}`.slice(0, 200),
        body: `${draft.body}\n\n${draft.hashtags.join(" ")}`.slice(0, 2000),
        due_at: dueAt,
      }).select("id").single();
      const draftRow = await a.from("ai_drafts").insert({
        suggestion_id: sug.id,
        reminder_id: reminder.data?.id ?? null,
        kind: "social_post",
        platform: draft.platform,
        title: draft.title,
        body: draft.body,
        hashtags: draft.hashtags,
        cta: draft.cta,
        status: "draft",
      }).select("id").single();
      const h = await a.from("ai_change_history").insert({
        suggestion_id: sug.id, actor: userId, kind: sug.kind,
        table_name: "ai_drafts", record_id: draftRow.data?.id ?? null,
        before_state: null,
        after_state: { draft_id: draftRow.data?.id, reminder_id: reminder.data?.id, platform: draft.platform },
      }).select("id").single();
      await a.from("ai_suggestions").update({ status: "applied", resolved_at: new Date().toISOString() }).eq("id", sug.id);
      await a.from("ai_audit_log").insert({ actor: userId, tool: `apply:${sug.kind}`, input: payload, output: { draft_id: draftRow.data?.id, reminder_id: reminder.data?.id }, approved: true });
      await a.from("ai_feedback").insert({ suggestion_id: sug.id, actor: userId, action: "applied", kind: sug.kind, suggestion_snapshot: { title: sug.title, summary: sug.summary, payload: sug.payload } });
      const dueLabel = new Date(dueAt).toLocaleDateString(undefined, { weekday: "long" });
      return { ok: true, history_id: h.data?.id, draft_id: draftRow.data?.id, message: `Drafted ${draft.platform} post + reminder for ${dueLabel}` };
    } catch (e) {
      const cls = classifyAiError(e);
      if (cls.code === "credits_exhausted" || cls.code === "rate_limited") {
        await a.from("ai_suggestions").update({
          status: "pending",
          payload: { ...payload, last_error: { code: cls.code, message: cls.message, at: new Date().toISOString() } },
        }).eq("id", sug.id);
        return { ok: false, retryable: true, code: cls.code, error: cls.message };
      }
      await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: cls.message } }).eq("id", sug.id);
      return { ok: false, error: cls.message };
    }
  }

  // Create a promo code from a `create_promo` suggestion.
  if (sug.kind === "create_promo") {
    try {
      const discount = Math.max(1, Math.min(50, Number(payload.discount_percentage ?? payload.amount ?? 0)));
      const name = String(payload.campaign_name ?? sug.title ?? "PROMO");
      if (!discount) {
        const err = "Missing discount_percentage";
        await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: err } }).eq("id", sug.id);
        return { ok: false, error: err };
      }
      const code = await uniquePromoCode(a, name, discount);
      const insert = await a.from("shop_promo_codes").insert({
        code,
        discount_type: "percent",
        amount: discount,
        active: true,
        applies_to: "all",
      }).select("id, code, amount").single();
      if (insert.error) throw insert.error;
      // Generate a brand-safe hero slide draft tied to this promo. Failure here does not fail the promo apply.
      let heroSlideId: string | null = null;
      try {
        const imageDataUrl = await generateHeroImageDataUrl(name, discount);
        const slide = await a.from("hero_slides").insert({
          title: `${discount}% Off — ${name}`.slice(0, 120),
          subtitle: `Use code ${insert.data!.code} at checkout. Limited time.`,
          eyebrow: "Limited-Time Promo",
          cta_label: "Shop the Sale",
          cta_href: "/shop",
          image_url: imageDataUrl,
          image_alt: `${name} promotion — ${discount}% off`,
          status: "draft",
          sort_order: 200,
          promo_code: insert.data!.code,
          created_by_ai: true,
          created_by: userId,
        }).select("id").single();
        heroSlideId = slide.data?.id ?? null;
      } catch (e) {
        console.error("[hero-slide] draft creation failed:", e);
      }
      const h = await a.from("ai_change_history").insert({
        suggestion_id: sug.id, actor: userId, kind: sug.kind,
        table_name: "shop_promo_codes", record_id: insert.data!.id,
        before_state: null,
        after_state: { code: insert.data!.code, amount: insert.data!.amount, discount_type: "percent", active: true, hero_slide_id: heroSlideId },
      }).select("id").single();
      await a.from("ai_suggestions").update({ status: "applied", resolved_at: new Date().toISOString() }).eq("id", sug.id);
      await a.from("ai_audit_log").insert({ actor: userId, tool: `apply:${sug.kind}`, input: payload, output: { promo_id: insert.data!.id, code: insert.data!.code, hero_slide_id: heroSlideId }, approved: true });
      await a.from("ai_feedback").insert({ suggestion_id: sug.id, actor: userId, action: "applied", kind: sug.kind, suggestion_snapshot: { title: sug.title, summary: sug.summary, payload: sug.payload } });
      const heroMsg = heroSlideId ? ` Hero slide drafted — review at /admin/hero-slides.` : ` (Hero image draft skipped — generation failed.)`;
      return { ok: true, history_id: h.data?.id, message: `Promo ${insert.data!.code} is live — ${discount}% off.${heroMsg}` };
    } catch (e) {
      const cls = classifyAiError(e);
      if (cls.code === "credits_exhausted" || cls.code === "rate_limited") {
        await a.from("ai_suggestions").update({
          status: "pending",
          payload: { ...payload, last_error: { code: cls.code, message: cls.message, at: new Date().toISOString() } },
        }).eq("id", sug.id);
        return { ok: false, retryable: true, code: cls.code, error: cls.message };
      }
      await a.from("ai_suggestions").update({ status: "failed", payload: { ...payload, error: cls.message } }).eq("id", sug.id);
      return { ok: false, error: cls.message };
    }
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
    const friendly = target.table === "shop_products" && "price" in target.updates
      ? `Price updated to $${Number(target.updates.price).toFixed(2)}`
      : target.table === "shop_products" && target.updates.status === "available"
      ? `Published product`
      : `Updated ${target.table}`;
    return { ok: true, history_id: historyId, message: friendly };
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
      // Compound inserts (create_promo, marketing_idea, content_idea) have before_state=null → undo deletes the inserted row(s).
      if (h.before_state === null || h.before_state === undefined) {
        if (h.table_name === "ai_drafts") {
          const after: any = h.after_state ?? {};
          if (after.reminder_id) await a.from("admin_reminders").delete().eq("id", after.reminder_id);
          if (after.draft_id) await a.from("ai_drafts").delete().eq("id", after.draft_id);
          if (!after.draft_id && h.record_id) await a.from("ai_drafts").delete().eq("id", h.record_id);
        } else if (h.table_name && h.record_id) {
          await a.from(h.table_name).delete().eq("id", h.record_id);
        }
      } else {
        const { error: e } = await a.from(h.table_name).update(h.before_state ?? {}).eq("id", h.record_id);
        if (e) return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await a.from("ai_change_history").update({ undone: true, undone_at: new Date().toISOString() }).eq("id", history_id);
      if (h.suggestion_id) {
        await a.from("ai_suggestions").update({ status: "pending", resolved_at: null }).eq("id", h.suggestion_id);
      }
      await a.from("ai_audit_log").insert({ actor: user.id, tool: `undo:${h.kind}`, input: { history_id }, output: { reverted: h.before_state }, approved: true });
      await a.from("ai_feedback").insert({ suggestion_id: h.suggestion_id, actor: user.id, action: "undone", kind: h.kind, reason: body.reason ?? null, suggestion_snapshot: { before: h.before_state, after: h.after_state } });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Retry stuck suggestions (failed or silently acknowledged with a now-supported executor) → flip back to pending.
    if (action === "retry_stuck") {
      const retryable = ["create_promo", "pricing_idea", "price_change", "marketing_idea", "content_idea"];
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: stuck } = await a.from("ai_suggestions").select("id,payload").in("status", ["failed", "acknowledged", "pending"]).in("kind", retryable).gte("created_at", since);
      // Include items in failed/acknowledged OR pending items carrying a transient last_error.
      const targets = (stuck ?? []).filter((r: any) => {
        const hasLastErr = r.payload?.last_error?.code === "credits_exhausted" || r.payload?.last_error?.code === "rate_limited";
        return hasLastErr || r.payload?.error; // include legacy failed rows too
      });
      const ids = targets.map((r: any) => r.id);
      // Also include rows that were in failed/acknowledged without our flags (legacy)
      const { data: legacy } = await a.from("ai_suggestions").select("id").in("status", ["failed", "acknowledged"]).in("kind", retryable).gte("created_at", since);
      const allIds = Array.from(new Set([...ids, ...((legacy ?? []) as any[]).map((r) => r.id)]));
      if (allIds.length) {
        // Clear last_error and error on retry by re-fetching and rewriting payloads.
        const { data: rows } = await a.from("ai_suggestions").select("id,payload").in("id", allIds);
        for (const r of (rows ?? []) as any[]) {
          const p = { ...(r.payload ?? {}) };
          delete p.last_error;
          delete p.error;
          await a.from("ai_suggestions").update({ status: "pending", resolved_at: null, payload: p }).eq("id", r.id);
        }
      }
      return new Response(JSON.stringify({ ok: true, reset: allIds.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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