import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, Package, MapPin, ExternalLink, History, Send, Pencil, RotateCcw, Mail, CheckCircle2 } from "lucide-react";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { trackingUrlFor, carrierLabel } from "@/lib/tracking";
import { useEffect, useState } from "react";
import WriteReviewDialog from "@/components/shop/WriteReviewDialog";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  refunded: "bg-slate-200 text-slate-700",
  cancelled: "bg-slate-200 text-slate-500 line-through",
};

const STATUS_COPY: Record<string, string> = {
  pending: "We've received your order and are getting things ready.",
  paid: "Payment received. We're packing your pair.",
  shipped: "Your sneakers are on the way!",
  delivered: "Delivered. Enjoy your kicks!",
  refunded: "This order was refunded.",
  cancelled: "This order was cancelled.",
};

const EVENT_ICONS: Record<string, { icon: typeof Truck; cls: string }> = {
  shipped: { icon: Truck, cls: "bg-blue-100 text-blue-700" },
  email_resent: { icon: Send, cls: "bg-emerald-100 text-emerald-700" },
  email_failed: { icon: Mail, cls: "bg-red-100 text-red-700" },
  tracking_updated: { icon: Pencil, cls: "bg-amber-100 text-amber-800" },
  status_changed: { icon: RotateCcw, cls: "bg-slate-200 text-slate-700" },
};

// Customer-facing labels — internal action names are hidden.
const EVENT_LABELS: Record<string, string> = {
  shipped: "Shipped",
  email_resent: "Shipping update sent",
  tracking_updated: "Tracking updated",
  status_changed: "Status updated",
};

export default function ShopOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    if (search.get("review") === "1") setReviewOpen(true);
  }, [search]);

  const { data: order, isLoading } = useQuery({
    queryKey: ["customer-shop-order", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_orders")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["customer-shop-order-events", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_order_events")
        .select("id, event_type, message, metadata, created_at")
        .eq("order_id", id!)
        .in("event_type", ["shipped", "email_resent", "tracking_updated", "status_changed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (!order) {
    return (
      <div className="space-y-3">
        <Link to="/account" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Order not found.</CardContent></Card>
      </div>
    );
  }

  const snap = order.product_snapshot as any || {};
  const display = [snap.brand, snap.model].filter(Boolean).join(" ") || snap.name || "Your sneakers";
  const addr = (order.shipping_address as any) || {};
  const line1 = addr.line1 || addr.address?.line1;
  const line2 = addr.line2 || addr.address?.line2;
  const city = addr.city || addr.address?.city;
  const state = addr.state || addr.address?.state;
  const postal = addr.postal_code || addr.address?.postal_code;
  const country = addr.country || addr.address?.country;
  const recipient = addr.name || order.customer_name;

  const trackUrl = order.tracking_number
    ? trackingUrlFor(order.tracking_carrier, order.tracking_number)
    : undefined;
  const carrierName = carrierLabel(order.tracking_carrier, order.tracking_number ?? undefined);

  return (
    <div className="space-y-4">
      <Link to="/account" className="text-sm text-primary inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-display tracking-wide">{display}</h1>
        <p className="text-xs text-muted-foreground">
          Ordered {format(new Date(order.created_at), "PPp")}
        </p>
      </header>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Badge variant="secondary" className={STATUS_STYLES[order.status] || ""}>
              {order.status}
            </Badge>
            <div className="font-semibold">
              ${Number(order.amount).toFixed(2)} {order.currency?.toUpperCase()}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{STATUS_COPY[order.status] || ""}</p>
        </CardContent>
      </Card>

      {(order.status === "shipped" || order.status === "delivered") && order.product_id && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-orange-500" />
              <span>Loving them? Help other shoppers — leave a quick review.</span>
            </div>
            <Button size="sm" onClick={() => setReviewOpen(true)}>Write a review</Button>
          </CardContent>
        </Card>
      )}

      {order.tracking_number && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <Truck className="w-3 h-3" /> Shipping
            </div>
            <div className="text-sm">
              <span className="font-medium">{carrierName || "Tracking"}</span>
              <span className="text-muted-foreground"> · </span>
              <span className="font-mono">{order.tracking_number}</span>
            </div>
            {order.shipped_at && (
              <div className="text-xs text-muted-foreground">
                Shipped {format(new Date(order.shipped_at), "PPp")}
              </div>
            )}
            {trackUrl && (
              <Button asChild size="sm" className="mt-1">
                <a href={trackUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" /> Track package
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1">
            <Package className="w-3 h-3" /> Item
          </div>
          <div className="font-medium">{display}</div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
            {snap.size && <span>Size {snap.size}</span>}
            {snap.condition && <span>· {snap.condition}</span>}
          </div>
        </CardContent>
      </Card>

      {(line1 || city) && (
        <Card>
          <CardContent className="p-4 space-y-0.5">
            <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Ship to
            </div>
            {recipient && <div className="text-sm">{recipient}</div>}
            {line1 && <div className="text-sm">{line1}</div>}
            {line2 && <div className="text-sm">{line2}</div>}
            <div className="text-sm">{[city, state, postal].filter(Boolean).join(", ")}</div>
            {country && <div className="text-sm">{country}</div>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1">
            <History className="w-3 h-3" /> Timeline
          </div>
          {(events ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No updates yet. We'll post here when there's news.
            </div>
          ) : (
            <ol className="space-y-3">
              {events!.map((ev: any) => {
                const cfg = EVENT_ICONS[ev.event_type] || { icon: CheckCircle2, cls: "bg-slate-200 text-slate-700" };
                const Icon = cfg.icon;
                const m = ev.metadata || {};
                const label = EVENT_LABELS[ev.event_type] || "Update";
                const url =
                  m.tracking_url ||
                  (m.tracking_number ? trackingUrlFor(m.carrier ?? m.carrier_to, m.tracking_number) : undefined) ||
                  (m.tracking_to ? trackingUrlFor(m.carrier_to, m.tracking_to) : undefined);
                return (
                  <li key={ev.id} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.cls}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {format(new Date(ev.created_at), "PPp")}
                      </div>
                      {(m.carrier || m.tracking_number || m.tracking_to) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[
                            m.carrier || m.carrier_to,
                            m.tracking_number || m.tracking_to,
                          ].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" /> Track
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {order.product_id && (
        <WriteReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          productId={order.product_id}
          productName={display}
          defaultName={order.customer_name || undefined}
        />
      )}
    </div>
  );
}