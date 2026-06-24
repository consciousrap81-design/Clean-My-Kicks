import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ImagePlus, CheckCircle2, X, AlertCircle, RotateCcw } from "lucide-react";
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

type Status = "queued" | "uploading" | "done" | "error";
type Pending = {
  file: File;
  previewUrl: string;
  status: Status;
  error?: string;
  path?: string; // storage path once successfully uploaded — reused on retry to avoid duplicates
};

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "finalizing">("idle");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

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
      accepted.push({ file, previewUrl: URL.createObjectURL(file), status: "queued" });
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

  function cancelUpload() {
    cancelRef.current = true;
    setCancelling(true);
  }

  function setPhotoStatus(idx: number, patch: Partial<Pending>) {
    setPhotos((p) => {
      const next = [...p];
      if (next[idx]) next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  async function uploadAll(current: Pending[]) {
    // Folder MUST be the booking request id — the storage RLS policy verifies
    // the upload path's first segment matches a real booking_requests row that
    // is still accepting photos. Random UUIDs will be rejected.
    const folder = info?.id;
    if (!folder) throw new Error("Missing request id");
    const paths: string[] = [];
    let completed = current.filter((p) => p.status === "done" && p.path).length;
    setUploadedCount(completed);
    for (let i = 0; i < current.length; i++) {
      if (cancelRef.current) throw new Error("__cancelled__");
      const item = current[i];
      // Reuse already-uploaded storage path so a retry never produces a
      // duplicate object or a duplicate entry in the request's photos[].
      if (item.status === "done" && item.path) {
        paths.push(item.path);
        continue;
      }
      setPhotoStatus(i, { status: "uploading", error: undefined });
      const extMatch = item.file.name.match(/\.([A-Za-z0-9]+)$/);
      const ext = (extMatch?.[1] || "jpg").toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;
      const { error } = await supabase.storage
        .from("request-photos")
        .upload(path, item.file, { contentType: item.file.type || undefined, upsert: false });
      if (cancelRef.current) throw new Error("__cancelled__");
      if (error) {
        setPhotoStatus(i, { status: "error", error: error.message });
        throw new Error(`Couldn't upload ${item.file.name}. Please try again.`);
      }
      setPhotoStatus(i, { status: "done", path });
      completed += 1;
      setUploadedCount(completed);
      paths.push(path);
    }
    return paths;
  }

  async function handleSubmit() {
    if (!photos.length) {
      toast.error("Add at least one photo first.");
      return;
    }
    cancelRef.current = false;
    setSubmitError(null);
    setSubmitting(true);
    setPhase("uploading");
    try {
      const paths = await uploadAll(photos);
      if (cancelRef.current) throw new Error("__cancelled__");
      setPhase("finalizing");
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
      if (e?.message === "__cancelled__") {
        // Reset any in-flight item back to queued so it'll re-upload on retry,
        // but keep already-done items so we don't re-upload them.
        setPhotos((p) =>
          p.map((x) => (x.status === "uploading" ? { ...x, status: "queued" } : x)),
        );
        toast.message("Upload cancelled");
      } else {
        const msg = e?.message ?? "Failed to send photos";
        setSubmitError(msg);
        toast.error(msg);
      }
    } finally {
      cancelRef.current = false;
      setCancelling(false);
      setSubmitting(false);
      setPhase("idle");
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
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Thanks — we got your photos.</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll review them and send your quote shortly. You can close this page.
              </p>
              <Button variant="outline" onClick={() => { setDone(false); setSubmitError(null); }}>
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
                      <img
                        src={p.previewUrl}
                        alt=""
                        className={`h-full w-full object-cover transition ${
                          p.status === "done" ? "opacity-60" : p.status === "error" ? "opacity-50" : ""
                        }`}
                      />
                      {p.status === "uploading" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                      {p.status === "done" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/30">
                          <CheckCircle2 className="h-6 w-6 text-white drop-shadow" />
                        </div>
                      )}
                      {p.status === "error" && (
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-destructive/40"
                          title={p.error}
                        >
                          <AlertCircle className="h-6 w-6 text-white drop-shadow" />
                        </div>
                      )}
                      {!submitting && (
                        <button
                          type="button"
                          aria-label="Remove photo"
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                          onClick={() => removePhoto(i)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {submitting && (
                <div className="space-y-2" role="status" aria-live="polite">
                  <Progress
                    value={
                      phase === "finalizing"
                        ? 100
                        : photos.length
                          ? Math.round((uploadedCount / photos.length) * 100)
                          : 0
                    }
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {phase === "finalizing"
                      ? "Finishing up…"
                      : `Uploading photo ${Math.min(uploadedCount + 1, photos.length)} of ${photos.length}…`}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={cancelUpload}
                    disabled={cancelling || phase === "finalizing"}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {cancelling ? "Cancelling…" : "Cancel upload"}
                  </Button>
                </div>
              )}

              {submitError && !submitting && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Photos didn&apos;t send</p>
                    <p className="text-destructive/90">{submitError}</p>
                  </div>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || photos.length === 0}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {phase === "finalizing" ? "Finishing…" : "Sending…"}
                  </>
                ) : submitError ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try again
                  </>
                ) : (
                  "Send photos"
                )}
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