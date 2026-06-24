import { useState } from "react";
import { Loader2, ShoppingBag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getShopSessionId } from "@/lib/shop";

type Props = {
  productId: string;
  status?: string | null;
  reservedUntil?: string | null;
  reservedSessionId?: string | null;
  price?: number | null;
  className?: string;
  size?: "sm" | "default" | "lg";
  label?: string;
};

/**
 * Quick-Buy button: jumps straight to Stripe checkout for a single product,
 * matching the sticky mobile Buy bar on the product detail page.
 */
export default function BuyNowButton({
  productId,
  status,
  reservedUntil,
  reservedSessionId,
  price,
  className,
  size = "default",
  label,
}: Props) {
  const [loading, setLoading] = useState(false);
  const sessionId = getShopSessionId();

  const isSold = status === "sold";
  const stillReserved =
    status === "reserved" && reservedUntil && new Date(reservedUntil) > new Date();
  const reservedByOther = !!stillReserved && reservedSessionId !== sessionId;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading || isSold || reservedByOther) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-shop-checkout", {
        body: { productId, sessionId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Could not start checkout");
    } catch (err: any) {
      toast.error(err.message || "Could not start checkout");
      setLoading(false);
    }
  }

  if (isSold) {
    return (
      <Button disabled size={size} className={className}>
        Sold
      </Button>
    );
  }
  if (reservedByOther) {
    return (
      <Button disabled size={size} className={className}>
        <Clock className="w-4 h-4 mr-1.5" /> Reserved
      </Button>
    );
  }

  return (
    <Button onClick={handleClick} disabled={loading} size={size} className={className}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
      ) : (
        <ShoppingBag className="w-4 h-4 mr-1.5" />
      )}
      {label ?? (price != null ? `Buy — $${Number(price).toFixed(0)}` : "Buy now")}
    </Button>
  );
}