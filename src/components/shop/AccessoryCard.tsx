import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Minus, Plus, Loader2, ShoppingBag, ChevronRight } from "lucide-react";
import { signedPhotoUrl, signedPhotoUrls } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

type Variant = {
  id: string;
  name: string;
  stock_qty: number;
  active: boolean;
  price_cents_override: number | null;
  sort_order: number;
};

export type AccessoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  base_price_cents: number;
  shop_accessory_variants: Variant[];
  shop_accessory_photos: { storage_path: string; sort_order: number }[];
};

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AccessoryCard({ acc }: { acc: AccessoryRow }) {
  const { addAccessory, setOpen } = useCart();
  const variants = (acc.shop_accessory_variants || [])
    .filter((v) => v.active)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const [variantId, setVariantId] = useState<string | undefined>(variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [allPhotoUrls, setAllPhotoUrls] = useState<Record<string, string>>({});
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  const sortedPhotos = useMemo(
    () =>
      (acc.shop_accessory_photos || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    [acc.shop_accessory_photos],
  );
  const photoPath = sortedPhotos[0]?.storage_path ?? null;

  useEffect(() => {
    signedPhotoUrl(photoPath).then(setPhotoUrl);
  }, [photoPath]);

  // Lazily sign all photos the first time the details dialog opens.
  useEffect(() => {
    if (!detailsOpen) return;
    const paths = sortedPhotos.map((p) => p.storage_path).filter(Boolean);
    if (!paths.length) return;
    if (paths.every((p) => allPhotoUrls[p])) return;
    signedPhotoUrls(paths).then((map) => {
      setAllPhotoUrls(map);
      setActivePhoto((cur) => cur ?? map[paths[0]] ?? null);
    });
  }, [detailsOpen, sortedPhotos, allPhotoUrls]);

  const selectedVariant = variants.find((v) => v.id === variantId);
  const priceCents = selectedVariant?.price_cents_override ?? acc.base_price_cents;
  const stock = selectedVariant?.stock_qty ?? 0;
  const allOut = variants.length === 0 || variants.every((v) => v.stock_qty <= 0);
  const showVariantPicker = variants.length > 1 || (variants[0]?.name && variants[0].name !== "Default");

  async function handleAdd() {
    if (!selectedVariant || stock <= 0) return;
    setAdding(true);
    const res = await addAccessory(selectedVariant.id, priceCents, qty);
    setAdding(false);
    if (!res.ok) {
      toast.error(res.error || "Could not add to cart");
      return;
    }
    toast.success("Added to cart");
    setDetailsOpen(false);
    setOpen(true);
  }

  return (
    <article className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="aspect-square bg-secondary relative block w-full text-left focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label={`View details for ${acc.name}`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={acc.name} className="w-full h-full object-contain p-4" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
        )}
        {allOut && (
          <span className="absolute top-2 right-2 bg-foreground text-background text-[10px] uppercase tracking-wider px-2 py-0.5 rounded">
            Sold out
          </span>
        )}
      </button>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="font-semibold text-sm leading-tight text-left hover:text-primary transition-colors"
          >
            {acc.name}
          </button>
          {acc.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{acc.description}</p>
          )}
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="mt-1.5 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
          >
            View details <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {showVariantPicker && (
          <Select value={variantId} onValueChange={setVariantId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Choose option" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.id} value={v.id} disabled={v.stock_qty <= 0}>
                  {v.name} {v.stock_qty <= 0 ? "(sold out)" : v.stock_qty <= 5 ? `(only ${v.stock_qty} left)` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg font-bold">{fmt(priceCents)}</span>
          {!allOut && (
            <div className="inline-flex items-center border rounded-md">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-2 py-1 hover:bg-secondary"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-2 text-sm w-6 text-center">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(stock || 99, q + 1))}
                className="px-2 py-1 hover:bg-secondary disabled:opacity-30"
                disabled={qty >= stock}
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <Button
          onClick={handleAdd}
          disabled={adding || allOut || stock <= 0}
          className="w-full"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <ShoppingBag className="w-4 h-4 mr-1.5" />
          )}
          {allOut ? "Sold out" : "Add to cart"}
        </Button>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{acc.name}</DialogTitle>
            {acc.category && (
              <DialogDescription className="uppercase tracking-wider text-[10px]">
                {acc.category}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="aspect-square bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                {activePhoto || photoUrl ? (
                  <img
                    src={activePhoto || photoUrl || ""}
                    alt={acc.name}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <span className="text-muted-foreground text-xs">No image</span>
                )}
              </div>
              {sortedPhotos.length > 1 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {sortedPhotos.map((p) => {
                    const u = allPhotoUrls[p.storage_path];
                    if (!u) return null;
                    const active = (activePhoto || photoUrl) === u;
                    return (
                      <button
                        key={p.storage_path}
                        type="button"
                        onClick={() => setActivePhoto(u)}
                        className={`w-14 h-14 rounded-md overflow-hidden border-2 bg-secondary ${
                          active ? "border-primary" : "border-transparent hover:border-border"
                        }`}
                        aria-label="View photo"
                      >
                        <img src={u} alt="" className="w-full h-full object-contain p-1" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {acc.description && (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {acc.description}
                </p>
              )}

              {showVariantPicker && (
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Option
                  </label>
                  <Select value={variantId} onValueChange={setVariantId}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose option" />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((v) => (
                        <SelectItem key={v.id} value={v.id} disabled={v.stock_qty <= 0}>
                          {v.name}{" "}
                          {v.stock_qty <= 0
                            ? "(sold out)"
                            : v.stock_qty <= 5
                              ? `(only ${v.stock_qty} left)`
                              : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{fmt(priceCents)}</span>
                {!allOut && (
                  <div className="inline-flex items-center border rounded-md">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 hover:bg-secondary"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 text-sm w-8 text-center">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(stock || 99, q + 1))}
                      className="px-3 py-1.5 hover:bg-secondary disabled:opacity-30"
                      disabled={qty >= stock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <Button
                onClick={handleAdd}
                disabled={adding || allOut || stock <= 0}
                size="lg"
                className="w-full"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <ShoppingBag className="w-4 h-4 mr-1.5" />
                )}
                {allOut ? "Sold out" : "Add to cart"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
}
