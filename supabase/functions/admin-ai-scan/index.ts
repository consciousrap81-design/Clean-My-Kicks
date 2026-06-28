import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText } from "npm:ai@7";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { loadAiPreferenceBlock } from "../_shared/ai-preferences.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const gateway = createLovableAiGatewayProvider(Deno.env.get("LOVABLE_API_KEY")!);

    // Gather quick signals
    const [{ data: drafts }, { data: lowStock }, { data: recentOrders }, { data: staleRequests }] = await Promise.all([
      a.from("shop_products").select("id,name,brand,model,created_at").eq("status", "draft").order("created_at", { ascending: true }).limit(10),
      a.from("shop_accessory_variants").select("id,sku,stock,accessory_id").lte("stock", 3).limit(10),
      a.from("shop_orders").select("id,status,total_cents,created_at").order("created_at", { ascending: false }).limit(10),
      a.from("booking_requests").select("id,status,created_at").eq("status", "new").order("created_at", { ascending: true }).limit(10),
    ]);

    const context = { drafts, lowStock, recentOrders, staleRequests, scannedAt: new Date().toISOString() };
    const draftIds = new Set((drafts ?? []).map((d: any) => d.id));
    const variantIds = new Set((lowStock ?? []).map((v: any) => v.id));
    const requestIds = new Set((staleRequests ?? []).map((r: any) => r.id));

    const prefs = await loadAiPreferenceBlock();

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `You are an SMB growth advisor for a sneaker restoration shop in Denton, TX (Clean My Kicks). Look at the JSON and produce 3-6 concrete, prioritized suggestions.

Each suggestion MUST be a JSON object with: title (<=60 chars), summary (1-2 sentences), kind, reasoning (1-2 sentences), sources (array of 1-3 {title,url,snippet}), and the REQUIRED target fields for its kind:

- "publish_product": product_id (MUST be a real id from drafts[])
- "pricing_idea": product_id (from drafts[] or recentOrders[]) AND price_cents (integer, the proposed new price in cents)
- "restock_alert": variant_id (from lowStock[]) AND add_stock (positive integer of units to add)
- "follow_up_request": request_id (from staleRequests[]) AND status ("contacted" | "quoted" | "closed")
- "marketing_idea": no target fields (advisory only)
- "content_idea": no target fields (advisory only)

Only reference ids that appear in the provided JSON. If you cannot tie an idea to a real id, use marketing_idea or content_idea instead. Reply as JSON array only.

${prefs}`,
      prompt: JSON.stringify(context),
    });

    let parsed: any[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      parsed = match ? JSON.parse(match[0]) : [];
    } catch { parsed = []; }

    const ACTIONABLE = new Set(["publish_product", "pricing_idea", "restock_alert", "follow_up_request"]);
    const ADVISORY = new Set(["marketing_idea", "content_idea"]);
    const rows: any[] = [];
    let skipped = 0;
    for (const s of parsed.slice(0, 12)) {
      let kind = s.kind ?? "marketing_idea";
      const payload: any = {
        source: "scheduled_scan",
        reasoning: s.reasoning ?? null,
        sources: Array.isArray(s.sources) ? s.sources.slice(0, 6) : [],
        raw: s,
      };
      if (kind === "publish_product") {
        if (!s.product_id || !draftIds.has(s.product_id)) { skipped++; continue; }
        payload.product_id = s.product_id;
      } else if (kind === "pricing_idea") {
        if (!s.product_id || typeof s.price_cents !== "number" || s.price_cents <= 0) { skipped++; continue; }
        payload.product_id = s.product_id;
        payload.price_cents = Math.round(s.price_cents);
      } else if (kind === "restock_alert") {
        if (!s.variant_id || !variantIds.has(s.variant_id) || typeof s.add_stock !== "number" || s.add_stock <= 0) { skipped++; continue; }
        payload.variant_id = s.variant_id;
        payload.add_stock = Math.round(s.add_stock);
      } else if (kind === "follow_up_request") {
        if (!s.request_id || !requestIds.has(s.request_id) || !s.status) { skipped++; continue; }
        payload.request_id = s.request_id;
        payload.status = s.status;
      } else if (!ADVISORY.has(kind)) {
        kind = "marketing_idea";
      }
      rows.push({
        kind,
        title: String(s.title ?? "Suggestion").slice(0, 200),
        summary: String(s.summary ?? "").slice(0, 1000),
        payload,
        status: "pending",
      });
    }
    if (rows.length) await a.from("ai_suggestions").insert(rows);

    return new Response(JSON.stringify({ ok: true, inserted: rows.length, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});