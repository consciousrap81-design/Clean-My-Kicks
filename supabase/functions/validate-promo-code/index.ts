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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const cartId = String(body.cartId ?? "").trim();
    const codeInput = String(body.code ?? "").trim().toUpperCase();
    if (!/^[0-9a-f-]{36}$/i.test(cartId)) return json({ error: "Invalid cart" }, 400);
    if (!codeInput || codeInput.length > 40 || !/^[A-Z0-9_-]+$/.test(codeInput)) {
      return json({ error: "Enter a valid code" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: promo } = await supabase
      .from("shop_promo_codes")
      .select("*")
      .eq("code", codeInput)
      .eq("active", true)
      .maybeSingle();
    if (!promo) return json({ error: "Code not found or inactive" }, 404);
    if (promo.expires_at && new Date(promo.expires_at) <= new Date()) {
      return json({ error: "Code expired" }, 400);
    }
    if (promo.max_redemptions !== null && promo.redemption_count >= promo.max_redemptions) {
      return json({ error: "Code fully redeemed" }, 400);
    }

    const { data: items } = await supabase
      .from("shop_cart_items")
      .select("item_type, qty, unit_price_cents")
      .eq("cart_id", cartId);
    if (!items || !items.length) return json({ error: "Cart is empty" }, 400);

    const eligibleSubtotal = items
      .filter((i: any) =>
        promo.applies_to === "all" ||
        (promo.applies_to === "sneakers" && i.item_type === "sneaker") ||
        (promo.applies_to === "accessories" && i.item_type === "accessory"),
      )
      .reduce((s: number, i: any) => s + i.unit_price_cents * i.qty, 0);
    const totalSubtotal = items.reduce((s: number, i: any) => s + i.unit_price_cents * i.qty, 0);

    if (eligibleSubtotal === 0) {
      return json({ error: `This code applies to ${promo.applies_to} only` }, 400);
    }
    if (promo.min_subtotal_cents && totalSubtotal < promo.min_subtotal_cents) {
      return json({
        error: `Minimum subtotal $${(promo.min_subtotal_cents / 100).toFixed(2)} not met`,
      }, 400);
    }

    const discountCents = promo.discount_type === "percent"
      ? Math.floor((eligibleSubtotal * promo.amount) / 100)
      : Math.min(eligibleSubtotal, promo.amount);

    // Persist on the cart
    await supabase.from("shop_carts").update({ applied_promo_code: codeInput }).eq("id", cartId);

    return json({
      code: codeInput,
      discount_cents: discountCents,
      discount_type: promo.discount_type,
      amount: promo.amount,
      applies_to: promo.applies_to,
      description: promo.discount_type === "percent"
        ? `${promo.amount}% off${promo.applies_to !== "all" ? ` ${promo.applies_to}` : ""}`
        : `$${(promo.amount / 100).toFixed(2)} off${promo.applies_to !== "all" ? ` ${promo.applies_to}` : ""}`,
    });
  } catch (e) {
    console.error("validate-promo-code", e);
    return json({ error: (e as Error).message || "Server error" }, 500);
  }
});