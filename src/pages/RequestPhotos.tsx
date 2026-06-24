import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ImagePlus, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type RequestInfo = {
  id: string;
  customer_name: string;
  shoe_brand: string | null;
  shoe_model: string | null;
  status: string;
  admin_notes: string | null;
};

type Pending = { file: File; previewUrl: string };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export default function RequestPhotos() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<RequestInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Pending[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-view?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load request");
        setInfo(json.request);
      } catch (e: any) {
        setError(e?.message ?? "Could not load request");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const accepted: Pending[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: use JPG, PNG, HEIC, or WEBP.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`${file.name}: larger than 10 MB.`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) setPhotos((p) => [...p, ...accepted].slice(0, 10));
  }

  function removePhoto(idx: number) {
    setPhotos((p) => {
      const next = [...p];
      const [removed] = next.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  async function uploadAll() {
    const folder = crypto.randomUUID();
    const paths: string[] = [];
    for (const { file } of photos) {
      const extMatch = file.name.match(/\.([A-Za-z0-9]+)$/);
      const ext = (extMatch?.[1] || "jpg").toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;
      const { error } = await supabase.storage
        .from("request-photos")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw new Error(`Upload failed: ${file.name}`);
      paths.push(path);
    }
    return paths;
  }

  async function handleSubmit() {
    if (!photos.length) {
      toast.error("Add at least one photo first.");
      return;
    }
    setSubmitting(true);
    try {
      const paths = await uploadAll();
      const { data, error: invErr } = await supabase.functions.invoke("request-add-photos", {
        body: { token, photos: paths },
      });
      if (invErr) throw new Error(invErr.message);
      if (data?.error) throw new Error(data.error);
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
      setDone(true);
      toast.success("Photos sent! We'll follow up shortly.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send photos");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-2">
            <h1 className="text-xl font-semibold">Link not found</h1>
            <p className="text-sm text-muted-foreground">
              {error ?? "This upload link is invalid or has expired."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shoe = [info.shoe_brand, info.shoe_model].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="space-y-1">
          <p className="text-xs tracking-[0.2em] font-bold text-primary">CLEAN MY KICKS</p>
          <h1 className="text-2xl font-bold">Add more photos</h1>
          <p className="text-sm text-muted-foreground">
            Hi {info.customer_name}
            {shoe ? ` — for your ${shoe}` : ""}.
          </p>
        </div>

        {info.admin_notes && (
          <Card>
            <CardContent className="py-4 space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">What we need</p>
              <p className="text-sm whitespace-pre-wrap">{info.admin_notes}</p>
            </CardContent>
          </Card>
        )}

        {done ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <h2 className="text-lg font-semibold">Thanks — we got your photos.</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll review them and send your quote shortly.
              </p>
              <Button variant="outline" onClick={() => setDone(false)}>
                Add more photos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 space-y-4">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => inputRef.current?.click()}
                disabled={submitting || photos.length >= 10}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                {photos.length >= 10 ? "Maximum 10 photos" : "Choose photos"}
              </Button>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={p.previewUrl} className="relative aspect-square rounded-md overflow-hidden border">
                      <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                        onClick={() => removePhoto(i)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || photos.length === 0}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send photos
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG, HEIC, or WEBP · up to 10 MB each
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}