import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEDUPE_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId ?? "");
    const sessionId = String(body.sessionId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(productId)) return json({ ok: false }, 400);
    if (!sessionId || sessionId.length > 128) return json({ ok: false }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Dedupe per session within window
    const since = new Date(Date.now() - DEDUPE_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("shop_product_views")
      .select("id")
      .eq("product_id", productId)
      .eq("session_id", sessionId)
      .gte("created_at", since)
      .limit(1);

    if (recent && recent.length > 0) return json({ ok: true, deduped: true });

    await supabase.from("shop_product_views").insert({ product_id: productId, session_id: sessionId });

    // Increment view_count
    const { data: prod } = await supabase
      .from("shop_products")
      .select("view_count")
      .eq("id", productId)
      .maybeSingle();
    if (prod) {
      await supabase
        .from("shop_products")
        .update({ view_count: (prod.view_count ?? 0) + 1 })
        .eq("id", productId);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("track-product-view error", e);
    return json({ ok: false }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}