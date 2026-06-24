import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_RE = /^[A-Za-z0-9]{16,128}$/;
const VALID_ACTIONS = new Set(["accept", "decline", "request_info"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const action = String(body.action ?? "");
    const message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";

    if (!TOKEN_RE.test(token) || !VALID_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("id, status, expires_at, request_id")
      .eq("public_token", token)
      .maybeSingle();

    if (error || !quote) {
      return new Response(JSON.stringify({ error: "Quote not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (quote.status === "accepted" || quote.status === "declined") {
      return new Response(JSON.stringify({ error: "Quote already responded to" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      await supabase.from("quotes").update({ status: "expired" }).eq("id", quote.id);
      return new Response(JSON.stringify({ error: "Quote expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    if (action === "accept") {
      await supabase.from("quotes").update({
        status: "accepted", responded_at: now, customer_response: message || null,
      }).eq("id", quote.id);
      if (quote.request_id) {
        await supabase.from("booking_requests").update({ accepted_quote_id: quote.id }).eq("id", quote.request_id);
      }
    } else if (action === "decline") {
      await supabase.from("quotes").update({
        status: "declined", responded_at: now, customer_response: message || null,
      }).eq("id", quote.id);
    } else {
      // request_info: keep status, append message
      await supabase.from("quotes").update({
        customer_response: message || "Customer requested more information.",
        responded_at: now,
      }).eq("id", quote.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quote-respond error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});