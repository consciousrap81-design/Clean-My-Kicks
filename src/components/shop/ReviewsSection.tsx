import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, BadgeCheck, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StarRating } from "./StarRating";
import WriteReviewDialog from "./WriteReviewDialog";
import { Link } from "react-router-dom";

type Review = {
  id: string;
  product_id: string;
  user_id: string;
  reviewer_name: string | null;
  rating: number;
  title: string | null;
  body: string;
  photo_path: string | null;
  status: string;
  created_at: string;
};

type Props = { productId: string; productName?: string };

type Sort = "recent" | "highest" | "lowest" | "photos";

export default function ReviewsSection({ productId, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["shop-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_reviews")
        .select("id, product_id, user_id, reviewer_name, rating, title, body, photo_path, status, created_at")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Review[]) || [];
    },
  });

  const { data: myReview } = useQuery({
    queryKey: ["my-shop-review", productId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_reviews")
        .select("id, rating, title, body, photo_path, reviewer_name, status")
        .eq("product_id", productId)
        .eq("user_id", userId!)
        .maybeSingle();
      return data;
    },
  });

  // Eligibility (verified buyer)
  const { data: eligible } = useQuery({
    queryKey: ["shop-review-eligible", productId, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_orders")
        .select("id")
        .eq("user_id", userId!)
        .eq("product_id", productId)
        .in("status", ["paid", "shipped", "delivered"])
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
  });

  // Sign photo URLs for approved reviews (admins' signed URL works for everyone via service role? no — anyone reading approved can still request a signed URL via createSignedUrl with anon? The bucket is private. We need a public-readable signed URL. RLS on storage.objects doesn't grant anon SELECT on these files. We expose via the signed URL endpoint, which requires the user to be authenticated as the owner OR admin. For PUBLIC visibility, we'd need to either flip the bucket public for approved, or proxy through an edge function. Simplest: keep private, but add a SELECT policy that allows anyone to read files referenced by an approved review.)
  useEffect(() => {
    const paths = reviews.map((r) => r.photo_path).filter(Boolean) as string[];
    if (paths.length === 0) return;
    (async () => {
      const out: Record<string, string> = {};
      const { data } = await supabase.storage.from("shop-review-photos").createSignedUrls(paths, 60 * 60 * 24);
      data?.forEach((s) => { if (s.path && s.signedUrl) out[s.path] = s.signedUrl; });
      setPhotoUrls(out);
    })();
  }, [reviews]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
      pct: total ? (reviews.filter((r) => r.rating === star).length / total) * 100 : 0,
    }));
    return { total, avg, dist };
  }, [reviews]);

  const sorted = useMemo(() => {
    const arr = [...reviews];
    switch (sort) {
      case "highest": return arr.sort((a, b) => b.rating - a.rating || +new Date(b.created_at) - +new Date(a.created_at));
      case "lowest": return arr.sort((a, b) => a.rating - b.rating || +new Date(b.created_at) - +new Date(a.created_at));
      case "photos": return arr.filter((r) => r.photo_path);
      case "recent":
      default: return arr;
    }
  }, [reviews, sort]);

  const canWrite = !!userId && !!eligible && (!myReview || myReview.status === "pending");

  return (
    <section id="reviews" className="mt-12 scroll-mt-20">
      <header className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Customer reviews
          </h2>
          {stats.total > 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={stats.avg} size={18} />
              <span className="text-sm text-muted-foreground">
                {stats.avg.toFixed(1)} · {stats.total} review{stats.total === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">No reviews yet — be the first.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats.total > 0 && (
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="highest">Highest rated</SelectItem>
                <SelectItem value="lowest">Lowest rated</SelectItem>
                <SelectItem value="photos">With photos</SelectItem>
              </SelectContent>
            </Select>
          )}
          {canWrite ? (
            <Button onClick={() => setOpen(true)}>
              {myReview ? "Edit your review" : "Write a review"}
            </Button>
          ) : !userId ? (
            <Button variant="outline" asChild>
              <Link to="/auth">Sign in to review</Link>
            </Button>
          ) : !eligible ? (
            <span className="text-xs text-muted-foreground">Only verified buyers can review.</span>
          ) : myReview ? (
            <Badge variant="secondary" className="capitalize">Your review: {myReview.status}</Badge>
          ) : null}
        </div>
      </header>

      {stats.total > 0 && (
        <div className="grid gap-6 md:grid-cols-[260px_1fr] mb-6">
          <Card className="p-4 space-y-2">
            {stats.dist.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-muted-foreground">{d.star}★</span>
                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="w-8 text-right text-xs text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">
          {sort === "photos" ? "No photo reviews yet." : "No reviews yet."}
        </p>
      ) : (
        <ul className="space-y-5">
          {sorted.map((r) => (
            <li key={r.id}>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} />
                    {r.title && <span className="font-medium">{r.title}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {r.reviewer_name || "Verified buyer"} · Verified buyer
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                {r.photo_path && photoUrls[r.photo_path] && (
                  <button
                    type="button"
                    onClick={() => setLightbox(photoUrls[r.photo_path!])}
                    className="mt-3 inline-block"
                  >
                    <img
                      src={photoUrls[r.photo_path]}
                      alt="Customer review photo"
                      className="max-h-40 rounded-md border hover:opacity-90 transition"
                      loading="lazy"
                    />
                  </button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Review photo" className="max-h-[90vh] max-w-full rounded" />
        </div>
      )}

      {/* SEO: JSON-LD AggregateRating + reviews */}
      {stats.total > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: productName,
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: stats.avg.toFixed(1),
                reviewCount: stats.total,
              },
              review: sorted.slice(0, 10).map((r) => ({
                "@type": "Review",
                reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
                author: { "@type": "Person", name: r.reviewer_name || "Verified buyer" },
                datePublished: r.created_at,
                reviewBody: r.body,
                name: r.title || undefined,
              })),
            }),
          }}
        />
      )}

      <WriteReviewDialog
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        productName={productName}
        defaultName={userEmail?.split("@")[0]}
        existing={myReview as any}
      />
    </section>
  );
}