import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = 16,
  className,
}: { value: number; size?: number; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= Math.round(value) ? "fill-orange-500 text-orange-500" : "text-muted-foreground/40"}
        />
      ))}
    </div>
  );
}

export function StarPicker({
  value,
  onChange,
  size = 28,
}: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className="p-0.5 rounded hover:scale-110 transition"
        >
          <Star
            width={size}
            height={size}
            className={n <= value ? "fill-orange-500 text-orange-500" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}