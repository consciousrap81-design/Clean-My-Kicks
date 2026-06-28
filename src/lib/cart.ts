import { createContext, useCallback, useContext, useEffect, useState, useRef, ReactNode, createElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cartSupabase } from "./cartClient";
import { clearCartId, getCartId } from "./cartId";

export type CartItemRow = {
  id: string;
  cart_id: string;
  item_type: "sneaker" | "accessory";
  sneaker_product_id: string | null;
  accessory_variant_id: string | null;
  qty: number;
  unit_price_cents: number;
  reserved_until: string | null;
  created_at: string;
};

export type EnrichedCartItem = CartItemRow & {
  display_name: string;
  subtitle?: string | null;
  variant_name?: string | null;
  sku?: string | null;
  photo_path?: string | null;
  max_qty?: number | null; // stock limit for accessories, 1 for sneakers
  available: boolean; // false if reserved by other / sold / out of stock
  unavailable_reason?: string;
  reservation_expired?: boolean; // sneakers only
};

type CartCtx = {
  cartId: string;
  items: EnrichedCartItem[];
  loading: boolean;
  totalCents: number;
  itemCount: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  refresh: () => Promise<void>;
  addSneaker: (productId: string, priceCents: number) => Promise<{ ok: boolean; error?: string }>;
  addAccessory: (variantId: string, priceCents: number, qty?: number) => Promise<{ ok: boolean; error?: string }>;
  updateQty: (itemId: string, qty: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  promo: AppliedPromo | null;
  applyPromo: (code: string) => Promise<{ ok: boolean; error?: string }>;
  clearPromo: () => Promise<void>;
  shippingMethod: "standard" | "express";
  setShippingMethod: (m: "standard" | "express") => void;
};

export type AppliedPromo = {
  code: string;
  discount_cents: number;
  discount_type: "percent" | "fixed";
  amount: number;
  applies_to: "all" | "accessories" | "sneakers";
  description: string;
};

const Ctx = createContext<CartCtx | null>(null);

const RESERVE_MINUTES = 15;

async function ensureCart(cartId: string) {
  // Ensure a cart row exists for this id.
  const { data: existing } = await cartSupabase.from("shop_carts").select("id").eq("id", cartId).maybeSingle();
  if (!existing) {
    const { data: { user } } = await supabase.auth.getUser();
    await cartSupabase.from("shop_carts").insert({ id: cartId, user_id: user?.id ?? null }).select().single();
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const cartId = typeof window !== "undefined" ? getCartId() : "ssr";
  const [items, setItems] = useState<EnrichedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [shippingMethod, setShippingMethodState] = useState<"standard" | "express">(() => {
    if (typeof window === "undefined") return "standard";
    return (localStorage.getItem("cmk_ship") as "standard" | "express") || "standard";
  });
  const setShippingMethod = useCallback((m: "standard" | "express") => {
    setShippingMethodState(m);
    if (typeof window !== "undefined") localStorage.setItem("cmk_ship", m);
  }, []);
  const initialized = useRef(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    await ensureCart(cartId);
    const { data: rows } = await cartSupabase
      .from("shop_cart_items")
      .select("*")
      .eq("cart_id", cartId)
      .order("created_at", { ascending: true });
    const raw = (rows ?? []) as CartItemRow[];
    const sneakerIds = raw.filter((r) => r.sneaker_product_id).map((r) => r.sneaker_product_id!);
    const variantIds = raw.filter((r) => r.accessory_variant_id).map((r) => r.accessory_variant_id!);

    const [{ data: sneakers }, { data: variants }] = await Promise.all([
      sneakerIds.length
        ? supabase
            .from("shop_products")
            .select("id, name, brand, model, size, status, reserved_until, shop_product_photos(storage_path, is_primary, sort_order)")
            .in("id", sneakerIds)
        : Promise.resolve({ data: [] as any[] }),
      variantIds.length
        ? supabase
            .from("shop_accessory_variants")
            .select("id, name, sku, stock_qty, active, accessory_id, shop_accessories!inner(id, name, slug, active, shop_accessory_photos(storage_path, sort_order))")
            .in("id", variantIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const sneakerMap = new Map<string, any>();
    (sneakers ?? []).forEach((s: any) => sneakerMap.set(s.id, s));
    const variantMap = new Map<string, any>();
    (variants ?? []).forEach((v: any) => variantMap.set(v.id, v));

    // Per-session reservation ownership (no longer readable from the table directly).
    let resvMap = new Map<string, boolean>();
    if (sneakerIds.length) {
      const { data: resv } = await supabase.rpc("shop_products_reservation_for_session", {
        p_ids: sneakerIds,
        p_session: cartId,
      });
      (resv ?? []).forEach((r: any) => resvMap.set(r.id, !!r.reserved_by_me));
    }

    const enriched: EnrichedCartItem[] = raw.map((row) => {
      if (row.item_type === "sneaker" && row.sneaker_product_id) {
        const s = sneakerMap.get(row.sneaker_product_id);
        if (!s) {
          return { ...row, display_name: "Removed item", available: false, unavailable_reason: "Removed", photo_path: null };
        }
        const photos = (s.shop_product_photos ?? []).slice().sort(
          (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order,
        );
        const isSold = s.status === "sold";
        const now = new Date();
        const stillReserved = s.reserved_until && new Date(s.reserved_until) > now;
        const heldByOther = !!stillReserved && !resvMap.get(s.id);
        const ourReservation = !heldByOther && row.reserved_until ? new Date(row.reserved_until) : null;
        const reservationExpired =
          !isSold && !heldByOther && (!stillReserved || (ourReservation !== null && ourReservation <= now));
        return {
          ...row,
          display_name: [s.brand, s.model, s.name].filter(Boolean).join(" ") || s.name,
          subtitle: s.size ? `Size ${s.size}` : null,
          photo_path: photos[0]?.storage_path ?? null,
          max_qty: 1,
          available: !isSold && !heldByOther && !reservationExpired,
          unavailable_reason: isSold
            ? "Sold"
            : heldByOther
            ? "Reserved by another buyer"
            : reservationExpired
            ? "Reservation expired — re-add to checkout"
            : undefined,
          reservation_expired: reservationExpired,
        };
      } else if (row.item_type === "accessory" && row.accessory_variant_id) {
        const v = variantMap.get(row.accessory_variant_id);
        if (!v) {
          return { ...row, display_name: "Removed item", available: false, unavailable_reason: "Removed", photo_path: null };
        }
        const acc = v.shop_accessories;
        const photos = (acc?.shop_accessory_photos ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
        const inStock = v.active && v.stock_qty > 0;
        const variantLabel = v.name && v.name !== "Default" ? v.name : null;
        const subtitleParts = [variantLabel, v.sku ? `SKU ${v.sku}` : null].filter(Boolean);
        return {
          ...row,
          display_name: acc?.name || "Accessory",
          subtitle: subtitleParts.length ? subtitleParts.join(" · ") : null,
          variant_name: variantLabel,
          sku: v.sku ?? null,
          photo_path: photos[0]?.storage_path ?? null,
          max_qty: v.stock_qty,
          available: inStock && row.qty <= v.stock_qty,
          unavailable_reason: !inStock ? "Out of stock" : row.qty > v.stock_qty ? `Only ${v.stock_qty} left` : undefined,
        };
      }
      return { ...row, display_name: "Item", available: false, photo_path: null };
    });

    setItems(enriched);
    setLoading(false);
  }, [cartId]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    refresh();
  }, [refresh]);

  // Realtime: react to accessory stock changes for variants in this cart.
  const variantIdsKey = items
    .map((i) => i.accessory_variant_id)
    .filter(Boolean)
    .join(",");
  useEffect(() => {
    if (!variantIdsKey) return;
    const variantIds = new Set(variantIdsKey.split(","));
    const channel = supabase
      .channel(`cart-stock-${cartId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shop_accessory_variants" },
        (payload) => {
          const id = (payload.new as any)?.id;
          if (id && variantIds.has(id)) refresh();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [variantIdsKey, cartId, refresh]);

  // Recompute discount whenever items change while a promo is applied.
  useEffect(() => {
    if (!promo) return;
    const subtotal = items.reduce((s, it) => s + it.unit_price_cents * it.qty, 0);
    const eligible = items
      .filter((it) =>
        promo.applies_to === "all" ||
        (promo.applies_to === "sneakers" && it.item_type === "sneaker") ||
        (promo.applies_to === "accessories" && it.item_type === "accessory"),
      )
      .reduce((s, it) => s + it.unit_price_cents * it.qty, 0);
    if (eligible === 0) {
      // No longer applicable
      setPromo(null);
      cartSupabase.from("shop_carts").update({ applied_promo_code: null }).eq("id", cartId).then(() => {});
      return;
    }
    const recomputed = promo.discount_type === "percent"
      ? Math.floor((eligible * promo.amount) / 100)
      : Math.min(eligible, promo.amount);
    if (recomputed !== promo.discount_cents) {
      setPromo({ ...promo, discount_cents: recomputed });
    }
    // capping by subtotal
    void subtotal;
  }, [items, promo, cartId]);

  // Load persisted promo on init
  useEffect(() => {
    (async () => {
      const { data } = await cartSupabase
        .from("shop_carts")
        .select("applied_promo_code")
        .eq("id", cartId)
        .maybeSingle();
      const code = data?.applied_promo_code;
      if (code) {
        // Silently re-validate so we get a fresh discount amount.
        const res = await supabase.functions.invoke("validate-promo-code", { body: { cartId, code } });
        if (res.data && !res.data.error) setPromo(res.data as AppliedPromo);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId]);

  const addSneaker = useCallback<CartCtx["addSneaker"]>(async (productId, priceCents) => {
    await ensureCart(cartId);
    // Check current state of the sneaker
    const { data: prod } = await supabase
      .from("shop_products")
      .select("id, status, reserved_until")
      .eq("id", productId)
      .maybeSingle();
    if (!prod) return { ok: false, error: "Not found" };
    const now = new Date();
    const stillReserved = prod.reserved_until && new Date(prod.reserved_until) > now;
    if (prod.status === "sold") return { ok: false, error: "Already sold" };
    if (stillReserved) {
      const { data: resv } = await supabase.rpc("shop_products_reservation_for_session", {
        p_ids: [productId],
        p_session: cartId,
      });
      const mine = !!(resv ?? [])[0]?.reserved_by_me;
      if (!mine) return { ok: false, error: "Reserved by another buyer" };
    }
    const reservedUntil = new Date(now.getTime() + RESERVE_MINUTES * 60 * 1000).toISOString();
    const { error: reserveErr } = await supabase
      .from("shop_products")
      .update({ status: "reserved", reserved_until: reservedUntil, reserved_session_id: cartId })
      .eq("id", productId);
    if (reserveErr) return { ok: false, error: reserveErr.message };

    const { error } = await cartSupabase
      .from("shop_cart_items")
      .upsert(
        {
          cart_id: cartId,
          item_type: "sneaker",
          sneaker_product_id: productId,
          qty: 1,
          unit_price_cents: priceCents,
          reserved_until: reservedUntil,
        },
        { onConflict: "cart_id,sneaker_product_id" },
      );
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  }, [cartId, refresh]);

  const addAccessory = useCallback<CartCtx["addAccessory"]>(async (variantId, priceCents, qty = 1) => {
    await ensureCart(cartId);
    const { data: v } = await supabase
      .from("shop_accessory_variants")
      .select("id, stock_qty, active")
      .eq("id", variantId)
      .maybeSingle();
    if (!v || !v.active) return { ok: false, error: "Unavailable" };
    const { data: existing } = await cartSupabase
      .from("shop_cart_items")
      .select("id, qty")
      .eq("cart_id", cartId)
      .eq("accessory_variant_id", variantId)
      .maybeSingle();
    const desiredQty = (existing?.qty ?? 0) + qty;
    if (desiredQty > v.stock_qty) return { ok: false, error: `Only ${v.stock_qty} in stock` };
    if (existing) {
      const { error } = await cartSupabase.from("shop_cart_items").update({ qty: desiredQty }).eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await cartSupabase.from("shop_cart_items").insert({
        cart_id: cartId,
        item_type: "accessory",
        accessory_variant_id: variantId,
        qty,
        unit_price_cents: priceCents,
      });
      if (error) return { ok: false, error: error.message };
    }
    await refresh();
    return { ok: true };
  }, [cartId, refresh]);

  const updateQty = useCallback<CartCtx["updateQty"]>(async (itemId, qty) => {
    if (qty < 1) return removeItem(itemId);
    await cartSupabase.from("shop_cart_items").update({ qty }).eq("id", itemId);
    await refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const removeItem = useCallback<CartCtx["removeItem"]>(async (itemId) => {
    // If sneaker, release reservation
    const { data: row } = await cartSupabase
      .from("shop_cart_items")
      .select("item_type, sneaker_product_id")
      .eq("id", itemId)
      .maybeSingle();
    await cartSupabase.from("shop_cart_items").delete().eq("id", itemId);
    if (row?.item_type === "sneaker" && row.sneaker_product_id) {
      // Only release if this cart owns the reservation.
      const { data: resv } = await supabase.rpc("shop_products_reservation_for_session", {
        p_ids: [row.sneaker_product_id],
        p_session: cartId,
      });
      const r = (resv ?? [])[0];
      if (r?.reserved_by_me && r?.status === "reserved") {
        await supabase
          .from("shop_products")
          .update({ status: "available", reserved_until: null, reserved_session_id: null })
          .eq("id", row.sneaker_product_id);
      }
    }
    await refresh();
  }, [cartId, refresh]);

  const totalCents = items.reduce((s, it) => s + it.unit_price_cents * it.qty, 0);
  const itemCount = items.reduce((s, it) => s + it.qty, 0);

  const applyPromo = useCallback<CartCtx["applyPromo"]>(async (code) => {
    const res = await supabase.functions.invoke("validate-promo-code", {
      body: { cartId, code: code.trim().toUpperCase() },
    });
    if (res.error) return { ok: false, error: res.error.message };
    if (res.data?.error) return { ok: false, error: res.data.error };
    setPromo(res.data as AppliedPromo);
    return { ok: true };
  }, [cartId]);

  const clearPromo = useCallback<CartCtx["clearPromo"]>(async () => {
    setPromo(null);
    await cartSupabase.from("shop_carts").update({ applied_promo_code: null }).eq("id", cartId);
  }, [cartId]);

  const value: CartCtx = {
    cartId,
    items,
    loading,
    totalCents,
    itemCount,
    open,
    setOpen,
    refresh,
    addSneaker,
    addAccessory,
    updateQty,
    removeItem,
    promo,
    applyPromo,
    clearPromo,
    shippingMethod,
    setShippingMethod,
  };

  return createElement(Ctx.Provider, { value }, children);
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
