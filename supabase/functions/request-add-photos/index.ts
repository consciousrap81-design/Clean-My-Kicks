import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_RE = /^[a-f0-9]{32}$/;
// Matches the request-photos bucket path shape enforced by storage RLS:
// `<public_token>/<uuid>.<ext>`. The public_token folder scopes uploads to
// the holder of the secret upload link.
const PATH_RE =
  /^[a-f0-9]{32}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|heic|heif)$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const photos: unknown = body?.photos;

    if (!TOKEN_RE.test(token)) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(photos) || photos.length === 0 || photos.length > 10) {
      return new Response(JSON.stringify({ error: "Provide 1-10 photo paths" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const safePaths = (photos as unknown[]).filter(
      (p): p is string =>
        typeof p === "string" &&
        PATH_RE.test(p) &&
        // Path folder must match the caller's token — no cross-request writes.
        p.split("/")[0] === token,
    );
    if (safePaths.length === 0) {
      return new Response(JSON.stringify({ error: "No valid photo paths" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: reqRow, error: rErr } = await supabase
      .from("booking_requests")
      .select("id, status, photos, email, customer_name, shoe_brand, shoe_model")
      .eq("public_token", token)
      .maybeSingle();

    if (rErr || !reqRow) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (reqRow.status !== "awaiting_photos" && reqRow.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "This request is no longer accepting photos." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const merged = Array.from(
      new Set([...(reqRow.photos ?? []) as string[], ...safePaths]),
    ).slice(0, 30);

    const { error: uErr } = await supabase
      .from("booking_requests")
      .update({ photos: merged, status: "pending" })
      .eq("id", reqRow.id);

    if (uErr) throw uErr;

    // Fire-and-forget customer confirmation email
    if (reqRow.email) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "photos-received",
            recipientEmail: reqRow.email,
            idempotencyKey: `photos-received-${reqRow.id}-${safePaths.join(',').slice(0, 80)}`,
            templateData: {
              customerName: reqRow.customer_name,
              shoeBrand: reqRow.shoe_brand,
              shoeModel: reqRow.shoe_model,
              photoCount: safePaths.length,
            },
          },
        });
      } catch (e) {
        console.error("photos-received email failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, count: safePaths.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("request-add-photos error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});