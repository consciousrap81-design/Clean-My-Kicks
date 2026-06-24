import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Minus, Plus, Trash2, ShoppingBag, Clock } from "lucide-react";
import { useCart } from "@/lib/cart";
import { signedPhotoUrls } from "@/lib/shop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "expired";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CartDrawer() {
  const { open, setOpen, items, totalCents, loading, updateQty, removeItem, refresh, cartId } = useCart();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [checkingOut, setCheckingOut] = useState(false);

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

  // Find soonest sneaker reservation expiry for header timer
  const soonestReserve = items
    .filter((it) => it.item_type === "sneaker" && it.reserved_until)
    .map((it) => it.reserved_until!)
    .sort()[0] ?? null;
  const timer = useReservationTimer(soonestReserve);

  const canCheckout = items.length > 0 && items.every((it) => it.available);

  async function handleCheckout() {
    if (!canCheckout) return;
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-shop-checkout", {
        body: { cartId },
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Your cart
          </SheetTitle>
          {timer && timer !== "expired" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              Sneaker held for <span className="font-mono font-semibold text-foreground">{timer}</span>
            </div>
          )}
        </SheetHeader>

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
                          {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
                          {!it.available && it.unavailable_reason && (
                            <p className="text-xs text-destructive mt-0.5">{it.unavailable_reason}</p>
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-semibold">{fmt(totalCents)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping calculated at checkout. Free shipping over $100.</p>
            <Button
              className="w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={!canCheckout || checkingOut}
            >
              {checkingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Checkout
            </Button>
            {!canCheckout && items.length > 0 && (
              <p className="text-xs text-destructive text-center">
                Remove unavailable items to continue.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
