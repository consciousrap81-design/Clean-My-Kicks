import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "cmk_shop_session";

export function getShopSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function signedPhotoUrl(path: string | null | undefined, expiresIn = 60 * 60): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("shop-products").createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function signedPhotoUrls(paths: string[], expiresIn = 60 * 60): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    paths.map(async (p) => {
      const u = await signedPhotoUrl(p, expiresIn);
      if (u) out[p] = u;
    }),
  );
  return out;
}

export type ShopProduct = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  condition: string | null;
  description: string | null;
  price: number;
  status: "draft" | "available" | "reserved" | "sold" | "archived";
  view_count: number;
  reserved_until: string | null;
  sold_at: string | null;
  created_at: string;
};

/**
 * Columns on shop_products that are safe to expose to anon / authenticated.
 * Excludes reserved_session_id and sold_order_id (internal bookkeeping).
 * Use this everywhere instead of `select("*")` for non-admin queries.
 */
export const SHOP_PRODUCT_PUBLIC_COLS =
  "id, name, brand, model, size, condition, description, price, status, view_count, reserved_until, sold_at, created_at, updated_at";

export type ReservationStatus = {
  id: string;
  status: string;
  reserved_until: string | null;
  reserved_by_me: boolean;
};

/**
 * Fetch reservation status (held / by-me) for a batch of products without
 * exposing the underlying reserved_session_id.
 */
export async function fetchReservationStatus(
  productIds: string[],
  sessionId: string,
): Promise<Map<string, ReservationStatus>> {
  const out = new Map<string, ReservationStatus>();
  if (!productIds.length) return out;
  const { data } = await supabase.rpc("shop_products_reservation_for_session", {
    p_ids: productIds,
    p_session: sessionId,
  });
  (data ?? []).forEach((r: any) => out.set(r.id, r as ReservationStatus));
  return out;
}