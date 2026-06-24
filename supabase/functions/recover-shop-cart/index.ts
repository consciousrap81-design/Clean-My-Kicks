import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://cleanmykicks.com";
const RESERVE_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "Invalid token" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cart, error: cartErr } = await supabase
      .from("shop_abandoned_carts")
      .select("*")
      .eq("recovery_token", token)
      .maybeSingle();

    if (cartErr || !cart) return json({ error: "Recovery link not found" }, 404);

    if (cart.status === "recovered") {
      return json({ status: "recovered", redirect: `${SITE_URL}/account` });
    }

    const { data: product, error: productErr } = await supabase
      .from("shop_products")
      .select("id, name, brand, model, size, condition, price, status, reserved_until, reserved_session_id")
      .eq("id", cart.product_id)
      .maybeSingle();

    if (productErr || !product) {
      return json({ status: "unavailable", redirect: `${SITE_URL}/shop` });
    }

    if (product.status === "sold") {
      await supabase
        .from("shop_abandoned_carts")
        .update({ status: "sold_to_other" })
        .eq("id", cart.id)
        .eq("status", "pending");
      return json({
        status: "sold",
        redirect: `${SITE_URL}/shop?sold=${product.id}`,
      });
    }

    const now = new Date();
    const stillReservedToOther =
      product.status === "reserved" &&
      product.reserved_until &&
      new Date(product.reserved_until) > now &&
      product.reserved_session_id !== cart.reserved_session_id;

    if (stillReservedToOther) {
      return json({
        status: "reserved_by_other",
        redirect: `${SITE_URL}/shop/${product.id}?busy=1`,
      });
    }

    // Re-reserve under the original browser session id so the product page state stays consistent
    const reservedUntil = new Date(now.getTime() + RESERVE_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from("shop_products")
      .update({
        status: "reserved",
        reserved_until: reservedUntil,
        reserved_session_id: cart.reserved_session_id,
      })
      .eq("id", product.id);

    const photoUrl = await firstPhotoUrl(supabase, product.id);
    const displayName =
      [product.brand, product.model, product.name].filter(Boolean).join(" ").trim() || product.name;

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      customer_email: cart.customer_email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(product.price) * 100),
          product_data: {
            name: displayName,
            description:
              [product.size ? `Size ${product.size}` : null, product.condition]
                .filter(Boolean).join(" · ") || undefined,
            images: photoUrl ? [photoUrl] : undefined,
          },
        },
      }],
      success_url: `${SITE_URL}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/shop/${product.id}?cancelled=1`,
      metadata: {
        shop_product_id: product.id,
        reserved_session_id: cart.reserved_session_id,
        order_kind: "shop",
        abandoned_cart_id: cart.id,
        recovery_token: token,
      },
    });

    await supabase
      .from("shop_abandoned_carts")
      .update({ last_recovery_session_id: stripeSession.id })
      .eq("id", cart.id);

    return json({ status: "ok", redirect: stripeSession.url });
  } catch (e) {
    console.error("recover-shop-cart error", e);
    return json({ error: (e as Error).message || "Server error" }, 500);
  }
});

async function firstPhotoUrl(supabase: any, productId: string): Promise<string | null> {
  const { data: photos } = await supabase
    .from("shop_product_photos")
    .select("storage_path")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(1);
  const path = photos?.[0]?.storage_path;
  if (!path) return null;
  const { data: signed } = await supabase.storage.from("shop-products").createSignedUrl(path, 60 * 60 * 24);
  return signed?.signedUrl ?? null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}