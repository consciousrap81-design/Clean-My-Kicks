import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { signedPhotoUrls } from "@/lib/shop";

const CATEGORY_LABELS: Record<string, string> = {
  cleaning_kit: "Cleaning kit",
  laces: "Laces",
  buckle: "Buckle / tag",
  other: "Other",
};

export default function Accessories() {
  const qc = useQueryClient();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const { data: items } = useQuery({
    queryKey: ["admin-accessories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_accessories")
        .select("*, shop_accessory_variants(id, stock_qty, active), shop_accessory_photos(storage_path, sort_order, is_primary)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!items) return;
    const paths = (items as any[])
      .map((a) => (a.shop_accessory_photos ?? []).slice().sort((x: any, y: any) => (y.is_primary ? 1 : 0) - (x.is_primary ? 1 : 0) || x.sort_order - y.sort_order)[0]?.storage_path)
      .filter(Boolean);
    signedPhotoUrls(paths).then(setUrls);
  }, [items]);

  async function del(id: string) {
    if (!confirm("Delete this accessory and all its variants?")) return;
    const { data: photos } = await supabase.from("shop_accessory_photos").select("storage_path").eq("accessory_id", id);
    if (photos?.length) {
      await supabase.storage.from("shop-products").remove(photos.map((p: any) => p.storage_path));
    }
    const { error } = await supabase.from("shop_accessories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-accessories"] });
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-wide">Accessories</h1>
        <Button asChild>
          <Link to="/admin/accessories/new">
            <Plus className="w-4 h-4 mr-1" /> New Accessory
          </Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Cleaning kits, laces, lace buckles — anything that ships with stock. Customers can add multiples to their cart.
      </p>

      <div className="grid gap-3">
        {(items || []).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No accessories yet. Add cleaning kits, laces, or buckles.
            </CardContent>
          </Card>
        )}
        {(items || []).map((a: any) => {
          const ph = (a.shop_accessory_photos ?? []).slice().sort((x: any, y: any) => (y.is_primary ? 1 : 0) - (x.is_primary ? 1 : 0) || x.sort_order - y.sort_order);
          const img = ph[0]?.storage_path ? urls[ph[0].storage_path] : null;
          const totalStock = (a.shop_accessory_variants ?? [])
            .filter((v: any) => v.active)
            .reduce((s: number, v: any) => s + v.stock_qty, 0);
          const variantCount = (a.shop_accessory_variants ?? []).length;
          return (
            <Card key={a.id}>
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-secondary rounded-lg overflow-hidden shrink-0">
                  {img && <img src={img} alt={a.name} className="w-full h-full object-contain p-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{a.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
                    {!a.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From ${(a.base_price_cents / 100).toFixed(2)} · {variantCount} variant{variantCount === 1 ? "" : "s"} · {totalStock} in stock
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/accessories/${a.id}`}><Pencil className="w-3.5 h-3.5" /></Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => del(a.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
