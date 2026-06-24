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

    // Find existing customer by email or phone
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();

    let customerId = existing?.id as string | undefined;

    if (!customerId) {
      const { data: created, error: cErr } = await supabase
        .from("customers")
        .insert({ name: fullName, email, phone })
        .select("id")
        .single();
      if (cErr) throw cErr;
      customerId = created.id;
    } else {
      await supabase.from("customers").update({ name: fullName, email, phone }).eq("id", customerId);
    }

    // Match service by name (case-insensitive contains)
    let serviceId: string | null = null;
    if (serviceLevel) {
      const { data: svc } = await supabase
        .from("services")
        .select("id")
        .ilike("name", `%${serviceLevel}%`)
        .limit(1)
        .maybeSingle();
      serviceId = svc?.id ?? null;
    }

    const conditionParts = [
      shoeSize ? `Size: ${shoeSize}` : null,
      dropOffMethod ? `Drop-off: ${dropOffMethod}` : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean);

    const { error: jErr } = await supabase.from("jobs").insert({
      customer_id: customerId,
      service_id: serviceId,
      shoe_brand: shoeBrand ?? null,
      shoe_model: shoeModel ?? null,
      condition_notes: conditionParts.join("\n") || null,
      status: "new_request",
      payment_status: "unpaid",
      intake_date: new Date().toISOString().slice(0, 10),
    });
    if (jErr) throw jErr;

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