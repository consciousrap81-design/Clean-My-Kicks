import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { signedPhotoUrls } from "@/lib/shop";
import { useEffect } from "react";

export default function Products() {
  const qc = useQueryClient();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const { data: products } = useQuery({
    queryKey: ["admin-shop-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*, shop_product_photos(storage_path, is_primary, sort_order)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!products) return;
    const paths = (products as any[])
      .map((p) => {
        const ph = (p.shop_product_photos ?? []).sort(
          (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
        );
        return ph[0]?.storage_path;
      })
      .filter(Boolean);
    signedPhotoUrls(paths).then(setUrls);
  }, [products]);

  async function del(id: string) {
    if (!confirm("Delete this product? Photos will be removed too.")) return;
    // Best-effort delete storage files
    const { data: photos } = await supabase.from("shop_product_photos").select("storage_path").eq("product_id", id);
    if (photos && photos.length) {
      await supabase.storage.from("shop-products").remove(photos.map((p: any) => p.storage_path));
    }
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-shop-products"] });
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-wide">Shop Products</h1>
        <Button asChild>
          <Link to="/admin/products/new"><Plus className="w-4 h-4 mr-1" /> New Product</Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {(products || []).length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No products yet. Add your first restored pair.
          </CardContent></Card>
        )}
        {(products || []).map((p: any) => {
          const ph = (p.shop_product_photos ?? []).sort(
            (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
          );
          const img = ph[0]?.storage_path ? urls[ph[0].storage_path] : null;
          const display = [p.brand, p.model].filter(Boolean).join(" ") || p.name;
          return (
            <Card key={p.id}>
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-secondary rounded-lg overflow-hidden shrink-0">
                  {img && <img src={img} alt={display} className="w-full h-full object-contain p-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{display}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                    {p.size && <span>Size {p.size}</span>}
                    {p.condition && <span>· {p.condition}</span>}
                    <span>· ${Number(p.price).toFixed(2)}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {p.view_count}</span>
                  </div>
                  <div className="mt-1.5"><StatusBadge status={p.status} /></div>
                </div>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon">
                    <Link to={`/admin/products/${p.id}`}><Pencil className="w-4 h-4" /></Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => del(p.id)}>
                    <Trash2 className="w-4 h-4" />
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-200 text-slate-800",
    available: "bg-emerald-100 text-emerald-800",
    reserved: "bg-amber-100 text-amber-800",
    sold: "bg-blue-100 text-blue-800",
    archived: "bg-slate-100 text-slate-500",
  };
  return <Badge className={map[status] || ""} variant="secondary">{status}</Badge>;
}