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