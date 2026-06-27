import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, Pencil, Trash2, RotateCcw, Rocket, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { signedPhotoUrls } from "@/lib/shop";
import { useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Products() {
  const qc = useQueryClient();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [restoring, setRestoring] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pubConfirm, setConfirm] = useState<{ ids: string[]; label: string } | null>(null);

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

  async function runPublish() {
    if (!pubConfirm) return;
    const ids = pubConfirm.ids;
    setBulkBusy(true);
    try {
      const { error } = await supabase.from("shop_products").update({ status: "available" }).in("id", ids);
      if (error) throw error;
      toast.success(`Published ${ids.length} product${ids.length === 1 ? "" : "s"} — now live on /shop`);
      setSelected((s) => {
        const n = new Set(s);
        ids.forEach((i) => n.delete(i));
        return n;
      });
      await qc.invalidateQueries({ queryKey: ["admin-shop-products"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkBusy(false);
      setConfirm(null);
    }
  }

  function askPublishOne(p: any) {
    const label = [p.brand, p.model].filter(Boolean).join(" ") || p.name;
    setConfirm({ ids: [p.id], label });
  }

  function askPublishSelected() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirm({ ids, label: `${ids.length} selected draft${ids.length === 1 ? "" : "s"}` });
  }

  function toggleSel(pid: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(pid) ? n.delete(pid) : n.add(pid);
      return n;
    });
  }

  const draftIds = (products || []).filter((p: any) => p.status === "draft").map((p: any) => p.id);
  const allDraftsSelected = draftIds.length > 0 && draftIds.every((id: string) => selected.has(id));

  async function restoreStaged() {
    if (!confirm("Recreate the 3 previously staged draft products?")) return;
    setRestoring(true);
    try {
      const seeds = [
        { name: "Jordan 4 Retro - Restored", brand: "Jordan", model: "4 Retro", size: "10", condition: "Like New", price: 220, status: "draft", description: "Previously staged sample. Update details and add photos before publishing." },
        { name: "Air Force 1 Low - Restored", brand: "Nike", model: "Air Force 1 Low", size: "11", condition: "Lightly Used", price: 140, status: "draft", description: "Previously staged sample. Update details and add photos before publishing." },
        { name: "Dunk Low - Restored", brand: "Nike", model: "Dunk Low", size: "9.5", condition: "Good Used", price: 160, status: "draft", description: "Previously staged sample. Update details and add photos before publishing." },
      ];
      const { error } = await supabase.from("shop_products").insert(seeds);
      if (error) throw error;
      toast.success("Restored 3 staged products as drafts");
      qc.invalidateQueries({ queryKey: ["admin-shop-products"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-wide">Shop Products</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={restoreStaged} disabled={restoring}>
            <RotateCcw className="w-4 h-4 mr-1" /> Restore Staged
          </Button>
          <Button asChild>
            <Link to="/admin/products/new"><Plus className="w-4 h-4 mr-1" /> New Product</Link>
          </Button>
        </div>
      </div>

      {draftIds.length > 0 && (
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allDraftsSelected}
                onCheckedChange={(c) =>
                  setSelected(c ? new Set(draftIds) : new Set())
                }
              />
              <span>Select all drafts ({draftIds.length})</span>
              {selected.size > 0 && (
                <span className="text-muted-foreground">· {selected.size} selected</span>
              )}
            </div>
            <Button size="sm" onClick={askPublishSelected} disabled={bulkBusy || selected.size === 0}>
              <Rocket className="w-4 h-4 mr-1" /> Publish Selected
            </Button>
          </CardContent>
        </Card>
      )}

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
                {p.status === "draft" && (
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggleSel(p.id)}
                  />
                )}
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
                  {p.status === "draft" && (
                    <Button size="sm" onClick={() => askPublishOne(p)} className="hidden sm:inline-flex">
                      <Rocket className="w-4 h-4 mr-1" /> Publish Now
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="icon" title="Preview on Shop">
                    <Link to={`/shop/${p.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
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

      <AlertDialog open={!!pubConfirm} onOpenChange={(o) => !o && !bulkBusy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish to the live shop?</AlertDialogTitle>
            <AlertDialogDescription>
              {pubConfirm && (
                <>
                  This will set <strong>{pubConfirm.label}</strong> to <strong>Available</strong> and make
                  {pubConfirm.ids.length === 1 ? " it" : " them"} immediately visible and purchasable on /shop.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); runPublish(); }} disabled={bulkBusy}>
              <Rocket className="w-4 h-4 mr-1" /> Yes, publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    draft: { cls: "bg-slate-200 text-slate-800", label: "Draft" },
    available: { cls: "bg-emerald-100 text-emerald-800", label: "Published" },
    reserved: { cls: "bg-amber-100 text-amber-800", label: "Reserved" },
    sold: { cls: "bg-blue-100 text-blue-800", label: "Sold" },
    archived: { cls: "bg-slate-100 text-slate-500", label: "Archived" },
  };
  const m = map[status] || { cls: "", label: status };
  return <Badge className={m.cls} variant="secondary">{m.label}</Badge>;
}