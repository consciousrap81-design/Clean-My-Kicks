import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { StarPicker } from "./StarRating";
import { prepareReviewPhoto, MAX_REVIEW_PHOTO_BYTES, ALLOWED_REVIEW_PHOTO_TYPES } from "@/lib/reviewPhoto";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
  defaultName?: string;
  existing?: {
    rating: number;
    title: string | null;
    body: string;
    reviewer_name: string | null;
    photo_path: string | null;
    status: string;
  } | null;
};

export default function WriteReviewDialog({
  open, onOpenChange, productId, productName, defaultName, existing,
}: Props) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [reviewerName, setReviewerName] = useState(existing?.reviewer_name ?? defaultName ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [keepExistingPhoto, setKeepExistingPhoto] = useState(!!existing?.photo_path);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function handleSubmit() {
    if (rating < 1) return toast.error("Pick a star rating first.");
    if (body.trim().length < 1) return toast.error("Write a quick review (even a sentence).");
    if (body.trim().length > 4000) return toast.error("Review is too long (max 4000 characters).");

    setSubmitting(true);
    const t = toast.loading("Submitting your review…");
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const userId = sessionRes.session?.user.id;
      if (!userId) throw new Error("You need to be signed in to leave a review.");

      // Photo upload
      let photoPath: string | null = existing?.photo_path && keepExistingPhoto ? existing.photo_path : null;
      if (file) {
        if (!ALLOWED_REVIEW_PHOTO_TYPES.includes(file.type) && !/\.(heic|jpg|jpeg|png|webp)$/i.test(file.name)) {
          throw new Error("Photo must be JPEG, PNG, or WEBP.");
        }
        const prepared = await prepareReviewPhoto(file);
        if (prepared.size > MAX_REVIEW_PHOTO_BYTES) throw new Error("Photo is still too large after compression.");
        const path = `${userId}/${productId}-${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("shop-review-photos")
          .upload(path, prepared, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        photoPath = path;
      }

      const { data, error } = await supabase.functions.invoke("submit-shop-review", {
        body: {
          productId,
          rating,
          title: title.trim() || null,
          body: body.trim(),
          photoPath,
          reviewerName: reviewerName.trim() || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success("Thanks! Your review is pending approval.", { id: t, duration: 7000 });
      qc.invalidateQueries({ queryKey: ["shop-reviews", productId] });
      qc.invalidateQueries({ queryKey: ["my-shop-review", productId] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Couldn't submit review", { id: t, description: e?.message || String(e) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit your review" : "Write a review"}</DialogTitle>
          <DialogDescription>
            {productName ? `How was your ${productName}? ` : ""}
            Reviews are checked before they go live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Your rating</Label>
            <div className="mt-1"><StarPicker value={rating} onChange={setRating} /></div>
          </div>

          <div>
            <Label htmlFor="reviewer-name">Display name (optional)</Label>
            <Input
              id="reviewer-name"
              value={reviewerName}
              maxLength={80}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="How should we show your name?"
            />
          </div>

          <div>
            <Label htmlFor="review-title">Headline (optional)</Label>
            <Input
              id="review-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a few words"
            />
          </div>

          <div>
            <Label htmlFor="review-body">Your review</Label>
            <Textarea
              id="review-body"
              value={body}
              maxLength={4000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How do they look in person? How's the fit? Would you buy again?"
              rows={5}
            />
            <div className="text-xs text-muted-foreground text-right mt-1">{body.length}/4000</div>
          </div>

          <div>
            <Label>Photo (optional)</Label>
            {(previewUrl || (existing?.photo_path && keepExistingPhoto)) ? (
              <div className="mt-2 relative inline-block">
                <img
                  src={previewUrl || "#"}
                  alt="Review photo preview"
                  className="max-h-44 rounded-md border"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  type="button"
                  className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                  onClick={() => { setFile(null); setKeepExistingPhoto(false); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="mt-1 flex items-center gap-2 border border-dashed rounded-md px-3 py-4 text-sm text-muted-foreground cursor-pointer hover:bg-muted/50">
                <ImageIcon className="w-4 h-4" />
                <span>Tap to add a photo (JPEG/PNG/WEBP)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.heic"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              We auto-resize and strip location data before upload.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : (existing ? "Update review" : "Submit review")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}