import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://cleanmykicks.com";
const FIRST_DELAY_MS = 60 * 60 * 1000; // 1 hour
const SECOND_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours
const EXPIRE_AFTER_MS = 72 * 60 * 60 * 1000; // 72 hours

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const summary = { processed: 0, first_sent: 0, second_sent: 0, expired: 0, skipped: 0, errors: 0 };

  // Pull all pending carts older than 1h (only those need any action)
  const { data: carts, error } = await supabase
    .from("shop_abandoned_carts")
    .select("*")
    .eq("status", "pending")
    .lt("created_at", new Date(now - FIRST_DELAY_MS).toISOString())
    .limit(100);

  if (error) return json({ error: error.message }, 500);
  if (!carts || carts.length === 0) return json({ ok: true, summary });

  for (const cart of carts) {
    summary.processed++;
    try {
      const createdAtMs = new Date(cart.created_at).getTime();
      const age = now - createdAtMs;

      // Hard expire
      if (age > EXPIRE_AFTER_MS) {
        await supabase.from("shop_abandoned_carts").update({ status: "expired" }).eq("id", cart.id);
        summary.expired++;
        continue;
      }

      // Make sure the product is still available
      const { data: product } = await supabase
        .from("shop_products")
        .select("id, name, brand, model, size, condition, price, status")
        .eq("id", cart.product_id)
        .maybeSingle();

      if (!product || product.status === "sold" || product.status === "archived") {
        await supabase.from("shop_abandoned_carts")
          .update({ status: product?.status === "sold" ? "sold_to_other" : "expired" })
          .eq("id", cart.id);
        continue;
      }

      // Determine which email to send
      const needsFirst = !cart.first_email_sent_at && age >= FIRST_DELAY_MS;
      const needsSecond = cart.first_email_sent_at && !cart.second_email_sent_at && age >= SECOND_DELAY_MS;
      if (!needsFirst && !needsSecond) {
        summary.skipped++;
        continue;
      }

      // Fetch the Stripe session to get the customer email (if entered)
      let customerEmail = cart.customer_email as string | null;
      let customerName = cart.customer_name as string | null;
      try {
        const session = await stripe.checkout.sessions.retrieve(cart.stripe_session_id);
        if (session.status === "complete" && session.payment_status === "paid") {
          // The webhook will (or did) mark this recovered; skip
          summary.skipped++;
          continue;
        }
        customerEmail = session.customer_details?.email || customerEmail;
        customerName = session.customer_details?.name || customerName;
      } catch (e) {
        console.warn("stripe session fetch failed", cart.stripe_session_id, e);
      }

      if (!customerEmail) {
        // No email captured yet — try again on the next cron pass. If nothing
        // by 72h, the expire branch will close it out.
        summary.skipped++;
        continue;
      }

      // Photo for the email
      let imageUrl: string | null = null;
      const { data: photos } = await supabase
        .from("shop_product_photos")
        .select("storage_path")
        .eq("product_id", product.id)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(1);
      const path = photos?.[0]?.storage_path;
      if (path) {
        const { data: signed } = await supabase.storage
          .from("shop-products")
          .createSignedUrl(path, 60 * 60 * 24 * 3);
        imageUrl = signed?.signedUrl ?? null;
      }

      const productName = [product.brand, product.model, product.name].filter(Boolean).join(" ") || product.name;
      const recoveryUrl = `${SITE_URL}/recover-cart?token=${cart.recovery_token}`;
      const attempt = needsSecond ? 2 : 1;

      const idempotencyKey = `shop-abandoned-${cart.id}-${attempt}`;
      const { data: sendData, error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "shop-abandoned-cart",
          recipientEmail: customerEmail,
          idempotencyKey,
          templateData: {
            customerName: customerName || undefined,
            productName,
            productSize: product.size || null,
            productCondition: product.condition || null,
            price: Number(product.price).toFixed(2),
            imageUrl,
            recoveryUrl,
            attempt,
          },
        },
      });

      if (sendErr) {
        console.error("abandoned-cart email failed", cart.id, sendErr);
        summary.errors++;
        continue;
      }

      const messageId = (sendData as any)?.message_id || null;
      const patch: Record<string, unknown> = { customer_email: customerEmail, customer_name: customerName };
      if (attempt === 1) {
        patch.first_email_sent_at = new Date().toISOString();
        patch.first_email_message_id = messageId;
        summary.first_sent++;
      } else {
        patch.second_email_sent_at = new Date().toISOString();
        patch.second_email_message_id = messageId;
        summary.second_sent++;
      }
      await supabase.from("shop_abandoned_carts").update(patch).eq("id", cart.id);
    } catch (e) {
      console.error("cart processing error", cart.id, e);
      summary.errors++;
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