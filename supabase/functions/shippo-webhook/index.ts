// Receives Shippo tracking events. Shippo does not issue a per-webhook signing
// secret in the dashboard, so we authenticate by re-fetching the referenced
// object from Shippo using our API key and trusting only that re-fetched data.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SHIPPO = "https://api.goshippo.com";

async function signShipmentId(shipmentId: string): Promise<string | null> {
  const secret = Deno.env.get("SHIPMENT_TOKEN_SECRET");
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(shipmentId));
  const b = new Uint8Array(sig); let s = "";
  for (const x of b) s += String.fromCharCode(x);
  const b64 = btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${shipmentId}.${b64}`;
}

const STATUS_MAP: Record<string, string> = {
  UNKNOWN: "label_created",
  PRE_TRANSIT: "label_created",
  TRANSIT: "in_transit",
  DELIVERED: "delivered",
  RETURNED: "returned",
  FAILURE: "failed",
};

const STATUS_LABEL: Record<string, string> = {
  label_created: "Label Created",
  in_transit: "In Transit",
  delivered: "Delivered",
  returned: "Returned",
  failed: "Delivery Issue",
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
    const statusDetail: string | null =
      verified?.tracking_status?.status_details ||
      verified?.tracking_status?.substatus?.text ||
      verified?.tracking_status?.status ||
      null;
    const eta: string | null = verified?.eta || null;
    const carrierName: string | null = verified?.carrier || carrier || null;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: shipment } = await admin
      .from("shipments")
      .select("id, request_id, direction, status, tracking_status_detail, eta, tracking_number, tracking_url, carrier, notifications_enabled")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (!shipment) {
      return ok({ unknown_shipment: true });
    }

    // Log raw events for audit. Use full tracking_history when present,
    // otherwise just the current tracking_status snapshot.
    const history: any[] = Array.isArray(verified?.tracking_history) && verified.tracking_history.length
      ? verified.tracking_history
      : (verified?.tracking_status ? [verified.tracking_status] : []);
    if (history.length) {
      const { data: existing } = await admin
        .from("shipment_events")
        .select("occurred_at, status")
        .eq("shipment_id", shipment.id);
      const seen = new Set((existing || []).map((e: any) => `${e.occurred_at}|${e.status || ""}`));
      const rows = history
        .map((h: any) => {
          const occurred_at = h?.status_date || h?.object_updated || new Date().toISOString();
          const status = h?.status || null;
          const key = `${new Date(occurred_at).toISOString()}|${status || ""}`;
          if (seen.has(key)) return null;
          const loc = h?.location;
          const location = loc
            ? [loc.city, loc.state, loc.zip, loc.country].filter(Boolean).join(", ")
            : null;
          return {
            shipment_id: shipment.id,
            occurred_at,
            status,
            status_detail: h?.status_details || h?.substatus?.text || null,
            location,
            raw: h,
          };
        })
        .filter(Boolean);
      if (rows.length) await admin.from("shipment_events").insert(rows as any[]);
    }

    const statusChanged = shipment.status !== mapped;
    const detailChanged = (shipment as any).tracking_status_detail !== statusDetail;
    const etaChanged = ((shipment as any).eta || null) !== eta;

    if (statusChanged || detailChanged || etaChanged) {
      const update: Record<string, unknown> = {
        status: mapped,
        last_event_at: eventAt,
        tracking_status_detail: statusDetail,
        eta,
      };
      if (carrierName) update.carrier = carrierName.toUpperCase() === "USPS" ? "USPS" : carrierName;
      await admin.from("shipments").update(update).eq("id", shipment.id);

      if (statusChanged) {
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
          const etaSuffix = eta ? ` · ETA ${new Date(eta).toLocaleDateString("en-US")}` : "";
        await admin.from("job_updates").insert({
          job_id: br.converted_job_id,
            body: `${label} (${(carrierName || "USPS").toUpperCase()} ${trackingNumber})${etaSuffix}`,
          customer_visible: true,
        });
      }
    }

      // Notify customer on status OR eta change (skip pure detail-only changes)
      if ((statusChanged || etaChanged) && (shipment as any).notifications_enabled !== false) {
        try {
          const { data: br2 } = await admin
            .from("booking_requests")
            .select("email, customer_name")
            .eq("id", shipment.request_id).maybeSingle();
          const to = br2?.email;
          if (to) {
            const origin = Deno.env.get("PUBLIC_SITE_URL") || "https://cleanmykicks.com";
            const trackPageUrl = `${origin}/track?n=${encodeURIComponent(trackingNumber)}`;
            const signed = await signShipmentId(shipment.id);
            const manageUrl = signed ? `${origin}/track?u=${encodeURIComponent(signed)}` : trackPageUrl;
            await admin.functions.invoke("send-transactional-email", {
              body: {
                templateName: "shipment-update",
                recipientEmail: to,
                idempotencyKey: `shipment-${shipment.id}-${mapped}-${eta || "noeta"}`,
                templateData: {
                  customerName: br2?.customer_name?.split(" ")[0],
                  direction: shipment.direction,
                  statusLabel: STATUS_LABEL[mapped] || mapped,
                  statusDetail,
                  carrier: (carrierName || "USPS").toUpperCase(),
                  trackingNumber,
                  trackingUrl: (shipment as any).tracking_url,
                  eta,
                  etaChanged,
                  trackPageUrl,
                  manageUrl,
                },
              },
            });
          }
        } catch (mailErr) {
          console.error("shipment-update email failed", (mailErr as Error).message);
        }
      }
    }

    return ok();
  } catch (e) {
    console.error("shippo-webhook error", (e as Error).message);
    return ok({ error_logged: true });
  }
});