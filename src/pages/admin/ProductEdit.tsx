import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Star, Trash2, Upload, Rocket, ExternalLink, GripVertical } from "lucide-react";
import { signedPhotoUrls } from "@/lib/shop";
import { PRODUCT_TEMPLATES } from "@/lib/productTemplates";
import { prepareProductPhoto } from "@/lib/productPhoto";
import PolishDescriptionDialog from "@/components/admin/PolishDescriptionDialog";
import { Sparkles } from "lucide-react";

type Photo = { id: string; storage_path: string; is_primary: boolean; sort_order: number };

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [polishOpen, setPolishOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    model: "",
    size: "",
    condition: "",
    description: "",
    price: "",
    status: "draft",
  });

  function applyTemplate(id: string) {
    const t = PRODUCT_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      name: f.name || `${t.brand} ${t.model}`,
      brand: t.brand,
      model: t.model,
      size: f.size || t.size,
      condition: f.condition || t.condition,
      description: f.description || t.description,
      price: f.price || String(t.price),
    }));
    toast.success(`Applied template: ${t.label}`);
  }

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data: p } = await supabase.from("shop_products").select("*").eq("id", id!).maybeSingle();
      if (!p) return;
      setForm({
        name: p.name ?? "",
        brand: p.brand ?? "",
        model: p.model ?? "",
        size: p.size ?? "",
        condition: p.condition ?? "",
        description: p.description ?? "",
        price: String(p.price ?? ""),
        status: p.status ?? "draft",
      });
      await loadPhotos();
    })();
  }, [id]);

  async function loadPhotos() {
    if (isNew) return;
    const { data } = await supabase
      .from("shop_product_photos")
      .select("*")
      .eq("product_id", id!)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    let ph = (data ?? []) as Photo[];
    // Fallback: if photos exist but none is marked as Cover, promote the first one
    if (ph.length > 0 && !ph.some((p) => p.is_primary)) {
      const first = ph[0];
      const { error } = await supabase
        .from("shop_product_photos")
        .update({ is_primary: true })
        .eq("id", first.id);
      if (!error) {
        ph = ph.map((p, i) => ({ ...p, is_primary: i === 0 }));
      }
    }
    setPhotos(ph);
    const u = await signedPhotoUrls(ph.map((p) => p.storage_path));
    setUrls(u);
  }

  async function save() {
    if (!form.name || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        brand: form.brand || null,
        model: form.model || null,
        size: form.size || null,
        condition: form.condition || null,
        description: form.description || null,
        price: Number(form.price),
        status: form.status,
      };
      if (isNew) {
        const { data, error } = await supabase.from("shop_products").insert(payload).select("id").single();
        if (error) throw error;
        toast.success("Created");
        nav(`/admin/products/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase.from("shop_products").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("Saved");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function publishNow() {
    if (isNew) {
      toast.error("Save the product first");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("shop_products")
        .update({ status: "available" })
        .eq("id", id!);
      if (error) throw error;
      setForm((f) => ({ ...f, status: "available" }));
      toast.success("Published — now live on /shop");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (isNew) {
      toast.error("Save the product first");
      return;
    }
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const maxSort = photos.reduce((m, p) => Math.max(m, p.sort_order), -1);
      for (let i = 0; i < files.length; i++) {
        const original = files[i];
        const f = await prepareProductPhoto(original);
        const path = `${id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("shop-products").upload(path, f, { upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("shop_product_photos").insert({
          product_id: id!,
          storage_path: path,
          sort_order: maxSort + 1 + i,
          is_primary: photos.length === 0 && i === 0,
        });
        if (insErr) throw insErr;
      }
      await loadPhotos();
      toast.success(`Uploaded ${files.length} photo${files.length === 1 ? "" : "s"}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function setPrimary(photoId: string) {
    await supabase.from("shop_product_photos").update({ is_primary: false }).eq("product_id", id!);
    await supabase.from("shop_product_photos").update({ is_primary: true }).eq("id", photoId);
    await loadPhotos();
  }

  async function delPhoto(p: Photo) {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("shop-products").remove([p.storage_path]);
    await supabase.from("shop_product_photos").delete().eq("id", p.id);
    await loadPhotos();
  }

  async function persistOrder(list: Photo[]) {
    setReordering(true);
    try {
      // Optimistic local update
      setPhotos(list.map((p, idx) => ({ ...p, sort_order: idx })));
      await Promise.all(
        list.map((p, idx) =>
          supabase.from("shop_product_photos").update({ sort_order: idx }).eq("id", p.id),
        ),
      );
      toast.success("Photo order saved");
    } catch (e: any) {
      toast.error(e.message);
      await loadPhotos();
    } finally {
      setReordering(false);
    }
  }

  function onDragStart(photoId: string) {
    setDragId(photoId);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  async function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = photos.findIndex((p) => p.id === dragId);
    const to = photos.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    await persistOrder(next);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-display tracking-wide">{isNew ? "New Product" : "Edit Product"}</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Start from template</Label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue placeholder="Pick a Jordan or Nike model to auto-fill" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label} — ${t.price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Fills empty fields only — won't overwrite anything you've already entered.</p>
          </div>
          <div className="md:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan 4 Oxidized Green" /></div>
          <div><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Jordan" /></div>
          <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="4 Retro" /></div>
          <div><Label>Size</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="10" /></div>
          <div><Label>Condition</Label>
            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
              <SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Like New">Like New</SelectItem>
                <SelectItem value="Lightly Used">Lightly Used</SelectItem>
                <SelectItem value="Good Used">Good Used</SelectItem>
                <SelectItem value="Worn">Worn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Price (USD) *</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (hidden)</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label>Description</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setPolishOpen(true)} disabled={!form.description.trim()}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Polish with Kicks
              </Button>
            </div>
            <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Paste raw notes — Kicks can reformat with bullets, sections, and bold highlights." />
            <p className="text-[11px] text-muted-foreground mt-1">Markdown supported on the public page: <code>**bold**</code>, <code>- bullets</code>, and headings.</p>
          </div>
          <PolishDescriptionDialog
            open={polishOpen}
            onOpenChange={setPolishOpen}
            original={form.description}
            product={{ name: form.name, brand: form.brand, model: form.model, size: form.size, condition: form.condition, price: form.price }}
            onAccept={(formatted) => setForm((f) => ({ ...f, description: formatted }))}
          />

          {/* Public-page preview — mirrors ProductDetail.tsx heading/subtitle exactly */}
          {(form.name || form.brand || form.model) && (
            <div className="md:col-span-2 rounded-lg border border-dashed bg-secondary/40 p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Public page preview
              </div>
              {(() => {
                const display = [form.brand, form.model].filter(Boolean).join(" ") || form.name;
                const showSub = form.name && form.name !== display;
                return (
                  <>
                    <div className="font-display text-2xl md:text-3xl text-foreground leading-tight">
                      {display || "—"}
                    </div>
                    {showSub && (
                      <div className="mt-1 text-sm md:text-base text-muted-foreground font-medium">
                        {form.name}
                      </div>
                    )}
                    {form.price && (
                      <div className="font-display text-xl text-primary mt-1">
                        ${Number(form.price).toFixed(2)}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isNew ? "Create Product" : "Save Changes"}
            </Button>
            {!isNew && (
              <>
                <Button asChild variant="outline">
                  <a href={`/shop/${id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" /> Preview on Shop
                  </a>
                </Button>
                {form.status !== "available" && (
                  <Button variant="default" onClick={publishNow} disabled={saving}>
                    <Rocket className="w-4 h-4 mr-2" /> Publish Now
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
          <CardContent>
            {photos.length > 0 && (
              <p className="text-xs text-muted-foreground mb-2">
                Drag to reorder. Click the <Star className="inline w-3 h-3 mx-0.5" /> to set the <strong>cover photo</strong> —
                this is the image shown in shop listings and at the top of the product page.
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => onDragStart(p.id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(p.id)}
                  className={`relative aspect-square bg-secondary rounded-lg overflow-hidden border cursor-move transition ${dragId === p.id ? "opacity-50 ring-2 ring-primary" : ""}`}
                >
                  <div className="absolute top-1 right-1 bg-background/80 rounded p-1 pointer-events-none">
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                  </div>
                  {urls[p.storage_path] && (
                    <img src={urls[p.storage_path]} alt="" className="w-full h-full object-contain p-1" />
                  )}
                  {p.is_primary && (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] uppercase px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" /> Cover
                    </span>
                  )}
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    {!p.is_primary && (
                      <Button size="icon" variant="secondary" className="h-7 w-7" title="Set as cover photo" onClick={() => setPrimary(p.id)}>
                        <Star className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => delPhoto(p)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {reordering && (
              <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving order…
              </p>
            )}
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} disabled={uploading} />
              <Button asChild disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Photos
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              Photos are automatically resized to 1920px and compressed for fast loading.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}