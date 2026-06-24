import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedPhotoUrls, type ShopProduct } from "@/lib/shop";
import { formatDistanceToNow } from "date-fns";

type Row = ShopProduct & { photo_path: string | null };

const Shop = () => {
  const [products, setProducts] = useState<Row[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [recentlySold, setRecentlySold] = useState<{ id: string; name: string; sold_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: live }, { data: sold }] = await Promise.all([
        supabase
          .from("shop_products")
          .select("*, shop_product_photos(storage_path, is_primary, sort_order)")
          .in("status", ["available", "reserved"])
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("shop_products")
          .select("id, name, brand, model, sold_at")
          .eq("status", "sold")
          .not("sold_at", "is", null)
          .order("sold_at", { ascending: false })
          .limit(3),
      ]);

      const rows: Row[] = (live ?? []).map((p: any) => {
        const photos = (p.shop_product_photos ?? []).sort((a: any, b: any) =>
          (b.is_primary === true ? 1 : 0) - (a.is_primary === true ? 1 : 0) || a.sort_order - b.sort_order,
        );
        return { ...p, photo_path: photos[0]?.storage_path ?? null };
      });
      if (!mounted) return;
      setProducts(rows);
      setRecentlySold(
        (sold ?? []).map((s: any) => ({
          id: s.id,
          name: [s.brand, s.model, s.name].filter(Boolean).join(" "),
          sold_at: s.sold_at,
        })),
      );
      const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];
      const u = await signedPhotoUrls(paths);
      if (mounted) {
        setUrls(u);
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel("shop-products-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_products" }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section id="shop" className="py-16 md:py-32 bg-slate-100">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 md:mb-10">
          <div>
            <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">Shop</span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground mt-3 md:mt-4">RESTORED KICKS</h2>
            <p className="font-body text-sm md:text-base text-muted-foreground max-w-xl mt-3 md:mt-4">
              One-of-one restored pairs. When it's gone, it's gone.
            </p>
          </div>
        </div>

        {recentlySold.length > 0 && (
          <div className="mb-6 md:mb-10 flex flex-wrap gap-2">
            {recentlySold.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1 text-[11px] md:text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground">{s.name}</span>
                <span>sold {formatDistanceToNow(new Date(s.sold_at), { addSuffix: true })}</span>
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-square bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No pairs available right now. Check back soon — new drops weekly.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
            {products.map((p, index) => {
              const img = p.photo_path ? urls[p.photo_path] : null;
              const reserved = p.status === "reserved";
              const display = [p.brand, p.model].filter(Boolean).join(" ") || p.name;
              return (
                <Link
                  to={`/shop/${p.id}`}
                  key={p.id}
                  className="group bg-card rounded-xl md:rounded-2xl overflow-hidden border border-border hover:border-primary/50 transition-all duration-500 animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative aspect-square overflow-hidden bg-secondary">
                    {img ? (
                      <img src={img} alt={display} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">No photo</div>
                    )}
                    {p.condition && (
                      <span className="absolute top-2 left-2 md:top-4 md:left-4 bg-primary text-primary-foreground text-[10px] md:text-xs font-body uppercase tracking-wider px-2 py-0.5 md:px-3 md:py-1 rounded-full">
                        {p.condition}
                      </span>
                    )}
                    {reserved && (
                      <span className="absolute top-2 right-2 md:top-4 md:right-4 bg-amber-500 text-white text-[10px] md:text-xs font-body uppercase tracking-wider px-2 py-0.5 md:px-3 md:py-1 rounded-full inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Reserved
                      </span>
                    )}
                  </div>
                  <div className="p-3 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-1 md:mb-2 gap-0.5">
                      <h3 className="font-display text-sm sm:text-base md:text-xl text-foreground leading-tight">{display}</h3>
                      <span className="font-display text-base md:text-xl text-primary shrink-0">${Number(p.price).toFixed(0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-body text-xs md:text-sm text-muted-foreground">
                        {p.size ? `Size ${p.size}` : ""}
                      </p>
                      {p.view_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" /> {p.view_count}
                        </span>
                      )}
                    </div>
                    <Button variant="default" className="w-full h-9 md:h-10 text-xs md:text-sm mt-3">
                      {reserved ? "View Details" : "Shop This Pair"}
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Shop;
