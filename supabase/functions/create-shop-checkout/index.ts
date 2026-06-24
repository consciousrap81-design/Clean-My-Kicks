import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://cleanmykicks.com";
const RESERVE_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId ?? "");
    const sessionId = String(body.sessionId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(productId)) return json({ error: "Invalid product" }, 400);
    if (!sessionId || sessionId.length > 128) return json({ error: "Invalid session" }, 400);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: product, error } = await supabase
      .from("shop_products")
      .select("id, name, brand, model, size, condition, description, price, status, reserved_until, reserved_session_id")
      .eq("id", productId)
      .maybeSingle();

    if (error || !product) return json({ error: "Product not found" }, 404);

    const now = new Date();
    const stillReserved = product.reserved_until && new Date(product.reserved_until) > now;
    if (product.status === "sold") return json({ error: "Already sold" }, 409);
    if (product.status === "reserved" && stillReserved && product.reserved_session_id !== sessionId) {
      return json({ error: "Reserved by another buyer" }, 409);
    }
    if (product.status === "draft" || product.status === "archived") {
      return json({ error: "Not available" }, 409);
    }

    // Reserve
    const reservedUntil = new Date(now.getTime() + RESERVE_MINUTES * 60 * 1000).toISOString();
    await supabase
      .from("shop_products")
      .update({ status: "reserved", reserved_until: reservedUntil, reserved_session_id: sessionId })
      .eq("id", productId);

    const photoUrl = await firstPhotoUrl(supabase, productId);
    const displayName = [product.brand, product.model, product.name].filter(Boolean).join(" ").trim() || product.name;

    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(product.price) * 100),
          product_data: {
            name: displayName,
            description: [product.size ? `Size ${product.size}` : null, product.condition].filter(Boolean).join(" · ") || undefined,
            images: photoUrl ? [photoUrl] : undefined,
          },
        },
      }],
      success_url: `${SITE_URL}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/shop/${productId}?cancelled=1`,
      metadata: {
        shop_product_id: productId,
        reserved_session_id: sessionId,
        order_kind: "shop",
      },
    });

    return json({ url: stripeSession.url });
  } catch (e) {
    console.error("create-shop-checkout error", e);
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