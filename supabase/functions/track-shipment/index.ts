// Public tracking lookup + notification toggle. Knowledge of the tracking
// number is what authorizes the view and the opt-out toggle (same model used
// for quote / request public token URLs in this project).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const STATUS_LABEL: Record<string, string> = {
  label_created: "Label Created",
  in_transit: "In Transit",
  delivered: "Delivered",
  returned: "Returned",
  failed: "Delivery Issue",
};

function normalizeTracking(input: string): string {
  return (input || "").replace(/\s+/g, "").toUpperCase();
}

function b64url(bytes: Uint8Array): string {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmac(payload: string): Promise<string> {
  const secret = Deno.env.get("SHIPMENT_TOKEN_SECRET");
  if (!secret) throw new Error("SHIPMENT_TOKEN_SECRET not configured");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export async function signShipmentToken(shipmentId: string): Promise<string> {
  const sig = await hmac(shipmentId);
  return `${shipmentId}.${sig}`;
}
async function verifyShipmentToken(token: string): Promise<string | null> {
  const i = token.indexOf(".");
  if (i < 0) return null;
  const id = token.slice(0, i), sig = token.slice(i + 1);
  const expected = await hmac(id);
  return timingSafeEqual(sig, expected) ? id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    let tracking = "";
    let orderNumber = "";
    let signedToken = "";
    let action: "view" | "toggle" = "view";
    let notifications_enabled: boolean | undefined;

    if (req.method === "GET") {
      const url = new URL(req.url);
      tracking = normalizeTracking(url.searchParams.get("tracking") || url.searchParams.get("n") || "");
      orderNumber = (url.searchParams.get("order") || url.searchParams.get("o") || "").trim();
      signedToken = (url.searchParams.get("u") || "").trim();
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      tracking = normalizeTracking(body.tracking || body.n || "");
      orderNumber = (body.order || body.o || "").trim();
      signedToken = (body.u || "").trim();
      action = body.action === "toggle" ? "toggle" : "view";
      notifications_enabled = typeof body.notifications_enabled === "boolean" ? body.notifications_enabled : undefined;
      if (body.action === "unsubscribe_signed") action = "toggle";
      if (body.action === "unsubscribe_signed") notifications_enabled = false;
    } else {
      return json({ error: "Method not allowed" }, 405);
    }

    let shipment: any = null;
    const shipCols = "id, direction, carrier, service, tracking_number, tracking_url, status, tracking_status_detail, eta, last_event_at, notifications_enabled";

    if (signedToken) {
      const sid = await verifyShipmentToken(signedToken);
      if (!sid) return json({ error: "Invalid or expired link" }, 400);
      const r = await admin.from("shipments").select(shipCols).eq("id", sid).maybeSingle();
      shipment = r.data;
    } else if (tracking && tracking.length >= 6 && tracking.length <= 60) {
      const r = await admin.from("shipments").select(shipCols).ilike("tracking_number", tracking).maybeSingle();
      shipment = r.data;
    } else if (orderNumber && orderNumber.length >= 4) {
      // Look up by booking_requests.public_token (the customer's "order number"
      // from their quote/request emails). Return the most recent shipment.
      const { data: br } = await admin
        .from("booking_requests")
        .select("id")
        .eq("public_token", orderNumber)
        .maybeSingle();
      if (br?.id) {
        const { data: ships } = await admin
          .from("shipments")
          .select(shipCols)
          .eq("request_id", br.id)
          .order("created_at", { ascending: false });
        shipment = (ships || [])[0] || null;
      }
    } else {
      return json({ error: "Enter a tracking number or order number" }, 400);
    }
    if (!shipment) return json({ error: "No shipment found" }, 404);

    if (action === "toggle" && typeof notifications_enabled === "boolean") {
      const { error: upErr } = await admin
        .from("shipments")
        .update({ notifications_enabled })
        .eq("id", shipment.id);
      if (upErr) throw upErr;
      shipment.notifications_enabled = notifications_enabled;
    }

    const { data: events } = await admin
      .from("shipment_events")
      .select("id, occurred_at, status, status_detail, location")
      .eq("shipment_id", shipment.id)
      .order("occurred_at", { ascending: false });

    return json({
      shipment: {
        ...shipment,
        status_label: STATUS_LABEL[shipment.status] || shipment.status,
      },
      events: events || [],
    });
  } catch (e) {
    console.error("track-shipment error", (e as Error).message);
    return json({ error: "Lookup failed" }, 500);
  }
});
