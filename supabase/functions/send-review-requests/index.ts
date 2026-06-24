import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://cleanmykicks.com";
const DELAY_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Pull delivered (or shipped 7+ days ago) orders that haven't been review-requested yet
  const { data: orders, error } = await supabase
    .from("shop_orders")
    .select("id, product_id, customer_email, customer_name, product_snapshot, status, shipped_at, created_at, review_request_sent_at")
    .is("review_request_sent_at", null)
    .in("status", ["shipped", "delivered"])
    .lt("shipped_at", cutoff)
    .limit(50);

  if (error) {
    console.error("orders query error", error);
    return json({ error: error.message }, 500);
  }
  if (!orders || orders.length === 0) return json({ ok: true, sent: 0 });

  const summary = { processed: 0, sent: 0, skipped: 0, errors: 0 };

  for (const o of orders) {
    summary.processed++;
    try {
      if (!o.customer_email) { summary.skipped++; continue; }
      const snap = (o.product_snapshot as any) || {};
      const productName =
        [snap.brand, snap.model].filter(Boolean).join(" ") || snap.name || "your sneakers";
      const reviewUrl = `${SITE_URL}/account/shop-orders/${o.id}?review=1`;

      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "shop-review-request",
          recipientEmail: o.customer_email,
          idempotencyKey: `review-request-${o.id}`,
          templateData: {
            customerName: o.customer_name || undefined,
            productName,
            productSize: snap.size || null,
            reviewUrl,
          },
        },
      });
      if (sendErr) { summary.errors++; console.error("send err", o.id, sendErr); continue; }

      await supabase
        .from("shop_orders")
        .update({ review_request_sent_at: new Date().toISOString() })
        .eq("id", o.id);
      summary.sent++;
    } catch (e) {
      summary.errors++;
      console.error("review-request loop error", o.id, e);
    }
  }

  return json({ ok: true, summary });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}