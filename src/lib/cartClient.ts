// A dedicated Supabase client for anonymous shop-cart operations.
//
// The RLS policies on `shop_carts` / `shop_cart_items` for anon callers now
// require the request to carry an `x-cart-id` header that matches the cart's
// id. This is what scopes one anonymous shopper to their own cart so they
// can't enumerate everyone else's anonymous carts. This client sends that
// header on every request and shares auth storage with the main client so
// signed-in users keep their session here too.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getCartId } from "./cart";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const cartId = typeof window !== "undefined" ? getCartId() : "";

export const cartSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    headers: { "x-cart-id": cartId },
  },
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});