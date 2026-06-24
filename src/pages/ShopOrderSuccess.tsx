import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Package, Truck, Tag, MapPin, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";

type StatusResp = {
  status: string;
  order_id?: string;
  order_number?: string;
  items?: any[];
  customer_email?: string;
  customer_name?: string;
  shipping_address?: any;
  shipping_method?: "standard" | "express";
  eta?: { min: string; max: string; label: string };
  amount_total_cents?: number;
  discount_cents?: number;
  promo_code?: string | null;
  currency?: string;
  error?: string;
};

function fmt(cents: number | undefined) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function ShopOrderSuccess() {
  const [search] = useSearchParams();
  const sessionId = search.get("session_id");
  const [data, setData] = useState<StatusResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const { refresh: refreshCart, clearPromo } = useCart();

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session reference.");
      return;
    }
    let stopped = false;
    async function load() {
      try {
        const { data: resp, error } = await supabase.functions.invoke("get-shop-order-status", {
          body: { sessionId },
        });
        if (error) throw new Error(error.message);
        if (stopped) return;
        setData(resp);
        if (resp?.status && resp.status !== "pending") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          // Cart was cleared server-side on payment — sync UI.
          refreshCart();
          clearPromo();
        }
      } catch (e: any) {
        if (!stopped) setError(e.message || "Couldn't load order");
      }
    }
    load();
    pollRef.current = window.setInterval(load, 3000);
    return () => {
      stopped = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const isPending = !data || data.status === "pending";
  const addr = data?.shipping_address?.address;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 pt-28 md:pt-32 pb-20 max-w-2xl">
        {error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h1 className="font-display text-2xl mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild><Link to="/shop">Back to shop</Link></Button>
          </div>
        ) : isPending ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-3" />
            <h1 className="font-display text-2xl md:text-3xl mb-2">Processing payment…</h1>
            <p className="text-muted-foreground text-sm">
              Hang tight — confirming your order with the bank. This usually takes just a few seconds.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
              <h1 className="font-display text-3xl md:text-4xl mb-1">Order confirmed</h1>
              <p className="text-muted-foreground">
                Order #{data!.order_number}
              </p>
            </div>

            {/* ETA hero */}
            <div className="rounded-xl border bg-emerald-50/60 border-emerald-200 p-5 mb-5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 text-xs uppercase tracking-wide font-medium mb-1">
                <Truck className="w-3.5 h-3.5" /> Estimated delivery
              </div>
              <p className="text-xl font-semibold text-emerald-950">
                {fmtDate(data?.eta?.min)} – {fmtDate(data?.eta?.max)}
              </p>
              <p className="text-xs text-emerald-800 mt-1">{data?.eta?.label}</p>
            </div>

            {/* Items */}
            <div className="rounded-xl border p-5 mb-4">
              <h2 className="font-medium text-sm flex items-center gap-1.5 mb-3">
                <Package className="w-4 h-4" /> Items
              </h2>
              <ul className="divide-y">
                {(data?.items ?? []).map((it: any, i: number) => (
                  <li key={i} className="py-2.5 flex justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{it.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[
                          it.type === "sneaker" ? "Sneaker" : "Accessory",
                          it.variant_name && it.variant_name !== "Default" ? it.variant_name : null,
                          it.sku ? `SKU ${it.sku}` : null,
                          it.size ? `Size ${it.size}` : null,
                          `Qty ${it.qty}`,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">{fmt(it.unit_price_cents * it.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Shipping address */}
            {addr && (
              <div className="rounded-xl border p-5 mb-4">
                <h2 className="font-medium text-sm flex items-center gap-1.5 mb-2">
                  <MapPin className="w-4 h-4" /> Shipping to
                </h2>
                <div className="text-sm text-foreground">
                  {data?.shipping_address?.name && <p>{data.shipping_address.name}</p>}
                  <p>{addr.line1}</p>
                  {addr.line2 && <p>{addr.line2}</p>}
                  <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                  <p>{addr.country}</p>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="rounded-xl border p-5 mb-6 text-sm">
              {data?.promo_code && (
                <div className="flex justify-between text-emerald-700">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Promo {data.promo_code}</span>
                  <span>−{fmt(data.discount_cents)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t font-semibold text-base">
                <span>Total charged</span>
                <span>{fmt(data?.amount_total_cents)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A receipt was sent to {data?.customer_email || "your email"}.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline"><Link to="/shop">Keep Browsing</Link></Button>
              <Button asChild><Link to={data?.order_id ? `/account/shop-orders/${data.order_id}` : "/account"}>View Order</Link></Button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}