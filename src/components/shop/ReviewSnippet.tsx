import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/shop/StarRating";

export default function ReviewSnippet({ productId }: { productId: string }) {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("shop_reviews")
      .select("rating")
      .eq("product_id", productId)
      .eq("status", "approved")
      .then(({ data }) => {
        if (cancelled) return;
        const ratings = (data || []).map((r: any) => r.rating).filter((n: any) => typeof n === "number");
        setCount(ratings.length);
        setAvg(ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null);
      });
    return () => { cancelled = true; };
  }, [productId]);

  if (!count || avg == null) return null;

  return (
    <a href="#reviews" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
      <StarRating value={Math.round(avg)} />
      <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
      <span>· {count} review{count === 1 ? "" : "s"}</span>
    </a>
  );
}