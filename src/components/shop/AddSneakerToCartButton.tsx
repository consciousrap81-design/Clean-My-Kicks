import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";

type Props = {
  productId: string;
  priceDollars: number;
  status?: string | null;
  reservedUntil?: string | null;
  reservedSessionId?: string | null;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "default" | "lg";
};

export default function AddSneakerToCartButton({
  productId,
  priceDollars,
  status,
  reservedUntil,
  reservedSessionId,
  className,
  variant = "outline",
  size = "default",
}: Props) {
  const { cartId, addSneaker, setOpen } = useCart();
  const [loading, setLoading] = useState(false);

  const isSold = status === "sold";
  const stillReserved =
    status === "reserved" && reservedUntil && new Date(reservedUntil) > new Date();
  const reservedByOther = !!stillReserved && reservedSessionId !== cartId;
  const alreadyHeld = !!stillReserved && reservedSessionId === cartId;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading || isSold || reservedByOther) return;
    setLoading(true);
    const res = await addSneaker(productId, Math.round(priceDollars * 100));
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error || "Could not add to cart");
      return;
    }
    toast.success("Added — held for 15 min");
    setOpen(true);
  }

  if (isSold || reservedByOther) return null;

  return (
    <Button onClick={handleClick} disabled={loading} variant={variant} size={size} className={className}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
      ) : (
        <Plus className="w-4 h-4 mr-1.5" />
      )}
      {alreadyHeld ? "In cart" : "Add to cart"}
    </Button>
  );
}
