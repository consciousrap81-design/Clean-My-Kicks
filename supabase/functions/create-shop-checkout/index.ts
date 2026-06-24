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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ============= MULTI-ITEM CART PATH =============
    const cartId = typeof body.cartId === "string" ? body.cartId : "";
    if (cartId) {
      if (!/^[0-9a-f-]{36}$/i.test(cartId)) return json({ error: "Invalid cart" }, 400);
      return await handleCartCheckout(stripe, supabase, cartId, req);
    }

    // ============= LEGACY SINGLE-PRODUCT PATH =============
    const productId = String(body.productId ?? "");
    const sessionId = String(body.sessionId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(productId)) return json({ error: "Invalid product" }, 400);
    if (!sessionId || sessionId.length > 128) return json({ error: "Invalid session" }, 400);

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

    // Track this as a potential abandoned cart. We don't have the email yet —
    // the queue processor will pull it from Stripe later if abandonment occurs.
    await supabase.from("shop_abandoned_carts").insert({
      product_id: productId,
      stripe_session_id: stripeSession.id,
      reserved_session_id: sessionId,
      status: "pending",
    });

    return json({ url: stripeSession.url });
  } catch (e) {
    console.error("create-shop-checkout error", e);
    return json({ error: (e as Error).message || "Server error" }, 500);
  }
});

async function handleCartCheckout(stripe: Stripe, supabase: any, cartId: string, req: Request) {
  // Load cart items
  const { data: items } = await supabase
    .from("shop_cart_items")
    .select("*")
    .eq("cart_id", cartId);
  if (!items || !items.length) return json({ error: "Cart is empty" }, 400);

  const now = new Date();
  const lineItems: any[] = [];
  const itemSnapshots: any[] = [];

  // Validate sneakers
  const sneakerIds = items.filter((i: any) => i.sneaker_product_id).map((i: any) => i.sneaker_product_id);
  const variantIds = items.filter((i: any) => i.accessory_variant_id).map((i: any) => i.accessory_variant_id);

  const [sneakerRes, variantRes] = await Promise.all([
    sneakerIds.length
      ? supabase
          .from("shop_products")
          .select("id, name, brand, model, size, condition, price, status, reserved_until, reserved_session_id, shop_product_photos(storage_path, is_primary, sort_order)")
          .in("id", sneakerIds)
      : Promise.resolve({ data: [] }),
    variantIds.length
      ? supabase
          .from("shop_accessory_variants")
          .select("id, name, stock_qty, active, price_cents_override, shop_accessories!inner(id, name, base_price_cents, active, shop_accessory_photos(storage_path, sort_order))")
          .in("id", variantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const sneakerMap = new Map<string, any>();
  (sneakerRes.data ?? []).forEach((s: any) => sneakerMap.set(s.id, s));
  const variantMap = new Map<string, any>();
  (variantRes.data ?? []).forEach((v: any) => variantMap.set(v.id, v));

  for (const it of items as any[]) {
    if (it.item_type === "sneaker") {
      const s = sneakerMap.get(it.sneaker_product_id);
      if (!s) return json({ error: "An item in your cart was removed" }, 409);
      if (s.status === "sold") return json({ error: `${s.name} is sold` }, 409);
      const stillReserved = s.reserved_until && new Date(s.reserved_until) > now;
      if (stillReserved && s.reserved_session_id !== cartId) {
        return json({ error: `${s.name} was reserved by another buyer` }, 409);
      }
      const display = [s.brand, s.model, s.name].filter(Boolean).join(" ").trim() || s.name;
      const photoUrl = await firstSneakerPhotoUrl(supabase, s);
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(s.price) * 100),
          product_data: {
            name: display,
            description: [s.size ? `Size ${s.size}` : null, s.condition].filter(Boolean).join(" · ") || undefined,
            images: photoUrl ? [photoUrl] : undefined,
          },
        },
      });
      itemSnapshots.push({
        type: "sneaker",
        product_id: s.id,
        name: display,
        size: s.size,
        condition: s.condition,
        qty: 1,
        unit_price_cents: Math.round(Number(s.price) * 100),
      });
    } else if (it.item_type === "accessory") {
      const v = variantMap.get(it.accessory_variant_id);
      if (!v || !v.active || !v.shop_accessories?.active) {
        return json({ error: "An accessory in your cart is unavailable" }, 409);
      }
      if (v.stock_qty < it.qty) {
        return json({ error: `Only ${v.stock_qty} of ${v.shop_accessories.name} in stock` }, 409);
      }
      const unitCents = v.price_cents_override ?? v.shop_accessories.base_price_cents;
      const display = v.name && v.name !== "Default"
        ? `${v.shop_accessories.name} — ${v.name}`
        : v.shop_accessories.name;
      const photoUrl = await firstAccessoryPhotoUrl(supabase, v.shop_accessories);
      lineItems.push({
        quantity: it.qty,
        price_data: {
          currency: "usd",
          unit_amount: unitCents,
          product_data: {
            name: display,
            images: photoUrl ? [photoUrl] : undefined,
          },
        },
      });
      itemSnapshots.push({
        type: "accessory",
        variant_id: v.id,
        accessory_id: v.shop_accessories.id,
        name: display,
        qty: it.qty,
        unit_price_cents: unitCents,
      });
    }
  }

  // Refresh reservations on sneakers in cart for another 15 minutes
  const reservedUntil = new Date(now.getTime() + RESERVE_MINUTES * 60 * 1000).toISOString();
  for (const sid of sneakerIds) {
    await supabase
      .from("shop_products")
      .update({ status: "reserved", reserved_until: reservedUntil, reserved_session_id: cartId })
      .eq("id", sid);
  }

  const stripeSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    shipping_address_collection: { allowed_countries: ["US"] },
    phone_number_collection: { enabled: true },
    line_items: lineItems,
    success_url: `${SITE_URL}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/shop?cancelled=1`,
    metadata: {
      cart_id: cartId,
      reserved_session_id: cartId,
      order_kind: "shop_cart",
      items_summary: JSON.stringify(itemSnapshots).slice(0, 480),
    },
    payment_intent_data: {
      metadata: { cart_id: cartId, order_kind: "shop_cart" },
    },
  });

  return json({ url: stripeSession.url });
}

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

async function firstSneakerPhotoUrl(supabase: any, sneaker: any): Promise<string | null> {
  const photos = (sneaker.shop_product_photos ?? []).slice().sort(
    (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
  );
  const path = photos[0]?.storage_path;
  if (!path) return null;
  const { data: signed } = await supabase.storage.from("shop-products").createSignedUrl(path, 60 * 60 * 24);
  return signed?.signedUrl ?? null;
}

async function firstAccessoryPhotoUrl(supabase: any, accessory: any): Promise<string | null> {
  const photos = (accessory.shop_accessory_photos ?? []).slice().sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  );
  const path = photos[0]?.storage_path;
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