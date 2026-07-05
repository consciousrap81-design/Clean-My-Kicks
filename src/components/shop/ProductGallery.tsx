import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Expand, ZoomIn, ZoomOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import BeforeAfterSlider from "./BeforeAfterSlider";

type Slide = { id: string; url: string | undefined };

export default function ProductGallery({
  slides,
  alt,
  beforeSlides = [],
}: {
  slides: Slide[];
  alt: string;
  beforeSlides?: Slide[];
}) {
  const [idx, setIdx] = useState(0);
  const [hoverZoom, setHoverZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [fullscreen, setFullscreen] = useState(false);
  const [fsZoom, setFsZoom] = useState(1);
  const [fsShowBefore, setFsShowBefore] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const total = slides.length;
  const active = slides[idx];
  const activeBefore = beforeSlides[idx];
  const hasBefore = !!(active?.url && activeBefore?.url);

  const next = () => setIdx((i) => (i + 1) % Math.max(total, 1));
  const prev = () => setIdx((i) => (i - 1 + Math.max(total, 1)) % Math.max(total, 1));

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setFullscreen(false);
      else if (e.key === "+" || e.key === "=") setFsZoom((z) => Math.min(z + 0.25, 4));
      else if (e.key === "-") setFsZoom((z) => Math.max(z - 0.25, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, total]);

  function handleMove(e: React.MouseEvent) {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  return (
    <div>
      {hasBefore ? (
        <BeforeAfterSlider beforeUrl={activeBefore!.url!} afterUrl={active!.url!} alt={alt} />
      ) : (
      <div
        ref={stageRef}
        className="relative aspect-square bg-secondary rounded-xl overflow-hidden group cursor-zoom-in"
        onMouseEnter={() => setHoverZoom(true)}
        onMouseLeave={() => setHoverZoom(false)}
        onMouseMove={handleMove}
        onClick={() => setFullscreen(true)}
      >
        {active?.url ? (
          hoverZoom ? (
            <div
              className="absolute inset-0 bg-no-repeat"
              style={{
                backgroundImage: `url(${active.url})`,
                backgroundSize: "200%",
                backgroundPosition: `${pos.x}% ${pos.y}%`,
              }}
              aria-label={`${alt} (zoomed)`}
              role="img"
            />
          ) : (
            <img src={active.url} alt={alt} className="w-full h-full object-contain p-4" />
          )
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">No photo</div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border border-border rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
          aria-label="View fullscreen"
          className="absolute top-2 right-2 bg-background/80 hover:bg-background border border-border rounded-full p-2 opacity-0 group-hover:opacity-100 transition"
        >
          <Expand className="w-4 h-4" />
        </button>

        {total > 1 && (
          <div className="absolute bottom-2 right-2 text-[11px] bg-background/80 border border-border rounded-full px-2 py-0.5">
            {idx + 1} / {total}
          </div>
        )}
      </div>
      )}

      {total > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Photo ${i + 1}`}
              className={cn(
                "aspect-square bg-secondary rounded-md overflow-hidden border-2 transition",
                i === idx ? "border-primary" : "border-transparent hover:border-border"
              )}
            >
              {s.url && <img src={s.url} alt="" className="w-full h-full object-contain p-1" />}
              {beforeSlides[i]?.url && (
                <span className="sr-only">Includes before photo</span>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[100vw] w-screen h-screen p-0 bg-black/95 border-none rounded-none flex items-center justify-center">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 z-50 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute top-4 left-4 z-50 flex gap-2">
            <button
              type="button"
              onClick={() => setFsZoom((z) => Math.max(z - 0.25, 1))}
              aria-label="Zoom out"
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setFsZoom((z) => Math.min(z + 0.25, 4))}
              aria-label="Zoom in"
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <span className="text-white/70 text-xs self-center px-2">{Math.round(fsZoom * 100)}%</span>
            {hasBefore && (
              <button
                type="button"
                onClick={() => setFsShowBefore((v) => !v)}
                className="text-white text-xs uppercase tracking-wider bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 border border-white/20"
              >
                {fsShowBefore ? "Show after" : "Show before"}
              </button>
            )}
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="w-full h-full overflow-auto flex items-center justify-center">
            {(fsShowBefore && hasBefore ? activeBefore?.url : active?.url) && (
              <img
                src={fsShowBefore && hasBefore ? activeBefore!.url! : active!.url!}
                alt={fsShowBefore ? `${alt} — before restoration` : alt}
                style={{ transform: `scale(${fsZoom})`, transition: "transform 0.15s" }}
                className="max-w-full max-h-full object-contain select-none"
                onClick={() => setFsZoom((z) => (z >= 2 ? 1 : z + 1))}
              />
            )}
          </div>

          {total > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs bg-white/10 border border-white/20 rounded-full px-3 py-1">
              {idx + 1} / {total}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}