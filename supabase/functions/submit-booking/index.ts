import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      serviceLevel,
      shoeBrand,
      shoeModel,
      shoeSize,
      dropOffMethod,
      notes,
      photos,
    } = body ?? {};

    if (!fullName || !email || !phone || !serviceLevel) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: rErr } = await supabase.from("booking_requests").insert({
      customer_name: fullName,
      email: email ?? null,
      phone: phone ?? null,
      service_requested: serviceLevel ?? null,
      shoe_brand: shoeBrand ?? null,
      shoe_model: shoeModel ?? null,
      shoe_size: shoeSize ?? null,
      drop_off_method: dropOffMethod ?? null,
      notes: notes ?? null,
      photos: Array.isArray(photos) ? photos : [],
      source: "Website",
      status: "pending",
    });
    if (rErr) throw rErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-booking error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});