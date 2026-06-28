import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signedPhotoUrls } from "@/lib/shop";
import { useCart } from "@/lib/cart";

type Item = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: number;
  status: string;
  view_count: number | null;
  photo?: string;
  reasons: string[];
};

type Props = {
  productId: string;
  brand: string | null;
  model: string | null;
};

export default function YouMayAlsoLike({ productId, brand, model }: Props) {
  const { items: cartItems } = useCart();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // Collect brand signals from cart sneakers
      const cartSneakerIds = cartItems
        .filter((i) => i.item_type === "sneaker" && i.sneaker_product_id)
        .map((i) => i.sneaker_product_id!) as string[];

      let cartBrands: string[] = [];
      if (cartSneakerIds.length) {
        const { data: cartProducts } = await supabase
          .from("shop_products")
          .select("brand")
          .in("id", cartSneakerIds);
        cartBrands = (cartProducts || [])
          .map((p: any) => p.brand)
          .filter(Boolean) as string[];
      }

      // Pull a pool of active candidates (excluding current product)
      const { data: pool } = await supabase
        .from("shop_products")
        .select("id, name, brand, model, price, status, view_count")
        .eq("status", "active")
        .neq("id", productId)
        .limit(40);

      const scored = (pool || [])
        .map((p: any): Item & { _score: number } => {
          const reasons: string[] = [];
          let score = 0;
          if (brand && p.brand && p.brand.toLowerCase() === brand.toLowerCase()) {
            score += 3;
            reasons.push(`Same brand · ${p.brand}`);
          }
          if (model && p.model && p.model.toLowerCase() === model.toLowerCase()) {
            score += 2;
            reasons.push("Same model");
          }
          if (
            p.brand &&
            cartBrands.some((b) => b.toLowerCase() === p.brand.toLowerCase())
          ) {
            score += 2;
            if (!reasons.length) reasons.push("Matches your cart");
          }
          // mild popularity tiebreak
          score += Math.min(1, (p.view_count || 0) / 50);
          return { ...p, reasons, _score: score };
        })
        .sort((a, b) => b._score - a._score)
        .slice(0, 6);

      if (scored.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }

      const ids = scored.map((p) => p.id);
      const { data: photos } = await supabase
        .from("shop_product_photos")
        .select("product_id, storage_path, is_primary, sort_order")
        .in("product_id", ids)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });
      const primary = new Map<string, string>();
      (photos || []).forEach((p: any) => {
        if (!primary.has(p.product_id)) primary.set(p.product_id, p.storage_path);
      });
      const urls = await signedPhotoUrls(Array.from(primary.values()));
      const final = scored.map(({ _score, ...rest }) => ({
        ...rest,
        photo: urls[primary.get(rest.id) || ""] || undefined,
      }));
      if (!cancelled) setItems(final);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [productId, brand, model, cartItems]);

  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display text-2xl text-foreground">You may also like</h2>
        <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary">
          Shop all →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((p) => {
          const display = [p.brand, p.model].filter(Boolean).join(" ") || p.name;
          return (
            <Link key={p.id} to={`/shop/${p.id}`} className="group">
              <div className="aspect-square bg-secondary rounded-lg overflow-hidden border border-border group-hover:border-primary transition">
                {p.photo ? (
                  <img
                    src={p.photo}
                    alt={display}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium text-foreground truncate">{display}</div>
              <div className="text-sm text-primary">${Number(p.price).toFixed(0)}</div>
              {p.reasons[0] && (
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  {p.reasons[0]}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}