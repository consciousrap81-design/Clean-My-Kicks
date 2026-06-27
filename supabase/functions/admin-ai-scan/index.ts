import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText } from "npm:ai@7";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";

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

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: "You are an SMB growth advisor for a sneaker restoration shop in Denton, TX (Clean My Kicks). Look at the JSON and produce 3-6 concrete, prioritized suggestions. Each suggestion MUST be a JSON object with: title (<=60 chars), summary (1-2 sentences), kind (one of: publish_product, follow_up_request, restock_alert, marketing_idea, pricing_idea, content_idea), reasoning (1-2 sentences explaining why), sources (array of 1-3 objects: {title, url, snippet} citing the internal data row OR a credible external reference such as a competitor URL, industry report, or pricing guide). Reply as JSON array only.",
      prompt: JSON.stringify(context),
    });

    let parsed: any[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      parsed = match ? JSON.parse(match[0]) : [];
    } catch { parsed = []; }

    if (parsed.length) {
      const rows = parsed.slice(0, 8).map((s) => ({
        kind: s.kind ?? "marketing_idea",
        title: String(s.title ?? "Suggestion").slice(0, 200),
        summary: String(s.summary ?? "").slice(0, 1000),
        payload: {
          source: "scheduled_scan",
          reasoning: s.reasoning ?? null,
          sources: Array.isArray(s.sources) ? s.sources.slice(0, 6) : [],
          raw: s,
          context,
        },
        status: "pending",
      }));
      await a.from("ai_suggestions").insert(rows);
    }

    return new Response(JSON.stringify({ ok: true, inserted: parsed.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});