import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Minus, Plus, Trash2, ShoppingBag, Clock, AlertTriangle, Link2, Check, RefreshCw, Truck, Tag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { signedPhotoUrls } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function useReservationTimer(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return { label: null as string | null, expired: false, warning: false };
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return { label: "expired", expired: true, warning: false };
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return {
    label: `${m}:${s.toString().padStart(2, "0")}`,
    expired: false,
    warning: ms < 2 * 60 * 1000, // < 2 min
  };
}

function estimatedDelivery() {
  // Mirror Stripe shipping_options ranges. Business days from "now" rounded out.
  function addBusinessDays(days: number) {
    const d = new Date();
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  }
  const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return {
    standard: `${fmtDate(addBusinessDays(5))} – ${fmtDate(addBusinessDays(7))}`,
    express: `${fmtDate(addBusinessDays(1))} – ${fmtDate(addBusinessDays(3))}`,
  };
}

export default function CartDrawer() {
  const {
    open, setOpen, items, totalCents, loading, updateQty, removeItem, refresh, cartId, addSneaker,
    promo, applyPromo, clearPromo, shippingMethod, setShippingMethod,
  } = useCart();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reReserving, setReReserving] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);

  // Resolve photo signed URLs (both shop-products and accessory photos live in shop-products bucket).
  useEffect(() => {
    const paths = items.map((it) => it.photo_path).filter(Boolean) as string[];
    if (!paths.length) return;
    signedPhotoUrls(paths).then(setUrls);
  }, [items]);

  // Auto-refresh when drawer opens (in case stock/reservations changed).
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  // Auto-refresh every 5s while drawer open so expired reservations flip state.
  useEffect(() => {
    if (!open) return;
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, [open, refresh]);

  // Soonest sneaker reservation expiry from our perspective
  const soonestReserve =
    items
      .filter((it) => it.item_type === "sneaker" && it.reserved_until && it.available)
      .map((it) => it.reserved_until!)
      .sort()[0] ?? null;
  const timer = useReservationTimer(soonestReserve);
  const hasExpiredSneaker = items.some((it) => it.item_type === "sneaker" && it.reservation_expired);

  const canCheckout = items.length > 0 && items.every((it) => it.available);
  const hasOutOfStock = items.some((it) => !it.available && it.item_type === "accessory");
  const eta = estimatedDelivery();
  const subtotal = totalCents;
  const standardCents = subtotal >= 10000 ? 0 : 800;
  const expressCents = 2500;
  const selectedShippingCents = shippingMethod === "express" ? expressCents : standardCents;
  const discountCents = promo?.discount_cents ?? 0;
  const grandTotal = Math.max(0, subtotal - discountCents) + selectedShippingCents;
  const remainingForFreeShip = Math.max(0, 10000 - subtotal);
  const freeShipUnlocked = subtotal >= 10000;

  async function handleCheckout() {
    if (!canCheckout) return;
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-shop-checkout", {
        body: {
          cartId,
          promoCode: promo?.code ?? undefined,
          shippingMethod,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Could not start checkout");
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout");
      setCheckingOut(false);
    }
  }

  async function handleApplyPromo(e?: React.FormEvent) {
    e?.preventDefault();
    if (!promoInput.trim()) return;
    setApplyingPromo(true);
    const res = await applyPromo(promoInput);
    setApplyingPromo(false);
    if (!res.ok) {
      toast.error(res.error || "Couldn't apply code");
    } else {
      toast.success("Promo applied");
      setPromoInput("");
    }
  }

  async function copyResumeLink() {
    const url = `${window.location.origin}/shop?resumeCart=${cartId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied — paste it anywhere to come back to this cart");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy. URL: " + url);
    }
  }

  async function reReserve(item: typeof items[number]) {
    if (!item.sneaker_product_id) return;
    setReReserving(item.id);
    const res = await addSneaker(item.sneaker_product_id, item.unit_price_cents);
    setReReserving(null);
    if (!res.ok) toast.error(res.error || "Couldn't re-reserve — may have been taken");
    else toast.success("Re-reserved for 15 minutes");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Your cart
          </SheetTitle>
        </SheetHeader>

        {/* Reservation countdown banner */}
        {(timer.label || hasExpiredSneaker) && (
          <div
            className={`px-5 py-2.5 border-b text-sm flex items-center gap-2 ${
              hasExpiredSneaker
                ? "bg-destructive/10 text-destructive"
                : timer.warning
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : "bg-primary/5 text-foreground"
            }`}
            role="status"
            aria-live="polite"
          >
            {hasExpiredSneaker ? (
              <>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Sneaker reservation expired. Re-reserve below to keep checking out.</span>
              </>
            ) : (
              <>
                <Clock className={`w-4 h-4 shrink-0 ${timer.warning ? "text-amber-700" : "text-primary"}`} />
                <span>
                  Sneaker held for{" "}
                  <span className="font-mono font-bold tabular-nums">{timer.label}</span>
                </span>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your cart is empty.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => {
                const img = it.photo_path ? urls[it.photo_path] : null;
                const isSneaker = it.item_type === "sneaker";
                return (
                  <li key={it.id} className="py-3 flex gap-3">
                    <div className="w-16 h-16 rounded-md bg-secondary overflow-hidden shrink-0">
                      {img && <img src={img} alt={it.display_name} className="w-full h-full object-contain p-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{it.display_name}</p>
                          {it.variant_name && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{it.variant_name}</span>
                              {it.sku && <span className="ml-1.5 text-muted-foreground">· SKU {it.sku}</span>}
                            </p>
                          )}
                          {!it.variant_name && it.subtitle && (
                            <p className="text-xs text-muted-foreground">{it.subtitle}</p>
                          )}
                          {!it.available && it.unavailable_reason && (
                            <p className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {it.unavailable_reason}
                            </p>
                          )}
                          {!isSneaker && it.available && typeof it.max_qty === "number" && it.max_qty > 0 && it.max_qty <= 3 && (
                            <p className="text-[11px] text-amber-700 mt-0.5">Only {it.max_qty} left in stock</p>
                          )}
                          {!isSneaker && !it.available && typeof it.max_qty === "number" && it.max_qty > 0 && it.qty > it.max_qty && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs mt-1.5"
                              onClick={() => updateQty(it.id, it.max_qty!)}
                            >
                              Set qty to max ({it.max_qty})
                            </Button>
                          )}
                          {isSneaker && it.reservation_expired && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs mt-1.5"
                              onClick={() => reReserve(it)}
                              disabled={reReserving === it.id}
                            >
                              {reReserving === it.id ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3 mr-1" />
                              )}
                              Re-reserve
                            </Button>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(it.id)}
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive p-1 -m-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        {isSneaker ? (
                          <span className="text-xs text-muted-foreground">1 of 1 pair</span>
                        ) : (
                          <div className="inline-flex items-center border rounded-md">
                            <button
                              onClick={() => updateQty(it.id, it.qty - 1)}
                              className="px-2 py-1 hover:bg-secondary disabled:opacity-30"
                              disabled={it.qty <= 1}
                              aria-label="Decrease"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-sm w-6 text-center">{it.qty}</span>
                            <button
                              onClick={() => updateQty(it.id, it.qty + 1)}
                              className="px-2 py-1 hover:bg-secondary disabled:opacity-30"
                              disabled={!!it.max_qty && it.qty >= it.max_qty}
                              aria-label="Increase"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <span className="text-sm font-semibold">{fmt(it.unit_price_cents * it.qty)}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t px-5 py-4 space-y-3">
            {/* Promo code */}
            {promo ? (
              <div className="flex items-center justify-between rounded-lg border bg-emerald-50/60 border-emerald-200 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-emerald-900 truncate">{promo.code}</p>
                    <p className="text-[11px] text-emerald-800 truncate">{promo.description}</p>
                  </div>
                </div>
                <button
                  onClick={clearPromo}
                  className="text-emerald-800 hover:text-emerald-900 p-1"
                  aria-label="Remove promo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <Input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Promo code"
                  className="h-9 text-sm"
                  maxLength={40}
                  autoCapitalize="characters"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  disabled={!promoInput.trim() || applyingPromo}
                >
                  {applyingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                </Button>
              </form>
            )}

            {/* Shipping method picker */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Truck className="w-3.5 h-3.5" /> Shipping method
              </div>
              <RadioGroup
                value={shippingMethod}
                onValueChange={(v) => setShippingMethod(v as "standard" | "express")}
                className="space-y-1.5"
              >
                <Label
                  htmlFor="ship-standard"
                  className="flex items-start gap-2 cursor-pointer rounded-md p-2 hover:bg-secondary/60 has-[:checked]:bg-secondary"
                >
                  <RadioGroupItem value="standard" id="ship-standard" className="mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>Standard</span>
                      <span>{standardCents === 0 ? "Free" : fmt(standardCents)}</span>
                    </div>
                    <p className="text-muted-foreground">Arrives {eta.standard}</p>
                  </div>
                </Label>
                <Label
                  htmlFor="ship-express"
                  className="flex items-start gap-2 cursor-pointer rounded-md p-2 hover:bg-secondary/60 has-[:checked]:bg-secondary"
                >
                  <RadioGroupItem value="express" id="ship-express" className="mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>Express</span>
                      <span>{fmt(expressCents)}</span>
                    </div>
                    <p className="text-muted-foreground">Arrives {eta.express}</p>
                  </div>
                </Label>
              </RadioGroup>
              {freeShipUnlocked ? (
                <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Free standard shipping unlocked
                </p>
              ) : (
                <div>
                  <div className="h-1 bg-secondary rounded overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (subtotal / 10000) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Spend {fmt(remainingForFreeShip)} more for free standard shipping
                  </p>
                </div>
              )}
            </div>

            {/* Totals breakdown */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({promo?.code})</span>
                  <span>−{fmt(discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping <span className="text-[11px]">({shippingMethod === "express" ? "Express" : "Standard"})</span>
                </span>
                <span>{selectedShippingCents === 0 ? "Free" : fmt(selectedShippingCents)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t mt-1.5">
                <span className="font-medium">Total</span>
                <span className="text-lg font-semibold">{fmt(grandTotal)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={!canCheckout || checkingOut}
            >
              {checkingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {hasExpiredSneaker ? "Reservation expired" : hasOutOfStock ? "Resolve items to checkout" : "Checkout"}
            </Button>
            {!canCheckout && items.length > 0 && (
              <p className="text-xs text-destructive text-center">
                {hasExpiredSneaker
                  ? "Re-reserve your sneaker or remove it to continue."
                  : hasOutOfStock
                  ? "Remove or reduce out-of-stock items to continue."
                  : "Remove unavailable items to continue."}
              </p>
            )}

            <button
              onClick={copyResumeLink}
              className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 pt-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
              {copied ? "Link copied" : "Save cart — copy resume link"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center -mt-1">
              Your cart auto-saves on this device. Paste the link on any browser to pick up where you left off.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
