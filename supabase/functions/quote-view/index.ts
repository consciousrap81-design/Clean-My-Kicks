import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TOKEN_RE = /^[A-Za-z0-9]{16,128}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    if (!TOKEN_RE.test(token)) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("id, customer_name, shoe_brand, shoe_model, service_recommended, quote_amount, addons, notes, expires_at, status, photos, sent_at, first_viewed_at, view_count")
      .eq("public_token", token)
      .maybeSingle();

    if (error || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark expired if applicable
    let status = quote.status as string;
    if (status !== "accepted" && status !== "declined" && quote.expires_at && new Date(quote.expires_at) < new Date()) {
      await supabase.from("quotes").update({ status: "expired" }).eq("id", quote.id);
      status = "expired";
    }

    // Mark viewed (but only if currently sent)
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { last_viewed_at: now, view_count: (quote.view_count ?? 0) + 1 };
    if (!quote.first_viewed_at) patch.first_viewed_at = now;
    if (status === "sent") { patch.status = "viewed"; status = "viewed"; }
    await supabase.from("quotes").update(patch).eq("id", quote.id);

    // Resolve photo URLs (signed for storage paths)
    const photos: string[] = [];
    for (const entry of (quote.photos ?? []) as string[]) {
      if (!entry) continue;
      if (/^https?:\/\//i.test(entry)) { photos.push(entry); continue; }
      const { data: signed } = await supabase.storage.from("request-photos").createSignedUrl(entry, 3600);
      if (signed?.signedUrl) photos.push(signed.signedUrl);
    }

    return new Response(JSON.stringify({
      quote: {
        customer_name: quote.customer_name,
        shoe_brand: quote.shoe_brand,
        shoe_model: quote.shoe_model,
        service_recommended: quote.service_recommended,
        quote_amount: Number(quote.quote_amount),
        addons: quote.addons ?? [],
        notes: quote.notes,
        expires_at: quote.expires_at,
        status,
        photos,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("quote-view error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});