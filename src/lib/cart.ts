import { createContext, useCallback, useContext, useEffect, useState, useRef, ReactNode, createElement } from "react";
import { supabase } from "@/integrations/supabase/client";

const CART_KEY = "cmk_cart_id";

export function getCartId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(CART_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CART_KEY, id);
  }
  return id;
}

export function clearCartId() {
  if (typeof window !== "undefined") localStorage.removeItem(CART_KEY);
}

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
  photo_path?: string | null;
  max_qty?: number | null; // stock limit for accessories, 1 for sneakers
  available: boolean; // false if reserved by other / sold / out of stock
  unavailable_reason?: string;
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
};

const Ctx = createContext<CartCtx | null>(null);

const RESERVE_MINUTES = 15;

async function ensureCart(cartId: string) {
  // Ensure a cart row exists for this id.
  const { data: existing } = await supabase.from("shop_carts").select("id").eq("id", cartId).maybeSingle();
  if (!existing) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("shop_carts").insert({ id: cartId, user_id: user?.id ?? null }).select().single();
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const cartId = typeof window !== "undefined" ? getCartId() : "ssr";
  const [items, setItems] = useState<EnrichedCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const initialized = useRef(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    await ensureCart(cartId);
    const { data: rows } = await supabase
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
            .select("id, name, brand, model, size, status, reserved_until, reserved_session_id, shop_product_photos(storage_path, is_primary, sort_order)")
            .in("id", sneakerIds)
        : Promise.resolve({ data: [] as any[] }),
      variantIds.length
        ? supabase
            .from("shop_accessory_variants")
            .select("id, name, stock_qty, active, accessory_id, shop_accessories!inner(id, name, slug, active, shop_accessory_photos(storage_path, sort_order))")
            .in("id", variantIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const sneakerMap = new Map<string, any>();
    (sneakers ?? []).forEach((s: any) => sneakerMap.set(s.id, s));
    const variantMap = new Map<string, any>();
    (variants ?? []).forEach((v: any) => variantMap.set(v.id, v));

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
        const stillReserved = s.reserved_until && new Date(s.reserved_until) > new Date();
        const heldByOther = !!stillReserved && s.reserved_session_id !== cartId;
        return {
          ...row,
          display_name: [s.brand, s.model, s.name].filter(Boolean).join(" ") || s.name,
          subtitle: s.size ? `Size ${s.size}` : null,
          photo_path: photos[0]?.storage_path ?? null,
          max_qty: 1,
          available: !isSold && !heldByOther,
          unavailable_reason: isSold ? "Sold" : heldByOther ? "Reserved by another buyer" : undefined,
        };
      } else if (row.item_type === "accessory" && row.accessory_variant_id) {
        const v = variantMap.get(row.accessory_variant_id);
        if (!v) {
          return { ...row, display_name: "Removed item", available: false, unavailable_reason: "Removed", photo_path: null };
        }
        const acc = v.shop_accessories;
        const photos = (acc?.shop_accessory_photos ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
        const inStock = v.active && v.stock_qty > 0;
        return {
          ...row,
          display_name: acc?.name || "Accessory",
          subtitle: v.name && v.name !== "Default" ? v.name : null,
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

  const addSneaker = useCallback<CartCtx["addSneaker"]>(async (productId, priceCents) => {
    await ensureCart(cartId);
    // Check current state of the sneaker
    const { data: prod } = await supabase
      .from("shop_products")
      .select("id, status, reserved_until, reserved_session_id")
      .eq("id", productId)
      .maybeSingle();
    if (!prod) return { ok: false, error: "Not found" };
    const now = new Date();
    const stillReserved = prod.reserved_until && new Date(prod.reserved_until) > now;
    if (prod.status === "sold") return { ok: false, error: "Already sold" };
    if (stillReserved && prod.reserved_session_id !== cartId) {
      return { ok: false, error: "Reserved by another buyer" };
    }
    const reservedUntil = new Date(now.getTime() + RESERVE_MINUTES * 60 * 1000).toISOString();
    const { error: reserveErr } = await supabase
      .from("shop_products")
      .update({ status: "reserved", reserved_until: reservedUntil, reserved_session_id: cartId })
      .eq("id", productId);
    if (reserveErr) return { ok: false, error: reserveErr.message };

    const { error } = await supabase
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
    const { data: existing } = await supabase
      .from("shop_cart_items")
      .select("id, qty")
      .eq("cart_id", cartId)
      .eq("accessory_variant_id", variantId)
      .maybeSingle();
    const desiredQty = (existing?.qty ?? 0) + qty;
    if (desiredQty > v.stock_qty) return { ok: false, error: `Only ${v.stock_qty} in stock` };
    if (existing) {
      const { error } = await supabase.from("shop_cart_items").update({ qty: desiredQty }).eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("shop_cart_items").insert({
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
    await supabase.from("shop_cart_items").update({ qty }).eq("id", itemId);
    await refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const removeItem = useCallback<CartCtx["removeItem"]>(async (itemId) => {
    // If sneaker, release reservation
    const { data: row } = await supabase
      .from("shop_cart_items")
      .select("item_type, sneaker_product_id")
      .eq("id", itemId)
      .maybeSingle();
    await supabase.from("shop_cart_items").delete().eq("id", itemId);
    if (row?.item_type === "sneaker" && row.sneaker_product_id) {
      // Only release if reserved by us
      const { data: p } = await supabase
        .from("shop_products")
        .select("status, reserved_session_id")
        .eq("id", row.sneaker_product_id)
        .maybeSingle();
      if (p?.reserved_session_id === cartId && p?.status === "reserved") {
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
  };

  return createElement(Ctx.Provider, { value }, children);
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
