import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, ArrowRight, Sparkles, Wrench, Paintbrush, Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { signedPhotoUrls, type ShopProduct } from "@/lib/shop";
import BuyNowButton from "@/components/shop/BuyNowButton";
import AddSneakerToCartButton from "@/components/shop/AddSneakerToCartButton";
import AccessoryCard, { type AccessoryRow } from "@/components/shop/AccessoryCard";
import serviceClean from "@/assets/service-clean.jpg";
import serviceRestore from "@/assets/service-restore.jpg";
import serviceCustom from "@/assets/service-custom.jpg";

type Row = ShopProduct & { photo_path: string | null };

const KNOWN_BRANDS = ["Jordan", "Nike", "Adidas", "New Balance", "Yeezy"];

function normalizeBrand(b: string | null): string {
  if (!b) return "Other";
  const lower = b.toLowerCase();
  for (const brand of KNOWN_BRANDS) {
    if (lower.includes(brand.toLowerCase())) return brand;
  }
  return "Other";
}

const serviceCards = [
  {
    title: "Basic Clean",
    blurb: "Surface clean + sole + laces. Fresh in 3–5 days.",
    price: "from $40",
    image: serviceClean,
    icon: Sparkles,
  },
  {
    title: "Deep Clean",
    blurb: "Inside-out clean, stain treatment, deodorize.",
    price: "from $60",
    image: serviceRestore,
    icon: Paintbrush,
    popular: true,
  },
  {
    title: "Full Restoration",
    blurb: "Unyellowing, paint touch-ups, sole work.",
    price: "by quote",
    image: serviceCustom,
    icon: Wrench,
  },
];

export default function ShopPage() {
  const [products, setProducts] = useState<Row[]>([]);
  const [recentlySold, setRecentlySold] = useState<{ id: string; name: string; sold_at: string }[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [accessories, setAccessories] = useState<AccessoryRow[]>([]);
  const [brand, setBrand] = useState<string>("All");
  const [size, setSize] = useState<string>("All");
  const [condition, setCondition] = useState<string>("All");
  const [query, setQuery] = useState<string>("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "popular">("newest");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: live }, { data: sold }] = await Promise.all([
        supabase
          .from("shop_products")
          .select("*, shop_product_photos(storage_path, is_primary, sort_order)")
          .in("status", ["available", "reserved"])
          .order("created_at", { ascending: false }),
        supabase
          .from("shop_products")
          .select("id, name, brand, model, sold_at")
          .eq("status", "sold")
          .not("sold_at", "is", null)
          .order("sold_at", { ascending: false })
          .limit(5),
      ]);

      const { data: accs } = await supabase
        .from("shop_accessories")
        .select("id, name, slug, description, category, base_price_cents, shop_accessory_variants(id, name, stock_qty, active, price_cents_override, sort_order), shop_accessory_photos(storage_path, sort_order)")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (mounted) setAccessories((accs ?? []) as any);

      const rows: Row[] = (live ?? []).map((p: any) => {
        const photos = (p.shop_product_photos ?? []).sort(
          (a: any, b: any) =>
            (b.is_primary === true ? 1 : 0) - (a.is_primary === true ? 1 : 0) || a.sort_order - b.sort_order,
        );
        return { ...p, photo_path: photos[0]?.storage_path ?? null };
      });
      if (!mounted) return;
      setProducts(rows);
      setRecentlySold(
        (sold ?? []).map((s: any) => ({
          id: s.id,
          name: [s.brand, s.model, s.name].filter(Boolean).join(" "),
          sold_at: s.sold_at,
        })),
      );
      const u = await signedPhotoUrls(rows.map((r) => r.photo_path).filter(Boolean) as string[]);
      if (mounted) {
        setUrls(u);
        setLoading(false);
      }
    }
    load();

    const channel = supabase
      .channel("shop-page-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_products" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_accessory_variants" }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    for (const p of products) {
      const b = normalizeBrand(p.brand);
      counts[b] = (counts[b] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const brandOptions = useMemo(() => {
    const present = ["All", ...KNOWN_BRANDS.filter((b) => brandCounts[b]), ...(brandCounts.Other ? ["Other"] : [])];
    return present;
  }, [brandCounts]);

  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.size && set.add(p.size));
    return ["All", ...Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b))];
  }, [products]);

  const conditionOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.condition && set.add(p.condition));
    return ["All", ...Array.from(set)];
  }, [products]);

  const filtered = products.filter((p) => {
    if (brand !== "All" && normalizeBrand(p.brand) !== brand) return false;
    if (size !== "All" && p.size !== size) return false;
    if (condition !== "All" && p.condition !== condition) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const hay = [p.name, p.brand, p.model, p.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "price_asc":
        arr.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price_desc":
        arr.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "popular":
        arr.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
        break;
      case "newest":
      default:
        arr.sort(
          (a, b) => new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime(),
        );
    }
    return arr;
  }, [filtered, sort]);

  const resetFilters = () => {
    setBrand("All");
    setSize("All");
    setCondition("All");
    setQuery("");
    setSort("newest");
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />

      {/* Hero */}
      <section className="bg-slate-100 pt-24 md:pt-32 pb-10 md:pb-16 border-b border-border">
        <div className="container px-4">
          <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">Shop</span>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-foreground mt-3 leading-tight">
            RESTORED KICKS
          </h1>
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-2xl mt-3 md:mt-4">
            Hand-restored, one-of-one pairs. Every drop is a single pair — when it's gone, it's gone.
            Free US shipping. Secure Stripe checkout.
          </p>

          {recentlySold.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {recentlySold.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1 text-[11px] md:text-xs text-muted-foreground"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span>sold {formatDistanceToNow(new Date(s.sold_at), { addSuffix: true })}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filters + grid */}
      <section className="py-10 md:py-16">
        <div className="container px-4">
          {/* Search */}
          <div className="relative mb-4 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand, model, or keyword…"
              className="pl-9 pr-9 h-11"
              aria-label="Search products"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Brand chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {brandOptions.map((b) => (
              <button
                key={b}
                onClick={() => setBrand(b)}
                className={`px-3 md:px-4 py-1.5 rounded-full border text-xs md:text-sm font-body transition ${
                  brand === b
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                {b}
                <span className="ml-1.5 text-[10px] opacity-60">{brandCounts[b] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Secondary filters */}
          <div className="flex flex-wrap items-center gap-3 mb-8 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px] md:text-xs">Size</span>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="bg-card border border-border rounded-md px-2 py-1 text-foreground"
              >
                {sizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px] md:text-xs">Condition</span>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="bg-card border border-border rounded-md px-2 py-1 text-foreground"
              >
                {conditionOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px] md:text-xs">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="bg-card border border-border rounded-md px-2 py-1 text-foreground"
                aria-label="Sort products"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Most popular</option>
              </select>
            </div>
            {(brand !== "All" || size !== "All" || condition !== "All" || query) && (
              <button onClick={resetFilters} className="text-primary underline underline-offset-2 text-xs">
                Reset
              </button>
            )}
            <div className="ml-auto text-muted-foreground">
              {sorted.length} {sorted.length === 1 ? "pair" : "pairs"}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground mb-4">
                {products.length === 0
                  ? "No pairs available right now. Check back soon — new drops weekly."
                  : "No pairs match those filters."}
              </p>
              {products.length > 0 && (
                <Button variant="outline" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {sorted.map((p, index) => {
                const img = p.photo_path ? urls[p.photo_path] : null;
                const reserved = p.status === "reserved";
                const display = [p.brand, p.model].filter(Boolean).join(" ") || p.name;
                return (
                  <Link
                    to={`/shop/${p.id}`}
                    key={p.id}
                    className="group bg-card rounded-xl md:rounded-2xl overflow-hidden border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-500 flex flex-col"
                    style={{ animationDelay: `${index * 0.04}s` }}
                  >
                    <div className="relative aspect-square overflow-hidden bg-secondary">
                      {img ? (
                        <img
                          src={img}
                          alt={display}
                          loading="lazy"
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">
                          No photo
                        </div>
                      )}
                      {reserved && (
                        <Badge className="absolute top-2 left-2 bg-amber-500 text-white border-0 gap-1">
                          <Clock className="w-3 h-3" /> Reserved
                        </Badge>
                      )}
                      <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-black/60 text-white text-[10px] rounded-full px-2 py-0.5">
                        <Eye className="w-3 h-3" />
                        {p.view_count}
                      </div>
                    </div>
                    <div className="p-3 md:p-4 flex-1 flex flex-col">
                      <div className="font-display text-sm md:text-base text-foreground line-clamp-2 leading-tight">
                        {display}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        {p.size && <span>Size {p.size}</span>}
                        {p.size && p.condition && <span>•</span>}
                        {p.condition && <span>{p.condition}</span>}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="font-display text-lg md:text-xl text-primary">
                          ${Number(p.price).toFixed(0)}
                        </span>
                        <span className="text-xs text-primary inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          View <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                      <BuyNowButton
                        productId={p.id}
                        status={p.status}
                        reservedUntil={(p as any).reserved_until}
                        reservedSessionId={(p as any).reserved_session_id}
                        price={Number(p.price)}
                        className="w-full h-9 mt-3 text-xs"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Service cards */}
      <section className="py-12 md:py-20 bg-slate-100 border-t border-border">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <span className="text-primary font-body text-xs md:text-sm uppercase tracking-widest">
                Got your own pair?
              </span>
              <h2 className="font-display text-3xl md:text-5xl text-foreground mt-2">
                BRING YOUR KICKS BACK
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">
                We don't just sell restored pairs — we restore yours too. Drop them off, ship them in, or book a pickup.
              </p>
            </div>
            <Link to="/#services" className="hidden md:inline-flex items-center text-primary text-sm hover:underline">
              See full pricing <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {serviceCards.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.title}
                  to="/#booking"
                  className={`group relative rounded-xl md:rounded-2xl overflow-hidden border bg-card transition-all duration-300 ${
                    s.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  {s.popular && (
                    <div className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Most popular
                    </div>
                  )}
                  <div className="relative h-32 md:h-40 overflow-hidden">
                    <img
                      src={s.image}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-primary" />
                      <h3 className="font-display text-lg md:text-xl text-foreground">{s.title}</h3>
                    </div>
                    <div className="text-primary text-sm font-body mb-2">{s.price}</div>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3">{s.blurb}</p>
                    <span className="inline-flex items-center text-xs md:text-sm text-foreground group-hover:text-primary transition-colors">
                      Book now <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden mt-6 text-center">
            <Link to="/#services" className="text-primary text-sm underline">
              See full pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}