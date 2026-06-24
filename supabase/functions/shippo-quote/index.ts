// Estimate round-trip USPS Priority Mail cost for a mail-in order.
// Public endpoint. Returns inbound + outbound estimate in cents.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SHIPPO = "https://api.goshippo.com";

type Addr = {
  name?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
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

async function getPriorityRate(from: Addr, to: Addr): Promise<number | null> {
  const key = Deno.env.get("SHIPPO_API_KEY");
  if (!key) throw new Error("SHIPPO_API_KEY not configured");
  const parcel = {
    length: "12", width: "8", height: "5",
    distance_unit: "in", weight: "2", mass_unit: "lb",
  };
  const res = await fetch(`${SHIPPO}/shipments/`, {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_from: { ...from, country: from.country || "US" },
      address_to: { ...to, country: to.country || "US" },
      parcels: [parcel],
      async: false,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `Shippo error ${res.status}`);
  const rates: any[] = data.rates || [];
  const priority = rates.find(
    (r) => r.provider === "USPS" && /priority/i.test(r.servicelevel?.name || "") && !/express/i.test(r.servicelevel?.name || ""),
  );
  if (!priority) return null;
  return Math.round(parseFloat(priority.amount) * 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const customer: Addr = body.address;
    if (!customer?.street1 || !customer?.city || !customer?.state || !customer?.zip) {
      return new Response(JSON.stringify({ error: "Invalid address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((customer.country || "US").toUpperCase() !== "US") {
      return new Response(JSON.stringify({ error: "Mail-in is US-only at this time." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const shop = shopAddress();
    const [inboundCents, outboundCents] = await Promise.all([
      getPriorityRate(customer, shop),
      getPriorityRate(shop, customer),
    ]);
    if (inboundCents == null || outboundCents == null) {
      return new Response(JSON.stringify({ error: "No USPS Priority rate available for that address." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      inbound_cents: inboundCents,
      outbound_cents: outboundCents,
      round_trip_cents: inboundCents + outboundCents,
      carrier: "USPS",
      service: "Priority Mail",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});