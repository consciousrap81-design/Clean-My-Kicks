import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TITLE = 120;
const MAX_BODY = 4000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId ?? "");
    const rating = Number(body.rating);
    const title = body.title == null ? null : String(body.title).trim().slice(0, MAX_TITLE);
    const text = String(body.body ?? "").trim();
    const photoPath = body.photoPath ? String(body.photoPath) : null;
    const reviewerName = body.reviewerName ? String(body.reviewerName).trim().slice(0, 80) : null;

    if (!/^[0-9a-f-]{36}$/i.test(productId)) return json({ error: "Invalid product" }, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: "Rating must be 1–5" }, 400);
    if (text.length < 1 || text.length > MAX_BODY) return json({ error: "Review text required (max 4000 chars)" }, 400);
    if (photoPath) {
      // Must live under the user's own folder
      if (!photoPath.startsWith(`${user.id}/`)) return json({ error: "Invalid photo" }, 400);
      // Verify the object actually exists
      const { data: head } = await supabase.storage.from("shop-review-photos").list(user.id, { limit: 100, search: photoPath.split("/").slice(1).join("/") });
      const exists = head?.some((o) => `${user.id}/${o.name}` === photoPath);
      if (!exists) return json({ error: "Photo upload not found" }, 400);
    }

    // Eligibility: user must have a paid/shipped/delivered shop_order for this product
    const { data: order } = await supabase
      .from("shop_orders")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .in("status", ["paid", "shipped", "delivered"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!order) return json({ error: "Only verified buyers of this item can review it" }, 403);

    // Upsert: if existing pending review, update it; otherwise insert
    const { data: existing } = await supabase
      .from("shop_reviews")
      .select("id, status, photo_path")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    if (existing && existing.status !== "pending") {
      return json({ error: "Your review has already been submitted and can no longer be edited." }, 409);
    }

    const payload = {
      product_id: productId,
      order_id: order.id,
      user_id: user.id,
      reviewer_name: reviewerName,
      rating,
      title,
      body: text,
      photo_path: photoPath,
      status: "pending" as const,
    };

    let reviewId: string;
    if (existing) {
      // If user replaced photo, clean up the old file
      if (existing.photo_path && existing.photo_path !== photoPath) {
        await supabase.storage.from("shop-review-photos").remove([existing.photo_path]).catch(() => {});
      }
      const { error } = await supabase
        .from("shop_reviews")
        .update(payload)
        .eq("id", existing.id);
      if (error) return json({ error: error.message }, 500);
      reviewId = existing.id;
    } else {
      const { data: ins, error } = await supabase
        .from("shop_reviews")
        .insert(payload)
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 500);
      reviewId = ins.id;
    }

    return json({ ok: true, reviewId });
  } catch (e) {
    console.error("submit-shop-review error", e);
    return json({ error: (e as Error).message || "Server error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}