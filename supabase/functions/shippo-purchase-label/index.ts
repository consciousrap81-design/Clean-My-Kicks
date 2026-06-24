// Admin-triggered: purchases a USPS Priority Mail label for a booking_request.
// direction='inbound' → customer ships to shop. 'outbound' → shop ships back.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SHIPPO = "https://api.goshippo.com";

type Addr = {
  name?: string; street1: string; street2?: string;
  city: string; state: string; zip: string; country?: string;
};

function shopAddress(): Addr {
  return {
    name: Deno.env.get("SHOP_ADDRESS_NAME") || "Clean My Kicks",
    street1: Deno.env.get("SHOP_ADDRESS_STREET1")!,
    street2: Deno.env.get("SHOP_ADDRESS_STREET2") || undefined,
    city: Deno.env.get("SHOP_ADDRESS_CITY")!,
    state: Deno.env.get("SHOP_ADDRESS_STATE")!,
    zip: Deno.env.get("SHOP_ADDRESS_ZIP")!,
    country: Deno.env.get("SHOP_ADDRESS_COUNTRY") || "US",
  };
}

async function shippo(path: string, init: RequestInit = {}) {
  const key = Deno.env.get("SHIPPO_API_KEY");
  if (!key) throw new Error("SHIPPO_API_KEY not configured");
  const res = await fetch(`${SHIPPO}${path}`, {
    ...init,
    headers: {
      Authorization: `ShippoToken ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const request_id: string = body.request_id;
    const direction: "inbound" | "outbound" = body.direction;
    if (!request_id || !["inbound", "outbound"].includes(direction)) {
      return new Response(JSON.stringify({ error: "request_id and direction required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Service-role client for DB writes
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: request, error: rErr } = await admin
      .from("booking_requests")
      .select("id, customer_name, email, ship_from_address")
      .eq("id", request_id).single();
    if (rErr || !request) throw new Error(rErr?.message || "Request not found");

    const customer: Addr | null = request.ship_from_address as any;
    if (!customer?.street1) throw new Error("Customer ship-from address missing on request");

    const customerAddr: Addr = {
      name: customer.name || request.customer_name,
      street1: customer.street1, street2: customer.street2,
      city: customer.city, state: customer.state, zip: customer.zip,
      country: customer.country || "US",
    };
    if ((customerAddr.country || "US").toUpperCase() !== "US") throw new Error("US addresses only");

    const shop = shopAddress();
    const from = direction === "inbound" ? customerAddr : shop;
    const to = direction === "inbound" ? shop : customerAddr;

    // Create shipment + buy cheapest USPS Priority rate
    const shipment = await shippo("/shipments/", {
      method: "POST",
      body: JSON.stringify({
        address_from: from, address_to: to,
        parcels: [{ length: "12", width: "8", height: "5", distance_unit: "in", weight: "2", mass_unit: "lb" }],
        async: false,
      }),
    });
    const rate = (shipment.rates || []).find((r: any) =>
      r.provider === "USPS" && /priority/i.test(r.servicelevel?.name || "") && !/express/i.test(r.servicelevel?.name || ""),
    );
    if (!rate) throw new Error("No USPS Priority rate available");

    const tx = await shippo("/transactions/", {
      method: "POST",
      body: JSON.stringify({ rate: rate.object_id, label_file_type: "PDF", async: false }),
    });
    if (tx.status !== "SUCCESS") throw new Error((tx.messages || []).map((m: any) => m.text).join("; ") || "Label purchase failed");

    const { data: inserted, error: iErr } = await admin.from("shipments").insert({
      request_id, direction,
      carrier: "USPS", service: "Priority Mail",
      tracking_number: tx.tracking_number,
      tracking_url: tx.tracking_url_provider,
      label_url: tx.label_url,
      shippo_transaction_id: tx.object_id,
      rate_cents: Math.round(parseFloat(rate.amount) * 100),
      status: "label_created",
      last_event_at: new Date().toISOString(),
    }).select().single();
    if (iErr) throw iErr;

    return new Response(JSON.stringify({ shipment: inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});