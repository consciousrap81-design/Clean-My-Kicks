import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function addBusinessDays(start: Date, days: number) {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body.sessionId ?? "").trim();
    if (!sessionId || sessionId.length > 200) return json({ error: "Invalid session" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await supabase
      .from("shop_orders")
      .select(
        "id, status, amount, currency, customer_email, customer_name, shipping_address, product_snapshot, discount_cents, promo_code, paid_at, created_at, shipping_method, tracking_number, tracking_carrier",
      )
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (!order) {
      // Webhook hasn't processed yet — let client poll.
      return json({ status: "pending" });
    }

    const snap: any = order.product_snapshot ?? {};
    const items = Array.isArray(snap.items) ? snap.items : (snap.id ? [{
      type: "sneaker",
      name: [snap.brand, snap.model, snap.name].filter(Boolean).join(" ") || snap.name,
      size: snap.size,
      qty: 1,
      unit_price_cents: Math.round((snap.price ?? 0) * 100),
    }] : []);

    // Use ordered shipping method if recorded, otherwise infer from address presence
    const shipMethod = order.shipping_method || "standard";
    const paidAt = order.paid_at ? new Date(order.paid_at) : new Date(order.created_at);
    const eta = shipMethod === "express"
      ? { min: addBusinessDays(paidAt, 1), max: addBusinessDays(paidAt, 3), label: "Express (1–3 business days)" }
      : { min: addBusinessDays(paidAt, 5), max: addBusinessDays(paidAt, 7), label: "Standard (5–7 business days)" };

    return json({
      status: order.status, // pending | paid | shipped | delivered | refunded
      order_id: order.id,
      order_number: order.id.slice(0, 8).toUpperCase(),
      items,
      customer_email: order.customer_email,
      customer_name: order.customer_name,
      shipping_address: order.shipping_address,
      shipping_method: shipMethod,
      eta,
      amount_total_cents: Math.round((order.amount ?? 0) * 100),
      discount_cents: order.discount_cents ?? 0,
      promo_code: order.promo_code ?? null,
      currency: order.currency ?? "usd",
      tracking_number: order.tracking_number ?? null,
      tracking_carrier: order.tracking_carrier ?? null,
      paid_at: order.paid_at,
    });
  } catch (e) {
    console.error("get-shop-order-status", e);
    return json({ error: (e as Error).message || "Server error" }, 500);
  }
});