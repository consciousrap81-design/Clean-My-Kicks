import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_RE = /^[A-Za-z0-9]{16,128}$/;
const SITE_URL = Deno.env.get("SITE_URL") || "https://cleanmykicks.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? "");
    const mode = body.mode === "deposit" ? "deposit" : "full";

    if (!TOKEN_RE.test(token)) {
      return json({ error: "Invalid request" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: quote, error } = await supabase
      .from("quotes")
      .select("id, status, customer_name, customer_email, shoe_brand, shoe_model, service_recommended, quote_amount, addons, deposit_amount, allow_deposit, payment_status")
      .eq("public_token", token)
      .maybeSingle();

    if (error || !quote) return json({ error: "Quote not found" }, 404);
    if (quote.status !== "accepted") return json({ error: "Quote must be accepted first" }, 409);
    if (quote.payment_status === "paid") return json({ error: "Already paid" }, 409);
    if (mode === "deposit" && !quote.allow_deposit) return json({ error: "Deposits not available on this quote" }, 400);

    const addonsTotal = (quote.addons as any[] | null ?? []).reduce((s, a) => s + Number(a?.price || 0), 0);
    const fullTotal = Number(quote.quote_amount) + addonsTotal;
    const deposit = Number(quote.deposit_amount || 0);

    let amountCents = 0;
    let label = "";
    if (mode === "deposit") {
      if (!(deposit > 0) || deposit > fullTotal) return json({ error: "Invalid deposit amount" }, 400);
      amountCents = Math.round(deposit * 100);
      label = "Deposit";
    } else {
      // full payment — minus any deposit already paid
      const { data: paid } = await supabase
        .from("payments")
        .select("amount")
        .eq("quote_id", quote.id)
        .eq("status", "succeeded");
      const alreadyPaid = (paid ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const remaining = fullTotal - alreadyPaid;
      if (remaining <= 0) return json({ error: "Nothing left to pay" }, 409);
      amountCents = Math.round(remaining * 100);
      label = alreadyPaid > 0 ? "Remaining Balance" : "Full Payment";
    }

    const shoe = [quote.shoe_brand, quote.shoe_model].filter(Boolean).join(" ") || "Sneaker Service";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: quote.customer_email || undefined,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `Clean My Kicks — ${label}`,
            description: `${shoe}${quote.service_recommended ? ` · ${quote.service_recommended}` : ""}`,
          },
        },
      }],
      success_url: `${SITE_URL}/quote/${token}?paid=1`,
      cancel_url: `${SITE_URL}/quote/${token}?cancelled=1`,
      metadata: {
        quote_id: quote.id,
        quote_token: token,
        payment_kind: mode === "deposit" ? "deposit" : (amountCents < Math.round(fullTotal * 100) ? "balance" : "full"),
        customer_email: quote.customer_email ?? "",
      },
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("create-checkout error", e);
    return json({ error: (e as Error).message || "Server error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}