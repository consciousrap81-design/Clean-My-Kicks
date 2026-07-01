import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Verifies that the sensitive bookkeeping columns on shop_products
 * (reserved_session_id, sold_order_id) are NOT reachable by anon or
 * authenticated Data-API callers, and that the safe RPC does not leak
 * them either.
 *
 * If any of these assertions start passing (i.e. the columns come back),
 * the RLS/GRANT lockdown has regressed and shoppers can enumerate other
 * shoppers' cart sessions.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://xxuyhpszppnjdrmfdylv.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4dXlocHN6cHBuamRybWZkeWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDM5ODYsImV4cCI6MjA5NzgxOTk4Nn0.im5Qiovj-LkvaDjWKCKgIgJwsgmZmGq3rvR__94ny4s";

const anon = createClient(SUPABASE_URL, SUPABASE_KEY);

async function selectColumn(col: string) {
  return await anon.from("shop_products").select(`id, ${col}`).limit(1);
}

describe("shop_products sensitive columns lockdown", () => {
  it("public catalog SELECT still works (baseline)", async () => {
    const { data, error } = await anon
      .from("shop_products")
      .select("id, name, price, status")
      .limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("anon cannot SELECT reserved_session_id", async () => {
    const { data, error } = await selectColumn("reserved_session_id");
    // Either PostgREST returns an error, or column is stripped.
    // Any row containing the key with a non-null value is a leak.
    const leaked = (data ?? []).some(
      (r: any) => Object.prototype.hasOwnProperty.call(r, "reserved_session_id") && r.reserved_session_id !== null,
    );
    expect({ error: !!error, leaked }).toEqual({ error: true, leaked: false });
  });

  it("anon cannot SELECT sold_order_id", async () => {
    const { data, error } = await selectColumn("sold_order_id");
    const leaked = (data ?? []).some(
      (r: any) => Object.prototype.hasOwnProperty.call(r, "sold_order_id") && r.sold_order_id !== null,
    );
    expect({ error: !!error, leaked }).toEqual({ error: true, leaked: false });
  });

  it("anon cannot filter by reserved_session_id to enumerate carts", async () => {
    const { data, error } = await anon
      .from("shop_products")
      .select("id")
      .eq("reserved_session_id", "any-value")
      .limit(1);
    // Filtering on a revoked column must fail; a passing query = leak.
    expect(!!error || (data ?? []).length === 0).toBe(true);
    if (!error) {
      // Even if empty, the filter must not silently succeed against sensitive col.
      expect(error).toBeTruthy();
    }
  });

  it("anon cannot SELECT * (wildcard would include sensitive cols)", async () => {
    const { data, error } = await anon.from("shop_products").select("*").limit(1);
    const leaked = (data ?? []).some(
      (r: any) =>
        Object.prototype.hasOwnProperty.call(r, "reserved_session_id") ||
        Object.prototype.hasOwnProperty.call(r, "sold_order_id"),
    );
    // Wildcard should either error out or return rows without the sensitive keys.
    expect(leaked).toBe(false);
    if (!error && data && data.length > 0) {
      const keys = Object.keys(data[0]);
      expect(keys).not.toContain("reserved_session_id");
      expect(keys).not.toContain("sold_order_id");
    }
  });

  it("reservation RPC returns safe shape and never exposes session id", async () => {
    // Grab a product id via the public projection.
    const { data: prods } = await anon.from("shop_products").select("id").limit(1);
    const id = prods?.[0]?.id;
    if (!id) return; // nothing to test against

    const { data, error } = await anon.rpc("shop_products_reservation_for_session", {
      p_ids: [id],
      p_session: "attacker-guess",
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    for (const row of data ?? []) {
      const keys = Object.keys(row);
      expect(keys).not.toContain("reserved_session_id");
      expect(keys).not.toContain("sold_order_id");
      expect(keys.sort()).toEqual(["id", "reserved_by_me", "reserved_until", "status"]);
      // With an unrelated session guess, reserved_by_me must be false.
      expect(row.reserved_by_me).toBe(false);
    }
  });
});

describe("shop_products sensitive columns — authenticated user", () => {
  it("a signed-in non-admin also cannot read reserved_session_id", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Sign in anonymously if enabled; otherwise skip.
    const { data: sess, error: signErr } = await client.auth.signInAnonymously().catch((e) => ({
      data: null,
      error: e,
    })) as any;
    if (signErr || !sess?.session) {
      // Anonymous sign-in disabled by policy — skip rather than fail.
      return;
    }
    const { data, error } = await client
      .from("shop_products")
      .select("id, reserved_session_id, sold_order_id")
      .limit(1);
    const leaked = (data ?? []).some(
      (r: any) =>
        (Object.prototype.hasOwnProperty.call(r, "reserved_session_id") && r.reserved_session_id !== null) ||
        (Object.prototype.hasOwnProperty.call(r, "sold_order_id") && r.sold_order_id !== null),
    );
    expect({ error: !!error, leaked }).toEqual({ error: true, leaked: false });
    await client.auth.signOut();
  });
});