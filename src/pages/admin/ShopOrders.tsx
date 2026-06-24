import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Package, Truck, Mail, MapPin, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function trackingUrlFor(carrier: string | null | undefined, tracking: string): string | undefined {
  if (!tracking) return undefined;
  const t = encodeURIComponent(tracking.trim());
  switch ((carrier || "").toLowerCase()) {
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
    case "ups":
      return `https://www.ups.com/track?tracknum=${t}`;
    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
    case "dhl":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${t}`;
    default:
      return undefined;
  }
}

async function sendShippedEmail(
  order: Order,
  carrier: string,
  tracking: string,
  forceNew = false,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const snap = order.product_snapshot || {};
    const productName =
      [snap.brand, snap.model].filter(Boolean).join(" ") || snap.name || "your sneakers";
    const origin = window.location.origin;
    const base = `shop-shipped-${order.id}-${tracking.trim()}`;
    const idempotencyKey = forceNew ? `${base}-resend-${Date.now()}` : base;
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "shop-order-shipped",
        recipientEmail: order.customer_email,
        idempotencyKey,
        templateData: {
          customerName: order.customer_name || undefined,
          productName,
          productSize: snap.size || null,
          carrier: carrier.trim() || undefined,
          trackingNumber: tracking.trim(),
          trackingUrl: trackingUrlFor(carrier, tracking.trim()),
          orderUrl: `${origin}/account`,
        },
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unknown error" };
  }
}

type Order = {
  id: string;
  product_id: string | null;
  product_snapshot: any;
  customer_email: string;
  customer_name: string | null;
  shipping_address: any;
  amount: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  refunded: "bg-slate-200 text-slate-700",
  cancelled: "bg-slate-200 text-slate-500 line-through",
};

const STATUS_FILTERS = ["all", "paid", "shipped", "delivered", "refunded", "cancelled"];

export default function ShopOrders() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-shop-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Order[];
    },
  });

  const filtered = useMemo(() => {
    let list = orders || [];
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((o) => {
        const snap = o.product_snapshot || {};
        return (
          o.customer_email.toLowerCase().includes(q) ||
          (o.customer_name || "").toLowerCase().includes(q) ||
          (o.tracking_number || "").toLowerCase().includes(q) ||
          (snap.name || "").toLowerCase().includes(q) ||
          (snap.brand || "").toLowerCase().includes(q) ||
          (snap.model || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [orders, statusFilter, search]);

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-display tracking-wide">Shop Orders</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search email, name, tracking, product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading orders…</CardContent></Card>
      )}
      {!isLoading && filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No orders {statusFilter === "all" ? "yet" : `with status "${statusFilter}"`}.
        </CardContent></Card>
      )}

      <div className="grid gap-3">
        {filtered.map((o) => {
          const snap = o.product_snapshot || {};
          const display = [snap.brand, snap.model].filter(Boolean).join(" ") || snap.name || "Shop item";
          return (
            <Card key={o.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setEditing(o)}>
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{display}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                    {snap.size && <span>Size {snap.size}</span>}
                    <span>· {o.customer_name || o.customer_email}</span>
                    <span>· {format(new Date(o.created_at), "MMM d, yyyy h:mma")}</span>
                  </div>
                  {o.tracking_number && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {o.tracking_carrier || "Tracking"}: {o.tracking_number}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold">${Number(o.amount).toFixed(2)}</div>
                  <Badge variant="secondary" className={STATUS_STYLES[o.status] || ""}>{o.status}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <OrderDialog
        order={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-shop-orders"] });
          setEditing(null);
        }}
      />
    </div>
  );
}

function OrderDialog({
  order, onClose, onSaved,
}: {
  order: Order | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [status, setStatus] = useState("paid");
  const [saving, setSaving] = useState(false);

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      setCarrier(order.tracking_carrier || "USPS");
      setTracking(order.tracking_number || "");
      setStatus(order.status);
    }
  }, [order]);

  if (!order) return null;
  const snap = order.product_snapshot || {};
  const display = [snap.brand, snap.model].filter(Boolean).join(" ") || snap.name || "Shop item";
  const addr = order.shipping_address || {};
  const line1 = addr.line1 || addr.address?.line1;
  const line2 = addr.line2 || addr.address?.line2;
  const city = addr.city || addr.address?.city;
  const state = addr.state || addr.address?.state;
  const postal = addr.postal_code || addr.address?.postal_code;
  const country = addr.country || addr.address?.country;
  const recipient = addr.name || order.customer_name;

  async function markShipped() {
    if (!tracking.trim()) {
      toast.error("Enter a tracking number");
      return;
    }
    setSaving(true);
    const shippedAt = new Date().toISOString();
    const { error } = await supabase
      .from("shop_orders")
      .update({
        status: "shipped",
        tracking_carrier: carrier.trim() || null,
        tracking_number: tracking.trim(),
        shipped_at: shippedAt,
      })
      .eq("id", order!.id);
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    const sent = await sendShippedEmail(order!, carrier, tracking);
    if (sent.ok) toast.success("Marked shipped — tracking email sent");
    else toast.warning("Marked shipped, but email failed to send", { description: sent.error });

    setSaving(false);
    onSaved();
  }

  async function resendShipped() {
    if (!tracking.trim()) {
      toast.error("Enter a tracking number before resending");
      return;
    }
    setSaving(true);
    const sent = await sendShippedEmail(order!, carrier, tracking, true);
    setSaving(false);
    if (sent.ok) toast.success(`Resent to ${order!.customer_email}`);
    else toast.error("Failed to resend email", { description: sent.error });
  }

  async function saveStatus() {
    setSaving(true);
    const patch: any = { status };
    if (status !== "shipped") {
      // allow keeping tracking but only stamp shipped_at on shipped
    }
    if (tracking.trim()) {
      patch.tracking_number = tracking.trim();
      patch.tracking_carrier = carrier.trim() || null;
    }
    const { error } = await supabase.from("shop_orders").update(patch).eq("id", order!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    onSaved();
  }

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{display}</DialogTitle>
          <DialogDescription>
            Order placed {format(new Date(order.created_at), "PPp")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={STATUS_STYLES[order.status] || ""}>{order.status}</Badge>
            <div className="font-semibold">${Number(order.amount).toFixed(2)} {order.currency?.toUpperCase()}</div>
          </div>

          <div className="rounded-md border p-3 space-y-1">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Item</div>
            <div className="font-medium">{display}</div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
              {snap.size && <span>Size {snap.size}</span>}
              {snap.condition && <span>· {snap.condition}</span>}
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-1">
            <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <Mail className="w-3 h-3" /> Customer
            </div>
            <div>{order.customer_name || "—"}</div>
            <div className="text-muted-foreground">{order.customer_email}</div>
          </div>

          {(line1 || city) && (
            <div className="rounded-md border p-3 space-y-1">
              <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Ship to
              </div>
              {recipient && <div>{recipient}</div>}
              {line1 && <div>{line1}</div>}
              {line2 && <div>{line2}</div>}
              <div>{[city, state, postal].filter(Boolean).join(", ")}</div>
              {country && <div>{country}</div>}
            </div>
          )}

          <div className="rounded-md border p-3 space-y-3">
            <div className="text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <Truck className="w-3 h-3" /> Shipping
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label className="text-xs">Carrier</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger><SelectValue placeholder="USPS" /></SelectTrigger>
                  <SelectContent>
                    {["USPS", "UPS", "FedEx", "DHL", "Other"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Tracking number</Label>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="9400…" />
              </div>
            </div>
            {order.shipped_at && (
              <div className="text-xs text-muted-foreground">
                Shipped {format(new Date(order.shipped_at), "PPp")}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["paid", "shipped", "delivered", "refunded", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {order.stripe_payment_intent && (
            <a
              href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
            >
              View in Stripe <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
          <Button variant="outline" onClick={saveStatus} disabled={saving}>Save changes</Button>
          {order.status === "shipped" ? (
            <Button onClick={resendShipped} disabled={saving || !tracking.trim()}>
              <Send className="w-4 h-4 mr-1" /> Resend email
            </Button>
          ) : (
            <Button onClick={markShipped} disabled={saving || !tracking.trim()}>
              <Truck className="w-4 h-4 mr-1" /> Mark shipped
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}