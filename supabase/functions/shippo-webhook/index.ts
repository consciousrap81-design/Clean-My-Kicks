// Receives Shippo tracking events. Shippo does not issue a per-webhook signing
// secret in the dashboard, so we authenticate by re-fetching the referenced
// object from Shippo using our API key and trusting only that re-fetched data.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SHIPPO = "https://api.goshippo.com";

const STATUS_MAP: Record<string, string> = {
  UNKNOWN: "label_created",
  PRE_TRANSIT: "label_created",
  TRANSIT: "in_transit",
  DELIVERED: "delivered",
  RETURNED: "returned",
  FAILURE: "failed",
};

async function shippoGet(path: string) {
  const key = Deno.env.get("SHIPPO_API_KEY");
  if (!key) throw new Error("SHIPPO_API_KEY not configured");
  const res = await fetch(`${SHIPPO}${path}`, {
    headers: { Authorization: `ShippoToken ${key}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Shippo ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const ok = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ ok: true, ...extra }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  try {
    // Always respond 2XX to Shippo. Log failures instead of returning 500,
    // otherwise Shippo marks the webhook as failing (incl. on Send Sample).
    let event: any = {};
    try { event = await req.json(); } catch { return ok({ ignored: "no_json" }); }

    // Shippo "Track Updated" payload: { event, test, data: { tracking_number, carrier, tracking_status, ... } }
    const carrier: string | undefined = event?.data?.carrier;
    const trackingNumber: string | undefined = event?.data?.tracking_number;
    if (!carrier || !trackingNumber) {
      return ok({ ignored: "missing_fields", test: !!event?.test });
    }

    // Re-fetch from Shippo for authenticity. Sample/test events reference
    // fake tracking numbers, so swallow fetch errors as a 2XX ack.
    let verified: any;
    try {
      verified = await shippoGet(`/tracks/${carrier}/${encodeURIComponent(trackingNumber)}`);
    } catch (err) {
      console.error("shippo re-fetch failed", (err as Error).message);
      return ok({ ignored: "refetch_failed", test: !!event?.test });
    }
    const trackingStatus = verified?.tracking_status?.status as string | undefined;
    const mapped = (trackingStatus && STATUS_MAP[trackingStatus]) || "in_transit";
    const eventAt = verified?.tracking_status?.status_date || new Date().toISOString();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: shipment } = await admin
      .from("shipments")
      .select("id, request_id, direction, status")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (!shipment) {
      return ok({ unknown_shipment: true });
    }

    if (shipment.status !== mapped) {
      await admin.from("shipments").update({
        status: mapped,
        last_event_at: eventAt,
      }).eq("id", shipment.id);

      // Append to job timeline if there's a linked job
      const { data: br } = await admin
        .from("booking_requests")
        .select("converted_job_id")
        .eq("id", shipment.request_id).maybeSingle();
      if (br?.converted_job_id) {
        const label =
          shipment.direction === "inbound"
            ? `Inbound shipment ${mapped.replace("_", " ")}`
            : `Return shipment ${mapped.replace("_", " ")}`;
        await admin.from("job_updates").insert({
          job_id: br.converted_job_id,
          body: `${label} (USPS ${trackingNumber})`,
          customer_visible: true,
        });
      }
    }

    return ok();
  } catch (e) {
    console.error("shippo-webhook error", (e as Error).message);
    return ok({ error_logged: true });
  }
});