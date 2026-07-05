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
import { Loader2, Trash2, Upload, Plus } from "lucide-react";
import { signedPhotoUrls } from "@/lib/shop";

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

type Photo = { id: string; storage_path: string; sort_order: number };

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
  const [dragOver, setDragOver] = useState(false);
  // Files dropped/selected before the accessory has been saved for the first time.
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);

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
        .select("*, shop_accessory_variants(*), shop_accessory_photos(id, storage_path, sort_order)")
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
      const ph = (a.shop_accessory_photos ?? []).sort((x: any, y: any) => x.sort_order - y.sort_order);
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

      // If we queued photos before the first save, upload them now that we have an id.
      if (pendingFiles.length) {
        try {
          await uploadFilesFor(accId, pendingFiles.map((p) => p.file));
          pendingFiles.forEach((p) => URL.revokeObjectURL(p.preview));
          setPendingFiles([]);
        } catch (e: any) {
          toast.error(`Photo upload failed: ${e.message || e}`);
        }
      }

      if (isNew) nav(`/admin/accessories/${accId}`);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFilesFor(accId: string, files: File[]) {
    let order = photos.length;
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `accessories/${accId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("shop-products").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: row } = await supabase
        .from("shop_accessory_photos")
        .insert({ accessory_id: accId, storage_path: path, sort_order: order++ })
        .select()
        .single();
      if (row) setPhotos((p) => [...p, row as Photo]);
      const u = await signedPhotoUrls([path]);
      setUrls((prev) => ({ ...prev, ...u }));
    }
  }

  async function onUpload(files: FileList | null) {
    if (!files || !files.length) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return toast.error("Please choose image files");

    // Before the accessory exists, just queue the files with local previews.
    if (isNew) {
      const queued = images.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
      setPendingFiles((prev) => [...prev, ...queued]);
      toast.success(
        `${images.length} photo${images.length === 1 ? "" : "s"} queued — click Save to upload`,
      );
      return;
    }

    setUploading(true);
    try {
      await uploadFilesFor(id!, images);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(p: Photo) {
    await supabase.storage.from("shop-products").remove([p.storage_path]);
    await supabase.from("shop_accessory_photos").delete().eq("id", p.id);
    setPhotos((arr) => arr.filter((x) => x.id !== p.id));
  }

  function removePending(idx: number) {
    setPendingFiles((prev) => {
      const clone = [...prev];
      const [gone] = clone.splice(idx, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return clone;
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length) {
      const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!images.length) {
        toast.error("Please drop image files only");
        return;
      }
      const dt = new DataTransfer();
      images.forEach((f) => dt.items.add(f));
      onUpload(dt.files);
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
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
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

      <Card>
        <CardHeader><CardTitle className="text-base">Photos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isNew && (
            <p className="text-xs text-muted-foreground">
              Drop or choose photos now — they'll upload when you click Save.
            </p>
          )}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`grid grid-cols-3 sm:grid-cols-4 gap-3 p-2 rounded-md transition-colors ${
              dragOver ? "bg-primary/10 ring-2 ring-primary ring-dashed" : ""
            }`}
          >
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square bg-secondary rounded overflow-hidden group">
                {urls[p.storage_path] && (
                  <img src={urls[p.storage_path]} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removePhoto(p)}
                  className="absolute top-1 right-1 bg-background/80 rounded p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
            {pendingFiles.map((pf, i) => (
              <div
                key={`pending-${i}`}
                className="relative aspect-square bg-secondary rounded overflow-hidden group ring-1 ring-dashed ring-primary/60"
                title="Queued — uploads on Save"
              >
                <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 bg-background/80 text-[9px] uppercase tracking-wide px-1 rounded">
                  Queued
                </span>
                <button
                  onClick={() => removePending(i)}
                  className="absolute top-1 right-1 bg-background/80 rounded p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
            <label className="aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center gap-1 text-muted-foreground text-[10px] text-center px-1 hover:bg-secondary cursor-pointer">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              <span>Click or drop</span>
              <input type="file" multiple accept="image/*" hidden onChange={(e) => onUpload(e.target.files)} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: drag and drop images anywhere in the photo grid to upload.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save
        </Button>
        <Button variant="outline" onClick={() => nav("/admin/accessories")}>Cancel</Button>
      </div>
    </div>
  );
}
