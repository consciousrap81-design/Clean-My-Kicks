import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://cleanmykicks.com";

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

    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const reviewId = String(body.reviewId ?? "");
    const action = String(body.action ?? "");
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;

    if (!/^[0-9a-f-]{36}$/i.test(reviewId)) return json({ error: "Invalid review id" }, 400);
    if (!["approve", "reject", "hide", "unhide"].includes(action)) return json({ error: "Invalid action" }, 400);

    const { data: review } = await supabase
      .from("shop_reviews")
      .select("id, status, product_id, user_id, photo_path")
      .eq("id", reviewId)
      .maybeSingle();

    if (!review) return json({ error: "Review not found" }, 404);

    let newStatus: "approved" | "rejected" | "hidden" | "pending" = review.status as any;
    const patch: Record<string, unknown> = {};
    if (action === "approve") {
      newStatus = "approved";
      patch.approved_at = new Date().toISOString();
      patch.approved_by = user.id;
      patch.rejection_reason = null;
    } else if (action === "reject") {
      newStatus = "rejected";
      patch.rejection_reason = reason;
      patch.approved_at = null;
    } else if (action === "hide") {
      newStatus = "hidden";
    } else if (action === "unhide") {
      newStatus = "approved";
      patch.approved_at = new Date().toISOString();
      patch.approved_by = user.id;
    }
    patch.status = newStatus;

    const { error } = await supabase.from("shop_reviews").update(patch).eq("id", reviewId);
    if (error) return json({ error: error.message }, 500);

    // On approve, send thank-you email + (optionally) move photo to a long-lived signed URL
    if (action === "approve") {
      const { data: product } = await supabase
        .from("shop_products")
        .select("name, brand, model")
        .eq("id", review.product_id)
        .maybeSingle();
      const { data: { user: reviewer } } = await supabase.auth.admin.getUserById(review.user_id);
      const productName = [product?.brand, product?.model, product?.name].filter(Boolean).join(" ") || "your sneakers";
      if (reviewer?.email) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "shop-review-thanks",
            recipientEmail: reviewer.email,
            idempotencyKey: `review-thanks-${reviewId}`,
            templateData: {
              customerName: (reviewer.user_metadata as any)?.full_name || undefined,
              productName,
              reviewUrl: `${SITE_URL}/shop/${review.product_id}#reviews`,
            },
          },
        }).catch((e) => console.error("thanks email error", e));
      }
    }

    return json({ ok: true, status: newStatus });
  } catch (e) {
    console.error("moderate-shop-review error", e);
    return json({ error: (e as Error).message || "Server error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}