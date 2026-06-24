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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    let tracking = "";
    let action: "view" | "toggle" = "view";
    let notifications_enabled: boolean | undefined;

    if (req.method === "GET") {
      const url = new URL(req.url);
      tracking = normalizeTracking(url.searchParams.get("tracking") || url.searchParams.get("n") || "");
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      tracking = normalizeTracking(body.tracking || body.n || "");
      action = body.action === "toggle" ? "toggle" : "view";
      notifications_enabled = typeof body.notifications_enabled === "boolean" ? body.notifications_enabled : undefined;
    } else {
      return json({ error: "Method not allowed" }, 405);
    }

    if (!tracking || tracking.length < 6 || tracking.length > 60) {
      return json({ error: "Enter a valid tracking number" }, 400);
    }

    const { data: shipment, error } = await admin
      .from("shipments")
      .select("id, direction, carrier, service, tracking_number, tracking_url, status, tracking_status_detail, eta, last_event_at, notifications_enabled")
      .ilike("tracking_number", tracking)
      .maybeSingle();
    if (error) throw error;
    if (!shipment) return json({ error: "No shipment found for that tracking number" }, 404);

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
