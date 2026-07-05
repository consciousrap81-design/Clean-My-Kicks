import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, Plus, Star, GripVertical, Sparkles, Rocket, ExternalLink } from "lucide-react";
import { signedPhotoUrls } from "@/lib/shop";
import { prepareProductPhoto } from "@/lib/productPhoto";
import PolishDescriptionDialog from "@/components/admin/PolishDescriptionDialog";

type Variant = {
  id?: string;
  name: string;
  sku: string;
  price_cents_override: string;
  stock_qty: number;
  active: boolean;
  sort_order: number;
  _new?: boolean;
  _delete?: boolean;
};

type Photo = { id: string; storage_path: string; sort_order: number; is_primary: boolean };

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export default function AccessoryEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [dropActive, setDropActive] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [polishOpen, setPolishOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    category: "cleaning_kit",
    base_price_dollars: "",
    active: true,
  });
  const [variants, setVariants] = useState<Variant[]>([
    { name: "Default", sku: "", price_cents_override: "", stock_qty: 0, active: true, sort_order: 0, _new: true },
  ]);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data: a } = await supabase
        .from("shop_accessories")
        .select("*, shop_accessory_variants(*), shop_accessory_photos(id, storage_path, sort_order, is_primary)")
        .eq("id", id!)
        .maybeSingle();
      if (!a) return;
      setForm({
        name: a.name ?? "",
        slug: a.slug ?? "",
        description: a.description ?? "",
        category: a.category ?? "cleaning_kit",
        base_price_dollars: ((a.base_price_cents ?? 0) / 100).toFixed(2),
        active: !!a.active,
      });
      const vs = (a.shop_accessory_variants ?? []).sort((x: any, y: any) => x.sort_order - y.sort_order);
      setVariants(
        vs.length
          ? vs.map((v: any) => ({
              id: v.id,
              name: v.name ?? "",
              sku: v.sku ?? "",
              price_cents_override: v.price_cents_override != null ? (v.price_cents_override / 100).toFixed(2) : "",
              stock_qty: v.stock_qty ?? 0,
              active: !!v.active,
              sort_order: v.sort_order ?? 0,
            }))
          : [{ name: "Default", sku: "", price_cents_override: "", stock_qty: 0, active: true, sort_order: 0, _new: true }],
      );
      let ph: Photo[] = (a.shop_accessory_photos ?? [])
        .slice()
        .sort((x: any, y: any) =>
          (y.is_primary ? 1 : 0) - (x.is_primary ? 1 : 0) || x.sort_order - y.sort_order,
        );
      if (ph.length > 0 && !ph.some((p) => p.is_primary)) {
        const first = ph[0];
        const { error } = await supabase
          .from("shop_accessory_photos")
          .update({ is_primary: true })
          .eq("id", first.id);
        if (!error) ph = ph.map((p, i) => ({ ...p, is_primary: i === 0 }));
      }
      setPhotos(ph);
      const u = await signedPhotoUrls(ph.map((p: any) => p.storage_path));
      setUrls(u);
    })();
  }, [id, isNew]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    const basePriceCents = Math.round(parseFloat(form.base_price_dollars || "0") * 100);
    if (!Number.isFinite(basePriceCents) || basePriceCents < 0) return toast.error("Invalid price");
    setSaving(true);
    try {
      const slug = form.slug.trim() || slugify(form.name);
      let accId = id!;
      if (isNew) {
        const { data, error } = await supabase
          .from("shop_accessories")
          .insert({
            name: form.name.trim(),
            slug,
            description: form.description.trim() || null,
            category: form.category,
            base_price_cents: basePriceCents,
            active: form.active,
          })
          .select("id")
          .single();
        if (error) throw error;
        accId = data.id;
      } else {
        const { error } = await supabase
          .from("shop_accessories")
          .update({
            name: form.name.trim(),
            slug,
            description: form.description.trim() || null,
            category: form.category,
            base_price_cents: basePriceCents,
            active: form.active,
          })
          .eq("id", accId);
        if (error) throw error;
      }

      // Variants
      for (const v of variants) {
        const override = v.price_cents_override.trim()
          ? Math.round(parseFloat(v.price_cents_override) * 100)
          : null;
        if (v._delete && v.id) {
          await supabase.from("shop_accessory_variants").delete().eq("id", v.id);
          continue;
        }
        if (v._delete) continue;
        const payload = {
          accessory_id: accId,
          name: v.name.trim() || "Default",
          sku: v.sku.trim() || null,
          price_cents_override: override,
          stock_qty: Math.max(0, Math.floor(Number(v.stock_qty) || 0)),
          active: v.active,
          sort_order: v.sort_order,
        };
        if (v.id) {
          await supabase.from("shop_accessory_variants").update(payload).eq("id", v.id);
        } else {
          await supabase.from("shop_accessory_variants").insert(payload);
        }
      }

      toast.success("Saved");
      if (isNew) nav(`/admin/accessories/${accId}`);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function loadPhotos() {
    if (isNew) return;
    const { data } = await supabase
      .from("shop_accessory_photos")
      .select("id, storage_path, sort_order, is_primary")
      .eq("accessory_id", id!)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    const ph = (data ?? []) as Photo[];
    setPhotos(ph);
    const u = await signedPhotoUrls(ph.map((p) => p.storage_path));
    setUrls((prev) => ({ ...prev, ...u }));
  }

  async function uploadFiles(files: File[]) {
    if (isNew) {
      toast.error("Save the accessory first");
      return;
    }
    if (!files.length) return;
    const images = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!images.length) {
      toast.error("Only image files are supported");
      return;
    }
    setUploading(true);
    try {
      const maxSort = photos.reduce((m, p) => Math.max(m, p.sort_order), -1);
      for (let i = 0; i < images.length; i++) {
        const f = await prepareProductPhoto(images[i]);
        const path = `accessories/${id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("shop-products")
          .upload(path, f, { upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("shop_accessory_photos").insert({
          accessory_id: id!,
          storage_path: path,
          sort_order: maxSort + 1 + i,
          is_primary: photos.length === 0 && i === 0,
        });
        if (insErr) throw insErr;
      }
      await loadPhotos();
      toast.success(`Uploaded ${images.length} photo${images.length === 1 ? "" : "s"}`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    await uploadFiles(files);
    e.target.value = "";
  }

  async function onPhotoDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(false);
    if (dragId) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) await uploadFiles(files);
  }

  async function setPrimary(photoId: string) {
    await supabase.from("shop_accessory_photos").update({ is_primary: false }).eq("accessory_id", id!);
    await supabase.from("shop_accessory_photos").update({ is_primary: true }).eq("id", photoId);
    await loadPhotos();
  }

  async function delPhoto(p: Photo) {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("shop-products").remove([p.storage_path]);
    await supabase.from("shop_accessory_photos").delete().eq("id", p.id);
    await loadPhotos();
  }

  async function persistOrder(list: Photo[]) {
    setReordering(true);
    try {
      setPhotos(list.map((p, idx) => ({ ...p, sort_order: idx })));
      await Promise.all(
        list.map((p, idx) =>
          supabase.from("shop_accessory_photos").update({ sort_order: idx }).eq("id", p.id),
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

  async function publishNow() {
    if (isNew) { toast.error("Save the accessory first"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("shop_accessories")
        .update({ active: true })
        .eq("id", id!);
      if (error) throw error;
      setForm((f) => ({ ...f, active: true }));
      toast.success("Published — now live on /shop");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-display tracking-wide">{isNew ? "New Accessory" : "Edit Accessory"}</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium Cleaning Kit" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning_kit">Cleaning kit</SelectItem>
                  <SelectItem value="laces">Laces</SelectItem>
                  <SelectItem value="buckle">Buckle / tag</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Base price (USD)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.base_price_dollars}
                onChange={(e) => setForm({ ...form, base_price_dollars: e.target.value })}
                placeholder="29.00"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Description</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setPolishOpen(true)} disabled={!form.description.trim()}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Polish with Kicks
              </Button>
            </div>
            <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Paste raw notes — Kicks can reformat with bullets, sections, and bold highlights." />
            <p className="text-[11px] text-muted-foreground">Markdown supported: <code>**bold**</code>, <code>- bullets</code>, and headings.</p>
          </div>
          <PolishDescriptionDialog
            open={polishOpen}
            onOpenChange={setPolishOpen}
            original={form.description}
            product={{ name: form.name, price: form.base_price_dollars }}
            onAccept={(formatted) => setForm((f) => ({ ...f, description: formatted }))}
          />
          {(form.name || form.base_price_dollars) && (
            <div className="rounded-lg border border-dashed bg-secondary/40 p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Public page preview
              </div>
              <div className="font-display text-2xl text-foreground leading-tight">
                {form.name || "—"}
              </div>
              {form.base_price_dollars && (
                <div className="font-display text-xl text-primary mt-1">
                  ${Number(form.base_price_dollars || 0).toFixed(2)}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="active-switch">Active (visible in shop)</Label>
            <Switch id="active-switch" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variants & stock</CardTitle>
          <p className="text-xs text-muted-foreground">
            One row per color/size/style. Leave the name as "Default" and add a single row if there are no variants.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {variants.filter((v) => !v._delete).map((v, i) => {
            const realIndex = variants.indexOf(v);
            return (
              <div key={v.id ?? `new-${i}`} className="grid grid-cols-12 gap-2 items-end border-b pb-3 last:border-0 last:pb-0">
                <div className="col-span-12 sm:col-span-4">
                  <Label className="text-xs">Variant name</Label>
                  <Input
                    value={v.name}
                    onChange={(e) =>
                      setVariants((arr) => arr.map((x, idx) => (idx === realIndex ? { ...x, name: e.target.value } : x)))
                    }
                    placeholder="White, 45in"
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <Label className="text-xs">SKU</Label>
                  <Input
                    value={v.sku}
                    onChange={(e) =>
                      setVariants((arr) => arr.map((x, idx) => (idx === realIndex ? { ...x, sku: e.target.value } : x)))
                    }
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <Label className="text-xs">Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={v.stock_qty}
                    onChange={(e) =>
                      setVariants((arr) =>
                        arr.map((x, idx) => (idx === realIndex ? { ...x, stock_qty: Number(e.target.value) } : x)),
                      )
                    }
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <Label className="text-xs">Price override</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="(base)"
                    value={v.price_cents_override}
                    onChange={(e) =>
                      setVariants((arr) =>
                        arr.map((x, idx) => (idx === realIndex ? { ...x, price_cents_override: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="col-span-6 sm:col-span-2 flex items-center gap-2 justify-end">
                  <Switch
                    checked={v.active}
                    onCheckedChange={(val) =>
                      setVariants((arr) => arr.map((x, idx) => (idx === realIndex ? { ...x, active: val } : x)))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setVariants((arr) =>
                        arr.map((x, idx) => (idx === realIndex ? { ...x, _delete: true } : x)).filter((x) => !(x._delete && x._new)),
                      )
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setVariants((arr) => [
                ...arr,
                {
                  name: "",
                  sku: "",
                  price_cents_override: "",
                  stock_qty: 0,
                  active: true,
                  sort_order: arr.length,
                  _new: true,
                },
              ])
            }
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add variant
          </Button>
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
          <CardContent>
            {photos.length > 0 && (
              <p className="text-xs text-muted-foreground mb-2">
                Drag to reorder. Click the <Star className="inline w-3 h-3 mx-0.5" /> to set the <strong>cover photo</strong>.
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {photos.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onDragOver={(e) => e.preventDefault()}
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
            <label
              onDragEnter={(e) => { e.preventDefault(); if (!dragId) setDropActive(true); }}
              onDragOver={(e) => { e.preventDefault(); if (!dragId) setDropActive(true); }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDropActive(false);
              }}
              onDrop={onPhotoDrop}
              className={`block cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
                dropActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-secondary/40"
              } ${uploading ? "pointer-events-none opacity-70" : ""}`}
            >
              <input type="file" accept="image/*" multiple className="hidden" onChange={onUpload} disabled={uploading} />
              <div className="flex flex-col items-center gap-2">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
                <div className="text-sm font-medium">
                  {uploading ? "Uploading…" : dropActive ? "Drop photos to upload" : "Drag & drop photos here, or click to browse"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Photos are automatically resized to 1920px and compressed for fast loading.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background py-3 border-t">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} {isNew ? "Create Accessory" : "Save Changes"}
        </Button>
        {!isNew && (
          <>
            <Button asChild variant="outline">
              <a href={`/shop`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Preview on Shop
              </a>
            </Button>
            {!form.active && (
              <Button variant="default" onClick={publishNow} disabled={saving}>
                <Rocket className="w-4 h-4 mr-2" /> Publish Now
              </Button>
            )}
          </>
        )}
        <Button variant="outline" onClick={() => nav("/admin/accessories")}>Cancel</Button>
      </div>
    </div>
  );
}
