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
  try {
    const event = await req.json();
    // Shippo "Track Updated" payload: { event, test, data: { tracking_number, carrier, tracking_status, ... } }
    const carrier: string | undefined = event?.data?.carrier;
    const trackingNumber: string | undefined = event?.data?.tracking_number;
    if (!carrier || !trackingNumber) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Re-fetch from Shippo for authenticity
    const verified = await shippoGet(`/tracks/${carrier}/${encodeURIComponent(trackingNumber)}`);
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
      return new Response(JSON.stringify({ ok: true, unknown_shipment: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});