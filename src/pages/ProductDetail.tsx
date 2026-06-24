import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, Users, Clock, ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getShopSessionId, signedPhotoUrls, type ShopProduct } from "@/lib/shop";

type Photo = { id: string; storage_path: string; is_primary: boolean; sort_order: number };

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewers, setViewers] = useState(1);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const sessionId = useMemo(() => getShopSessionId(), []);
  const cancelled = search.get("cancelled") === "1";

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function load() {
      const { data: p } = await supabase.from("shop_products").select("*").eq("id", id).maybeSingle();
      const { data: ph } = await supabase
        .from("shop_product_photos")
        .select("*")
        .eq("product_id", id)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      setProduct(p as any);
      const photos = (ph ?? []) as Photo[];
      setPhotos(photos);
      const u = await signedPhotoUrls(photos.map((p) => p.storage_path));
      if (mounted) {
        setUrls(u);
        setLoading(false);
      }
    }
    load();

    // Fire view tracking
    supabase.functions.invoke("track-product-view", { body: { productId: id, sessionId } }).catch(() => {});

    // Realtime: product status updates
    const pchan = supabase
      .channel(`shop-product-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shop_products", filter: `id=eq.${id}` }, (payload) => {
        setProduct((prev) => ({ ...(prev as any), ...(payload.new as any) }));
      })
      .subscribe();

    // Presence: active viewers
    const presence = supabase.channel(`presence-product-${id}`, {
      config: { presence: { key: sessionId } },
    });
    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        setViewers(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await presence.track({ at: Date.now() });
      });

    return () => {
      mounted = false;
      supabase.removeChannel(pchan);
      supabase.removeChannel(presence);
    };
  }, [id, sessionId]);

  async function buyNow() {
    if (!product) return;
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-shop-checkout", {
        body: { productId: product.id, sessionId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Could not start checkout");
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-32 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-32 text-center">
          <h1 className="font-display text-3xl mb-4">Pair not found</h1>
          <Link to="/#shop" className="text-primary underline">Back to shop</Link>
        </div>
      </div>
    );
  }

  const display = [product.brand, product.model].filter(Boolean).join(" ") || product.name;
  const isSold = product.status === "sold";
  const isReserved = product.status === "reserved" && product.reserved_until && new Date(product.reserved_until) > new Date();
  const reservedByMe = isReserved && (product as any).reserved_session_id === sessionId;
  const canBuy = !isSold && (!isReserved || reservedByMe);
  const activePhoto = photos[activeIdx];
  const activeUrl = activePhoto ? urls[activePhoto.storage_path] : null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <Navbar />
      <div className="container px-4 pt-24 md:pt-32">
        <Link to="/#shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to shop
        </Link>

        {cancelled && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-4 py-3 text-sm">
            Checkout cancelled. Your pair is still available.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Gallery */}
          <div>
            <div className="aspect-square bg-secondary rounded-xl overflow-hidden mb-3">
              {activeUrl ? (
                <img src={activeUrl} alt={display} className="w-full h-full object-contain p-4" />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground">No photo</div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {photos.map((ph, i) => (
                  <button
                    key={ph.id}
                    onClick={() => setActiveIdx(i)}
                    className={`aspect-square bg-secondary rounded-md overflow-hidden border-2 transition ${i === activeIdx ? "border-primary" : "border-transparent"}`}
                  >
                    {urls[ph.storage_path] && (
                      <img src={urls[ph.storage_path]} alt="" className="w-full h-full object-contain p-1" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="font-display text-3xl md:text-5xl text-foreground leading-tight">{display}</h1>
            <div className="font-display text-2xl md:text-3xl text-primary mt-2">${Number(product.price).toFixed(2)}</div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              {product.size && <span><strong className="text-foreground">Size:</strong> {product.size}</span>}
              {product.condition && <span><strong className="text-foreground">Condition:</strong> {product.condition}</span>}
              <span className="inline-flex items-center gap-1"><Eye className="w-4 h-4" /> {product.view_count} views</span>
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Users className="w-4 h-4" /> {viewers} viewing now
              </span>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider bg-card border border-border rounded-full px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Only 1 available — 1-of-1 restored pair
            </div>

            {product.description && (
              <p className="mt-6 text-sm md:text-base text-foreground/80 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="mt-8">
              {isSold ? (
                <Button disabled size="lg" className="w-full md:w-auto">Sold</Button>
              ) : isReserved && !reservedByMe ? (
                <Button disabled size="lg" className="w-full md:w-auto">
                  <Clock className="w-4 h-4 mr-2" /> Reserved — completing checkout
                </Button>
              ) : (
                <Button onClick={buyNow} disabled={buying || !canBuy} size="lg" className="w-full md:w-auto">
                  {buying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
                  Buy Now — ${Number(product.price).toFixed(2)}
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Secure checkout via Stripe. Shipping included in the US.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}