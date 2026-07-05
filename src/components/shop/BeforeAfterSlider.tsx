import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";

type Props = {
  beforeUrl: string;
  afterUrl: string;
  alt: string;
};

export default function BeforeAfterSlider({ beforeUrl, afterUrl, alt }: Props) {
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateFromClientX]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") { setPos((p) => Math.max(0, p - 5)); e.preventDefault(); }
    else if (e.key === "ArrowRight") { setPos((p) => Math.min(100, p + 5)); e.preventDefault(); }
    else if (e.key === "Home") { setPos(0); e.preventDefault(); }
    else if (e.key === "End") { setPos(100); e.preventDefault(); }
  }

  return (
    <div>
      <div
        ref={stageRef}
        className="relative aspect-square bg-secondary rounded-xl overflow-hidden select-none touch-none"
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
      >
        {/* After (restored) — full image */}
        <img
          src={afterUrl}
          alt={`${alt} — after restoration`}
          className="absolute inset-0 w-full h-full object-contain p-4 pointer-events-none"
          draggable={false}
        />
        {/* Before — clipped to left of handle */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <img
            src={beforeUrl}
            alt={`${alt} — before restoration`}
            className="w-full h-full object-contain p-4"
            draggable={false}
          />
        </div>

        {/* Labels */}
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-background/85 border border-border rounded-full px-2 py-0.5">
          Before
        </span>
        <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-2 py-0.5">
          After
        </span>

        {/* Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] pointer-events-none"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        >
          <button
            type="button"
            role="slider"
            aria-label="Compare before and after"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDragging(true);
            }}
            className="pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white text-foreground shadow-lg border border-border grid place-items-center cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        Drag the handle to compare — <strong>before</strong> restoration vs <strong>after</strong>.
      </p>
    </div>
  );
}