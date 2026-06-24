import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

const SITE_URL = Deno.env.get("SITE_URL") || "https://cleanmykicks.com";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) return new Response("Not configured", { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed", err);
    return new Response(`Invalid signature: ${(err as Error).message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return new Response("ok", { status: 200 });

      const meta = session.metadata || {};
      const orderKind = meta.order_kind || (meta.quote_id ? "quote" : "");

      // ============= MULTI-ITEM SHOP CART PATH =============
      if (orderKind === "shop_cart") {
        const cartId = meta.cart_id;
        if (!cartId) return new Response("ok", { status: 200 });
        const email = (session.customer_details?.email || "").toLowerCase();
        const amount = (session.amount_total ?? 0) / 100;
        const currency = (session.currency ?? "usd").toLowerCase();
        const sessionId = session.id;
        const intentId = typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

        // Idempotency
        const { data: existingOrder } = await supabase
          .from("shop_orders")
          .select("id")
          .eq("stripe_session_id", sessionId)
          .maybeSingle();
        if (existingOrder) return new Response("ok", { status: 200 });

        // Load cart items
        const { data: cartItems } = await supabase
          .from("shop_cart_items")
          .select("*")
          .eq("cart_id", cartId);

        const sneakerIds = (cartItems ?? []).filter((i: any) => i.sneaker_product_id).map((i: any) => i.sneaker_product_id);
        const variantIds = (cartItems ?? []).filter((i: any) => i.accessory_variant_id).map((i: any) => i.accessory_variant_id);

        const [{ data: sneakers }, { data: variants }] = await Promise.all([
          sneakerIds.length
            ? supabase.from("shop_products").select("id, name, brand, model, size, condition, price").in("id", sneakerIds)
            : Promise.resolve({ data: [] }),
          variantIds.length
            ? supabase
                .from("shop_accessory_variants")
                .select("id, name, stock_qty, price_cents_override, shop_accessories(id, name, base_price_cents)")
                .in("id", variantIds)
            : Promise.resolve({ data: [] }),
        ]);
        const sneakerMap = new Map<string, any>();
        (sneakers ?? []).forEach((s: any) => sneakerMap.set(s.id, s));
        const variantMap = new Map<string, any>();
        (variants ?? []).forEach((v: any) => variantMap.set(v.id, v));

        const itemsSnapshot = (cartItems ?? []).map((it: any) => {
          if (it.item_type === "sneaker") {
            const s = sneakerMap.get(it.sneaker_product_id);
            return {
              type: "sneaker",
              product_id: it.sneaker_product_id,
              name: s ? [s.brand, s.model, s.name].filter(Boolean).join(" ") || s.name : "Sneaker",
              size: s?.size ?? null,
              condition: s?.condition ?? null,
              qty: 1,
              unit_price_cents: it.unit_price_cents,
            };
          }
          const v = variantMap.get(it.accessory_variant_id);
          const accName = v?.shop_accessories?.name ?? "Accessory";
          return {
            type: "accessory",
            variant_id: it.accessory_variant_id,
            accessory_id: v?.shop_accessories?.id ?? null,
            name: v?.name && v.name !== "Default" ? `${accName} — ${v.name}` : accName,
            qty: it.qty,
            unit_price_cents: it.unit_price_cents,
          };
        });

        // Provision auth user
        let userId: string | null = null;
        if (email) {
          const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
          const found = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
          if (found) {
            userId = found.id;
          } else {
            const { data: created } = await supabase.auth.admin.createUser({ email, email_confirm: true });
            userId = created?.user?.id ?? null;
          }
          if (userId) {
            await supabase.from("user_roles").insert({ user_id: userId, role: "customer" }).then(() => {}).catch(() => {});
          }
        }

        const shippingDetails = (session as any).shipping_details ?? (session as any).collected_information?.shipping_details ?? null;
        // Primary product_id: first sneaker if any, else null
        const primarySneakerId = sneakerIds[0] ?? null;

        const promoCode = (meta.promo_code || "").toUpperCase() || null;
        const promoId = meta.promo_id || null;
        const discountCents = Number(meta.discount_cents || 0);
        const shippingMethod = meta.shipping_method === "express" ? "express" : "standard";

        const { data: newOrder } = await supabase
          .from("shop_orders")
          .insert({
            product_id: primarySneakerId,
            product_snapshot: { items: itemsSnapshot, multi_item: true },
            user_id: userId,
            customer_email: email,
            customer_name: session.customer_details?.name || null,
            shipping_address: shippingDetails,
            amount,
            currency,
            status: "paid",
            stripe_session_id: sessionId,
            stripe_payment_intent: intentId,
            paid_at: new Date().toISOString(),
            discount_cents: discountCents,
            promo_code: promoCode,
            shipping_method: shippingMethod,
          })
          .select("id")
          .single();

        // Record promo redemption + increment counter
        if (promoId && newOrder?.id) {
          await supabase.from("shop_promo_redemptions").insert({
            promo_id: promoId,
            cart_id: cartId,
            order_id: newOrder.id,
          });
          const { data: cur } = await supabase
            .from("shop_promo_codes")
            .select("redemption_count")
            .eq("id", promoId)
            .maybeSingle();
          if (cur) {
            await supabase
              .from("shop_promo_codes")
              .update({ redemption_count: (cur.redemption_count ?? 0) + 1 })
              .eq("id", promoId);
          }
        }

        // Mark all sneakers in this cart as sold
        for (const sid of sneakerIds) {
          await supabase.from("shop_products").update({
            status: "sold",
            sold_at: new Date().toISOString(),
            sold_order_id: newOrder?.id ?? null,
            reserved_until: null,
            reserved_session_id: null,
          }).eq("id", sid);
        }

        // Decrement accessory stock per line
        for (const it of cartItems ?? []) {
          if (it.item_type !== "accessory") continue;
          const v = variantMap.get(it.accessory_variant_id);
          if (!v) continue;
          const newStock = Math.max(0, (v.stock_qty ?? 0) - it.qty);
          await supabase.from("shop_accessory_variants").update({ stock_qty: newStock }).eq("id", it.accessory_variant_id);
        }

        // Clear cart
        await supabase.from("shop_cart_items").delete().eq("cart_id", cartId);

        // Confirmation email
        if (email) {
          const firstItemName = itemsSnapshot[0]?.name ?? "your order";
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "shop-order-confirmation",
              recipientEmail: email,
              idempotencyKey: `shop-cart-${sessionId}`,
              templateData: {
                customerName: session.customer_details?.name || "",
                productName: itemsSnapshot.length === 1
                  ? firstItemName
                  : `${firstItemName} + ${itemsSnapshot.length - 1} more item${itemsSnapshot.length - 1 === 1 ? "" : "s"}`,
                productSize: null,
                productCondition: null,
                amount: amount.toFixed(2),
                orderUrl: `${SITE_URL}/account`,
              },
            },
          });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // ============= SHOP ORDER PATH =============
      if (orderKind === "shop") {
        const productId = meta.shop_product_id;
        if (!productId) return new Response("ok", { status: 200 });
        const email = (session.customer_details?.email || "").toLowerCase();
        const amount = (session.amount_total ?? 0) / 100;
        const currency = (session.currency ?? "usd").toLowerCase();
        const sessionId = session.id;
        const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

        // Idempotency
        const { data: existingOrder } = await supabase
          .from("shop_orders")
          .select("id")
          .eq("stripe_session_id", sessionId)
          .maybeSingle();
        if (existingOrder) return new Response("ok", { status: 200 });

        const { data: product } = await supabase
          .from("shop_products")
          .select("id, name, brand, model, size, condition, price")
          .eq("id", productId)
          .maybeSingle();

        const productSnapshot = product ?? { id: productId };
        const shippingDetails = (session as any).shipping_details ?? (session as any).collected_information?.shipping_details ?? null;

        // Provision user account (same as quotes flow)
        let userId: string | null = null;
        if (email) {
          const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
          const found = existing?.users?.find((u) => (u.email || "").toLowerCase() === email);
          if (found) {
            userId = found.id;
          } else {
            const { data: created } = await supabase.auth.admin.createUser({ email, email_confirm: true });
            userId = created?.user?.id ?? null;
          }
          if (userId) {
            await supabase.from("user_roles").insert({ user_id: userId, role: "customer" }).then(() => {}).catch(() => {});
          }
        }

        const { data: newOrder } = await supabase.from("shop_orders").insert({
          product_id: productId,
          product_snapshot: productSnapshot,
          user_id: userId,
          customer_email: email,
          customer_name: session.customer_details?.name || null,
          shipping_address: shippingDetails,
          amount,
          currency,
          status: "paid",
          stripe_session_id: sessionId,
          stripe_payment_intent: intentId,
          paid_at: new Date().toISOString(),
        }).select("id").single();

        // Mark product sold
        await supabase.from("shop_products").update({
          status: "sold",
          sold_at: new Date().toISOString(),
          sold_order_id: newOrder?.id ?? null,
          reserved_until: null,
          reserved_session_id: null,
        }).eq("id", productId);

        // Mark any matching abandoned-cart row as recovered (covers both
        // the original Stripe session and any recovery session we spawned).
        await supabase
          .from("shop_abandoned_carts")
          .update({
            status: "recovered",
            recovered_at: new Date().toISOString(),
            customer_email: email || null,
          })
          .or(`stripe_session_id.eq.${sessionId},last_recovery_session_id.eq.${sessionId}`)
          .eq("status", "pending");

        // Any other still-pending carts for this product can never be recovered now
        await supabase
          .from("shop_abandoned_carts")
          .update({ status: "sold_to_other" })
          .eq("product_id", productId)
          .eq("status", "pending");

        // Send confirmation email
        if (email) {
          const displayName = [
            (productSnapshot as any).brand,
            (productSnapshot as any).model,
            (productSnapshot as any).name,
          ].filter(Boolean).join(" ");
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "shop-order-confirmation",
              recipientEmail: email,
              idempotencyKey: `shop-order-${sessionId}`,
              templateData: {
                customerName: session.customer_details?.name || "",
                productName: displayName || (productSnapshot as any).name,
                productSize: (productSnapshot as any).size || null,
                productCondition: (productSnapshot as any).condition || null,
                amount: amount.toFixed(2),
                orderUrl: `${SITE_URL}/account`,
              },
            },
          });
        }

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // ============= QUOTE PAYMENT PATH =============
      const quoteId = meta.quote_id;
      const kind = (meta.payment_kind || "full") as "deposit" | "full" | "balance";
      const email = (session.customer_details?.email || meta.customer_email || "").toLowerCase();
      const amount = (session.amount_total ?? 0) / 100;
      const currency = (session.currency ?? "usd").toLowerCase();
      const sessionId = session.id;
      const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

      if (!quoteId) {
        console.error("Missing quote_id in session metadata");
        return new Response("ok", { status: 200 });
      }

      // 1. Provision/find auth user
      let userId: string | null = null;
      if (email) {
        const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = existing?.users?.find((u) => (u.email || "").toLowerCase() === email);
        if (found) {
          userId = found.id;
        } else {
          const { data: created, error: createErr } = await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
          });
          if (createErr) console.error("createUser error", createErr);
          userId = created?.user?.id ?? null;
        }
        if (userId) {
          // Assign 'customer' role
          await supabase.from("user_roles").insert({ user_id: userId, role: "customer" }).then(() => {}).catch(() => {});
          // Link all matching records
          await supabase.rpc("link_customer_user", { _email: email, _user_id: userId });
        }
      }

      // 2. Record payment (idempotent via stripe_session_id unique index)
      const { data: existingPay } = await supabase
        .from("payments")
        .select("id")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (!existingPay) {
        // Look up customer_id from quote
        const { data: q } = await supabase
          .from("quotes")
          .select("id, customer_email, request_id, quote_amount, addons, payment_status")
          .eq("id", quoteId)
          .maybeSingle();

        let customerId: string | null = null;
        if (q && email) {
          const { data: cust } = await supabase
            .from("customers")
            .select("id")
            .ilike("email", email)
            .maybeSingle();
          customerId = cust?.id ?? null;
        }

        await supabase.from("payments").insert({
          quote_id: quoteId,
          customer_id: customerId,
          user_id: userId,
          amount,
          currency,
          method: "stripe",
          status: "succeeded",
          kind,
          stripe_session_id: sessionId,
          stripe_payment_intent: intentId,
          paid_at: new Date().toISOString(),
        });

        // 3. Update quote payment_status
        if (q) {
          const fullTotal = Number(q.quote_amount) + ((q.addons as any[] | null) ?? []).reduce((s, a) => s + Number(a?.price || 0), 0);
          const { data: allPays } = await supabase
            .from("payments")
            .select("amount")
            .eq("quote_id", quoteId)
            .eq("status", "succeeded");
          const totalPaid = (allPays ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
          const newStatus = totalPaid >= fullTotal - 0.001 ? "paid" : (totalPaid > 0 ? "partial" : "unpaid");
          await supabase.from("quotes").update({ payment_status: newStatus, user_id: userId ?? undefined }).eq("id", quoteId);
        }
      }

      // 4. Send welcome / portal-access email (only first time)
      if (email && userId) {
        const { data: existingLog } = await supabase
          .from("email_send_log")
          .select("id")
          .eq("template_name", "customer-welcome")
          .eq("recipient_email", email)
          .limit(1);

        if (!existingLog || existingLog.length === 0) {
          // Generate password setup link
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: `${SITE_URL}/auth/set-password` },
          });
          const actionLink = linkData?.properties?.action_link || `${SITE_URL}/auth`;

          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "customer-welcome",
              recipientEmail: email,
              idempotencyKey: `welcome-${sessionId}`,
              templateData: {
                customerName: session.customer_details?.name || "",
                setupUrl: actionLink,
                portalUrl: `${SITE_URL}/account`,
              },
            },
          });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-webhook error", e);
    return new Response((e as Error).message, { status: 500 });
  }
});