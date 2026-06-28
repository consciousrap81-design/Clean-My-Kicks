import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, Users, Clock, ArrowLeft, ShoppingBag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { getShopSessionId, signedPhotoUrls, SHOP_PRODUCT_PUBLIC_COLS, fetchReservationStatus, type ShopProduct } from "@/lib/shop";
import ReviewsSection from "@/components/shop/ReviewsSection";
import ReactMarkdown from "react-markdown";
import ProductGallery from "@/components/shop/ProductGallery";
import ShareButtons from "@/components/shop/ShareButtons";
import ReviewSnippet from "@/components/shop/ReviewSnippet";
import RecentlyViewed, { trackRecentlyViewed } from "@/components/shop/RecentlyViewed";
import YouMayAlsoLike from "@/components/shop/YouMayAlsoLike";
import StockAndDelivery from "@/components/shop/StockAndDelivery";

type Photo = { id: string; storage_path: string; is_primary: boolean; sort_order: number };

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewers, setViewers] = useState(1);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const sessionId = useMemo(() => getShopSessionId(), []);
  const cancelled = search.get("cancelled") === "1";
  const [reservedByMe, setReservedByMe] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function load() {
      const { data: p } = await supabase
        .from("shop_products")
        .select(SHOP_PRODUCT_PUBLIC_COLS)
        .eq("id", id)
        .maybeSingle();
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
      const resv = await fetchReservationStatus([id!], sessionId);
      if (mounted) setReservedByMe(!!resv.get(id!)?.reserved_by_me);
    }
    load();

    // Fire view tracking
    supabase.functions.invoke("track-product-view", { body: { productId: id, sessionId } }).catch(() => {});
    trackRecentlyViewed(id);

    // Realtime: product status updates
    const pchan = supabase
      .channel(`shop-product-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shop_products", filter: `id=eq.${id}` }, async (payload) => {
        const incoming = payload.new as any;
        // Strip sensitive bookkeeping cols before merging into client state.
        const { reserved_session_id: _r, sold_order_id: _s, ...safe } = incoming ?? {};
        setProduct((prev) => ({ ...(prev as any), ...safe }));
        const resv = await fetchReservationStatus([id!], sessionId);
        setReservedByMe(!!resv.get(id!)?.reserved_by_me);
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
  const canBuy = !isSold && (!isReserved || reservedByMe);
  const ogImage = photos[0] ? urls[photos[0].storage_path] : undefined;
  const slides = photos.map((p) => ({ id: p.id, url: urls[p.storage_path] }));
  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://cleanmykicks.com/shop/${product.id}`;
  const showUrgency = !isSold && (viewers > 1 || (product.view_count ?? 0) >= 10);
  const priceUsd = ((product as any).price_cents ?? 0) / 100;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: display,
    description: (product as any).description || `${display} restored by Clean My Kicks.`,
    image: ogImage ? [ogImage] : undefined,
    brand: { "@type": "Brand", name: product.brand || "Clean My Kicks" },
    sku: product.id,
    offers: {
      "@type": "Offer",
      url: `https://cleanmykicks.com/shop/${product.id}`,
      priceCurrency: "USD",
      price: priceUsd.toFixed(2),
      availability: isSold
        ? "https://schema.org/SoldOut"
        : isReserved
        ? "https://schema.org/LimitedAvailability"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/RefurbishedCondition",
    },
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <Seo
        title={`${display} — Restored Sneakers | Clean My Kicks`}
        description={((product as any).description || `${display} restored, cleaned, and ready to ship from Denton, TX. Shop one-of-one pairs at Clean My Kicks.`).slice(0, 160)}
        path={`/shop/${product.id}`}
        image={ogImage}
        type="product"
        jsonLd={productJsonLd}
        noindex={isSold}
      />
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
          <ProductGallery slides={slides} alt={display} />

          {/* Details */}
          <div>
            <h1 className="font-display text-3xl md:text-5xl text-foreground leading-tight">{display}</h1>
            {product.name && product.name !== display && (
              <div className="mt-1 text-base md:text-lg text-muted-foreground font-medium">
                {product.name}
              </div>
            )}
            <div className="mt-2"><ReviewSnippet productId={product.id} /></div>
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
            {showUrgency && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900 rounded-full px-3 py-1 ml-0 md:ml-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                {viewers > 1 ? `${viewers} people viewing right now` : "High interest — going fast"}
              </div>
            )}

            <StockAndDelivery
              isSold={isSold}
              isReserved={!!isReserved}
              reservedByMe={!!reservedByMe}
              reservedUntil={product.reserved_until as any}
            />

            {product.description && (
              <div className="mt-6 text-sm md:text-base text-foreground/80 leading-relaxed prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-display prose-strong:text-foreground">
                <ReactMarkdown>{product.description}</ReactMarkdown>
              </div>
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

            <div className="mt-6 pt-6 border-t border-border">
              <ShareButtons url={shareUrl} title={display} />
            </div>
          </div>
        </div>

        <div id="reviews">
          <ReviewsSection productId={product.id} productName={display} />
        </div>

        <YouMayAlsoLike productId={product.id} brand={product.brand} model={product.model} />

        <RecentlyViewed excludeId={product.id} />
      </div>
      <Footer />

      {/* Sticky mobile Buy bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg text-primary leading-none">
            ${Number(product.price).toFixed(0)}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {isSold ? "Sold" : isReserved && !reservedByMe ? "Reserved" : "Free US shipping"}
          </div>
        </div>
        {isSold ? (
          <Button disabled size="lg" className="shrink-0">
            Sold
          </Button>
        ) : isReserved && !reservedByMe ? (
          <Button disabled size="lg" className="shrink-0">
            <Clock className="w-4 h-4 mr-1" /> Reserved
          </Button>
        ) : (
          <Button onClick={buyNow} disabled={buying || !canBuy} size="lg" className="shrink-0">
            {buying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ShoppingBag className="w-4 h-4 mr-1" />}
            Buy now
          </Button>
        )}
      </div>
    </div>
  );
}