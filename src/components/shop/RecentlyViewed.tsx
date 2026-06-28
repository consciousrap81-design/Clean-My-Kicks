import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signedPhotoUrls } from "@/lib/shop";

const KEY = "cmk.recentlyViewed.v1";
const MAX = 12;

export function trackRecentlyViewed(productId: string) {
  if (typeof window === "undefined" || !productId) return;
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [productId, ...list.filter((x) => x !== productId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

type Item = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  price: number;
  status: string;
  photo?: string;
};

export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const ids = readIds().filter((x) => x !== excludeId).slice(0, 8);
      if (ids.length === 0) { setItems([]); return; }
      const { data: products } = await supabase
        .from("shop_products")
        .select("id, name, brand, model, price, status")
        .in("id", ids);
      const { data: photos } = await supabase
        .from("shop_product_photos")
        .select("product_id, storage_path, is_primary, sort_order")
        .in("product_id", ids)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });
      const primary = new Map<string, string>();
      (photos || []).forEach((p: any) => { if (!primary.has(p.product_id)) primary.set(p.product_id, p.storage_path); });
      const urls = await signedPhotoUrls(Array.from(primary.values()));
      const map = new Map((products || []).map((p: any) => [p.id, p]));
      const ordered = ids
        .map((id) => map.get(id))
        .filter(Boolean)
        .map((p: any) => ({ ...p, photo: urls[primary.get(p.id) || ""] || undefined })) as Item[];
      if (!cancelled) setItems(ordered);
    }
    load();
    return () => { cancelled = true; };
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl text-foreground mb-4">Recently viewed</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {items.map((p) => {
          const display = [p.brand, p.model].filter(Boolean).join(" ") || p.name;
          return (
            <Link
              key={p.id}
              to={`/shop/${p.id}`}
              className="snap-start shrink-0 w-40 md:w-48 group"
            >
              <div className="aspect-square bg-secondary rounded-lg overflow-hidden border border-border group-hover:border-primary transition relative">
                {p.photo ? (
                  <img src={p.photo} alt={display} className="w-full h-full object-contain p-2" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">No photo</div>
                )}
                {p.status === "sold" && (
                  <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-foreground/80 text-background rounded-full px-2 py-0.5">Sold</div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium text-foreground truncate">{display}</div>
              <div className="text-sm text-primary">${Number(p.price).toFixed(0)}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}