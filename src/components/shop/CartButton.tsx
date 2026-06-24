import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

export default function CartButton({ className = "" }: { className?: string }) {
  const { itemCount, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Open cart (${itemCount} item${itemCount === 1 ? "" : "s"})`}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full text-white/80 hover:text-primary transition-colors ${className}`}
    >
      <ShoppingCart className="w-5 h-5" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
          {itemCount}
        </span>
      )}
    </button>
  );
}
