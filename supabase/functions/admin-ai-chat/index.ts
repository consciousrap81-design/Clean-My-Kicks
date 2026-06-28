import { createClient } from "npm:@supabase/supabase-js@2";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai@7";
import { z } from "npm:zod@4";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { loadAiPreferenceBlock } from "../_shared/ai-preferences.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

async function verifyAdmin(req: Request) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${auth}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const { data: roles } = await admin().from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return roles ? user : null;
}

function buildTools(actorId: string) {
  const a = admin();
  // Known columns per table (kept in sync with migrations). Used to detect
  // schema drift and surface a clear admin warning when a query fails.
  const KNOWN_COLUMNS: Record<string, string[]> = {
    shop_products: ["id","name","brand","model","size","condition","description","price","status","view_count","reserved_until","reserved_session_id","sold_at","sold_order_id","created_at","updated_at"],
    shop_orders: ["id","product_id","product_snapshot","user_id","customer_email","customer_name","shipping_address","amount","currency","status","stripe_session_id","stripe_payment_intent","tracking_number","tracking_carrier","paid_at","shipped_at","created_at","updated_at","review_request_sent_at","discount_cents","promo_code","shipping_method"],
    jobs: ["id","customer_id","service_id","shoe_brand","shoe_model","shoe_material","cleaning_guide_id","condition_notes","quoted_price","payment_status","status","intake_date","due_date","completion_date","admin_notes","lead_source_id","created_at","updated_at","user_id"],
    cleaning_guides: ["id","material","title","summary","recommended_chemicals","brush_stiffness","tools","steps","cautions","estimated_minutes","source","created_by","created_at","updated_at"],
  };
  function schemaError(table: string, message: string) {
    // Parse `column <table>.<col> does not exist` from PostgREST/Postgres
    const m = message.match(/column\s+(?:"?([\w.]+)"?\.)?"?([\w]+)"?\s+does not exist/i);
    const missing = m?.[2];
    return {
      error: "schema_mismatch",
      table,
      missing_column: missing ?? null,
      detail: message,
      expected_columns: KNOWN_COLUMNS[table] ?? [],
      admin_warning: missing
        ? `Schema drift detected on ${table}: column "${missing}" was requested but does not exist. Expected one of: ${(KNOWN_COLUMNS[table] ?? []).join(", ")}.`
        : `Schema error on ${table}: ${message}`,
    };
  }
  return {
    search_products: tool({
      description: "Search shop products by name/brand/model. Returns up to 20 results.",
      inputSchema: z.object({ q: z.string().optional(), status: z.enum(["draft", "available", "sold"]).optional() }),
      execute: async ({ q, status }) => {
        let query = a.from("shop_products").select("id,name,brand,model,price,status,size,condition,view_count,created_at").limit(20).order("created_at", { ascending: false });
        if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%`);
        if (status) query = query.eq("status", status);
        const { data, error } = await query;
        if (error) return schemaError("shop_products", error.message);
        return {
          kind: "products",
          count: data?.length ?? 0,
          products: (data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            model: p.model,
            size: p.size,
            condition: p.condition,
            status: p.status,
            price: p.price != null ? Number(p.price) : null,
            price_formatted: p.price != null ? `$${Number(p.price).toFixed(2)}` : null,
            views: p.view_count ?? 0,
            created_at: p.created_at,
          })),
        };
      },
    }),
    get_product: tool({
      description: "Get full details for a single product by id.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const { data, error } = await a.from("shop_products").select("*").eq("id", id).maybeSingle();
        if (error) return schemaError("shop_products", error.message);
        return { kind: "product", product: data };
      },
    }),
    list_orders: tool({
      description: "List recent shop orders.",
      inputSchema: z.object({ limit: z.number().min(1).max(50).default(20) }),
      execute: async ({ limit }) => {
        const { data, error } = await a.from("shop_orders").select("id,status,amount,currency,customer_email,customer_name,created_at,shipping_method,tracking_number,tracking_carrier,promo_code,discount_cents").order("created_at", { ascending: false }).limit(limit);
        if (error) return schemaError("shop_orders", error.message);
        return {
          kind: "orders",
          count: data?.length ?? 0,
          orders: (data ?? []).map((o: any) => ({
            id: o.id,
            status: o.status,
            customer: o.customer_name || o.customer_email,
            customer_email: o.customer_email,
            amount: o.amount != null ? Number(o.amount) : null,
            amount_formatted: o.amount != null ? `$${Number(o.amount).toFixed(2)} ${String(o.currency || "usd").toUpperCase()}` : null,
            discount_cents: o.discount_cents ?? 0,
            promo_code: o.promo_code,
            shipping_method: o.shipping_method,
            tracking: o.tracking_number ? `${o.tracking_carrier ?? ""} ${o.tracking_number}`.trim() : null,
            created_at: o.created_at,
          })),
        };
      },
    }),
    list_jobs: tool({
      description: "List recent restoration jobs.",
      inputSchema: z.object({ limit: z.number().min(1).max(50).default(20), status: z.string().optional() }),
      execute: async ({ limit, status }) => {
        let q = a.from("jobs").select("id,status,payment_status,shoe_brand,shoe_model,quoted_price,intake_date,due_date,completion_date,admin_notes,condition_notes,customer_id,created_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return schemaError("jobs", error.message);
        return {
          kind: "jobs",
          count: data?.length ?? 0,
          jobs: (data ?? []).map((j: any) => ({
            id: j.id,
            status: j.status,
            payment_status: j.payment_status,
            shoe: [j.shoe_brand, j.shoe_model].filter(Boolean).join(" ") || null,
            quoted_price: j.quoted_price != null ? Number(j.quoted_price) : null,
            quoted_price_formatted: j.quoted_price != null ? `$${Number(j.quoted_price).toFixed(2)}` : null,
            intake_date: j.intake_date,
            due_date: j.due_date,
            completion_date: j.completion_date,
            condition_notes: j.condition_notes,
            admin_notes: j.admin_notes,
            customer_id: j.customer_id,
            created_at: j.created_at,
          })),
        };
      },
    }),
    propose_action: tool({
      description: "Propose a write action (update product, send email, change price, publish, etc) for the admin to approve. The action is stored in the suggestions inbox and NOT executed until approved.",
      inputSchema: z.object({
        kind: z.enum(["update_product", "publish_product", "rewrite_seo", "update_job_status", "send_customer_email", "create_promo", "price_change"]),
        title: z.string(),
        summary: z.string(),
        payload: z.record(z.string(), z.any()),
      }),
      execute: async ({ kind, title, summary, payload }) => {
        const { data, error } = await a.from("ai_suggestions").insert({ kind, title, summary, payload, status: "pending" }).select("id").single();
        if (error) return { error: error.message };
        await a.from("ai_audit_log").insert({ actor: actorId, tool: "propose_action", input: { kind, title, payload }, output: { suggestion_id: data.id }, approved: true });
        return { suggestion_id: data.id, status: "pending_approval", message: "Saved to suggestions inbox. Open /admin/ai/suggestions to approve." };
      },
    }),
    web_research: tool({
      description: "Note a research finding (competitor, pricing trend, industry insight) for the admin. Use during reasoning to record useful context.",
      inputSchema: z.object({ topic: z.string(), findings: z.string() }),
      execute: async ({ topic, findings }) => ({ topic, findings, recorded: true }),
    }),
    list_product_photos: tool({
      description: "List all media (photos) attached to a shop product, in display order. Returns each photo's id, storage_path, signed preview URL, sort_order, and is_primary flag. Use this to audit a product's gallery for broken or missing uploads.",
      inputSchema: z.object({ product_id: z.string().uuid() }),
      execute: async ({ product_id }) => {
        const { data, error } = await a.from("shop_product_photos").select("id,storage_path,sort_order,is_primary,created_at").eq("product_id", product_id).order("sort_order", { ascending: true });
        if (error) return schemaError("shop_product_photos", error.message);
        const photos = await Promise.all((data ?? []).map(async (p: any) => {
          const { data: signed } = await a.storage.from("shop-products").createSignedUrl(p.storage_path, 60 * 60);
          // HEAD-check accessibility so Kicks can flag broken/incomplete uploads
          let reachable = true;
          try {
            if (signed?.signedUrl) {
              const r = await fetch(signed.signedUrl, { method: "HEAD" });
              reachable = r.ok;
            } else { reachable = false; }
          } catch { reachable = false; }
          return { id: p.id, storage_path: p.storage_path, sort_order: p.sort_order, is_primary: p.is_primary, preview_url: signed?.signedUrl ?? null, reachable, created_at: p.created_at };
        }));
        return { kind: "product_photos", product_id, count: photos.length, photos };
      },
    }),
    delete_product_photo: tool({
      description: "Delete a specific product photo by its photo id. Removes the underlying file from storage and the gallery row. Use for stuck/broken/incorrect uploads. Irreversible.",
      inputSchema: z.object({ photo_id: z.string().uuid() }),
      execute: async ({ photo_id }) => {
        const { data: row, error: re } = await a.from("shop_product_photos").select("id,product_id,storage_path,is_primary").eq("id", photo_id).maybeSingle();
        if (re) return schemaError("shop_product_photos", re.message);
        if (!row) return { error: "photo_not_found", photo_id };
        const { error: se } = await a.storage.from("shop-products").remove([row.storage_path]);
        const { error: de } = await a.from("shop_product_photos").delete().eq("id", photo_id);
        if (de) return { error: de.message };
        // If we deleted the primary, promote the next photo to primary
        if (row.is_primary) {
          const { data: next } = await a.from("shop_product_photos").select("id").eq("product_id", row.product_id).order("sort_order", { ascending: true }).limit(1).maybeSingle();
          if (next?.id) await a.from("shop_product_photos").update({ is_primary: true }).eq("id", next.id);
        }
        await a.from("ai_audit_log").insert({ actor: actorId, tool: "delete_product_photo", input: { photo_id }, output: { product_id: row.product_id, storage_path: row.storage_path, storage_remove_error: se?.message ?? null }, approved: true });
        return { kind: "product_photo_deleted", photo_id, product_id: row.product_id, storage_path: row.storage_path };
      },
    }),
    attach_product_photo_from_url: tool({
      description: "Download an image from a public URL and attach it to a product's gallery. Use to fix products with broken/missing photos when you have a known-good replacement image URL. Max 15 MB, must be a real image content-type.",
      inputSchema: z.object({
        product_id: z.string().uuid(),
        image_url: z.string().url(),
        make_primary: z.boolean().default(false),
      }),
      execute: async ({ product_id, image_url, make_primary }) => {
        const { data: prod, error: pe } = await a.from("shop_products").select("id").eq("id", product_id).maybeSingle();
        if (pe) return schemaError("shop_products", pe.message);
        if (!prod) return { error: "product_not_found", product_id };
        let resp: Response;
        try { resp = await fetch(image_url); } catch (e) { return { error: "fetch_failed", detail: String(e) }; }
        if (!resp.ok) return { error: "fetch_failed", status: resp.status };
        const ct = resp.headers.get("content-type") ?? "";
        if (!ct.startsWith("image/")) return { error: "not_an_image", content_type: ct };
        const buf = new Uint8Array(await resp.arrayBuffer());
        if (buf.byteLength > 15 * 1024 * 1024) return { error: "image_too_large", bytes: buf.byteLength };
        const ext = ct.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg") || "jpg";
        const path = `${product_id}/${crypto.randomUUID()}.${ext}`;
        const { error: ue } = await a.storage.from("shop-products").upload(path, buf, { contentType: ct, upsert: false });
        if (ue) return { error: "storage_upload_failed", detail: ue.message };
        const { data: maxRow } = await a.from("shop_product_photos").select("sort_order").eq("product_id", product_id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
        const nextOrder = (maxRow?.sort_order ?? -1) + 1;
        if (make_primary) await a.from("shop_product_photos").update({ is_primary: false }).eq("product_id", product_id);
        const { data: ins, error: ie } = await a.from("shop_product_photos").insert({ product_id, storage_path: path, sort_order: nextOrder, is_primary: make_primary }).select("id,storage_path,sort_order,is_primary").single();
        if (ie) return { error: "db_insert_failed", detail: ie.message };
        await a.from("ai_audit_log").insert({ actor: actorId, tool: "attach_product_photo_from_url", input: { product_id, image_url, make_primary }, output: ins, approved: true });
        return { kind: "product_photo_attached", product_id, photo: ins };
      },
    }),
    set_primary_product_photo: tool({
      description: "Mark a specific photo as the product's primary/cover image and unset the previous primary.",
      inputSchema: z.object({ photo_id: z.string().uuid() }),
      execute: async ({ photo_id }) => {
        const { data: row, error: re } = await a.from("shop_product_photos").select("id,product_id").eq("id", photo_id).maybeSingle();
        if (re) return schemaError("shop_product_photos", re.message);
        if (!row) return { error: "photo_not_found", photo_id };
        await a.from("shop_product_photos").update({ is_primary: false }).eq("product_id", row.product_id);
        const { error: ue } = await a.from("shop_product_photos").update({ is_primary: true }).eq("id", photo_id);
        if (ue) return { error: ue.message };
        await a.from("ai_audit_log").insert({ actor: actorId, tool: "set_primary_product_photo", input: { photo_id }, output: { product_id: row.product_id }, approved: true });
        return { kind: "primary_photo_set", photo_id, product_id: row.product_id };
      },
    }),
    reorder_product_photos: tool({
      description: "Reorder a product's gallery. Pass the full list of photo ids in the desired display order; sort_order is rewritten 0..n-1.",
      inputSchema: z.object({ product_id: z.string().uuid(), photo_ids: z.array(z.string().uuid()).min(1) }),
      execute: async ({ product_id, photo_ids }) => {
        const { data: existing, error: ee } = await a.from("shop_product_photos").select("id").eq("product_id", product_id);
        if (ee) return schemaError("shop_product_photos", ee.message);
        const existingIds = new Set((existing ?? []).map((r: any) => r.id));
        if (photo_ids.some((id) => !existingIds.has(id)) || photo_ids.length !== existingIds.size) {
          return { error: "photo_ids_must_match_product_gallery", expected: Array.from(existingIds), got: photo_ids };
        }
        for (let i = 0; i < photo_ids.length; i++) {
          await a.from("shop_product_photos").update({ sort_order: i }).eq("id", photo_ids[i]);
        }
        await a.from("ai_audit_log").insert({ actor: actorId, tool: "reorder_product_photos", input: { product_id, photo_ids }, output: { count: photo_ids.length }, approved: true });
        return { kind: "product_photos_reordered", product_id, order: photo_ids };
      },
    }),
    list_cleaning_guides: tool({
      description: "List restoration cleaning guides. Optionally filter by shoe material (Suede, Leather, Mesh, Canvas, Knit, etc.).",
      inputSchema: z.object({ material: z.string().optional(), limit: z.number().min(1).max(50).default(20) }),
      execute: async ({ material, limit }) => {
        let q = a.from("cleaning_guides").select("id,material,title,summary,brush_stiffness,estimated_minutes,source,updated_at").order("updated_at", { ascending: false }).limit(limit);
        if (material) q = q.ilike("material", material);
        const { data, error } = await q;
        if (error) return schemaError("cleaning_guides", error.message);
        return { kind: "cleaning_guides", count: data?.length ?? 0, guides: data ?? [] };
      },
    }),
    get_cleaning_guide: tool({
      description: "Get the full restoration protocol for a cleaning guide by id, including chemicals, tools, steps, and cautions.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const { data, error } = await a.from("cleaning_guides").select("*").eq("id", id).maybeSingle();
        if (error) return schemaError("cleaning_guides", error.message);
        return { kind: "cleaning_guide", guide: data };
      },
    }),
    suggest_cleaning_protocol_for_job: tool({
      description: "Given a job id, look up the job's shoe material (or infer from shoe_brand/model/condition_notes) and return the best matching cleaning guide(s). Read-only — does not modify the job.",
      inputSchema: z.object({ job_id: z.string().uuid() }),
      execute: async ({ job_id }) => {
        const { data: job, error: je } = await a.from("jobs").select("id,shoe_brand,shoe_model,shoe_material,cleaning_guide_id,condition_notes").eq("id", job_id).maybeSingle();
        if (je) return schemaError("jobs", je.message);
        if (!job) return { error: "job_not_found", job_id };
        const material = job.shoe_material;
        let matches: any[] = [];
        if (material) {
          const { data } = await a.from("cleaning_guides").select("id,material,title,summary,brush_stiffness,recommended_chemicals,tools,steps,cautions,estimated_minutes").ilike("material", material);
          matches = data ?? [];
        }
        if (matches.length === 0) {
          const { data } = await a.from("cleaning_guides").select("id,material,title,summary,brush_stiffness,estimated_minutes").limit(20);
          matches = data ?? [];
        }
        return { kind: "protocol_suggestion", job: { id: job.id, shoe: [job.shoe_brand, job.shoe_model].filter(Boolean).join(" "), material, current_guide_id: job.cleaning_guide_id, condition_notes: job.condition_notes }, guides: matches };
      },
    }),
    add_cleaning_guide: tool({
      description: "Create a new cleaning guide when Kicks has learned a new restoration protocol (e.g. for a material or technique not yet covered). Use sparingly — only when the protocol is concrete and actionable. Tagged with source='kicks_ai'.",
      inputSchema: z.object({
        material: z.string(),
        title: z.string(),
        summary: z.string().optional(),
        recommended_chemicals: z.array(z.object({ name: z.string(), purpose: z.string().optional(), dilution: z.string().optional() })).default([]),
        brush_stiffness: z.string().optional(),
        tools: z.array(z.string()).default([]),
        steps: z.array(z.object({ order: z.number(), title: z.string(), instruction: z.string(), caution: z.string().nullable().optional() })).min(1),
        cautions: z.string().optional(),
        estimated_minutes: z.number().optional(),
      }),
      execute: async (input) => {
        const { data, error } = await a.from("cleaning_guides").insert({
          material: input.material,
          title: input.title,
          summary: input.summary ?? null,
          recommended_chemicals: input.recommended_chemicals,
          brush_stiffness: input.brush_stiffness ?? null,
          tools: input.tools,
          steps: input.steps,
          cautions: input.cautions ?? null,
          estimated_minutes: input.estimated_minutes ?? null,
          source: "kicks_ai",
          created_by: actorId,
        }).select("id,material,title").single();
        if (error) return schemaError("cleaning_guides", error.message);
        await a.from("ai_audit_log").insert({ actor: actorId, tool: "add_cleaning_guide", input, output: data, approved: true });
        return { kind: "cleaning_guide_created", guide: data };
      },
    }),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const reqId = crypto.randomUUID().slice(0, 8);
  const t0 = Date.now();
  const log = (label: string, data?: unknown) => {
    try {
      console.log(`[admin-ai-chat ${reqId}] ${label}`, data !== undefined ? JSON.stringify(data) : "");
    } catch {
      console.log(`[admin-ai-chat ${reqId}] ${label} <unserializable>`);
    }
  };
  log("incoming", { method: req.method, url: req.url, ua: req.headers.get("user-agent") });
  try {
    const user = await verifyAdmin(req);
    if (!user) {
      log("unauthorized");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log("admin verified", { user_id: user.id });

    const rawBodyText = await req.text();
    log("raw body", { length: rawBodyText.length, preview: rawBodyText.slice(0, 4000) });
    let body: any;
    try {
      body = JSON.parse(rawBodyText);
    } catch (parseErr) {
      log("JSON parse error", { error: String(parseErr) });
      return new Response(JSON.stringify({ error: "Invalid JSON body", detail: String(parseErr) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { messages: rawMessages, threadId } = body as { messages: UIMessage[]; threadId?: string };
    log("parsed body", {
      threadId,
      bodyKeys: Object.keys(body ?? {}),
      rawMessagesType: Array.isArray(rawMessages) ? "array" : typeof rawMessages,
      rawMessagesLen: Array.isArray(rawMessages) ? rawMessages.length : undefined,
    });
    const messages: UIMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
    if (!Array.isArray(rawMessages)) {
      console.warn("admin-ai-chat: messages was not an array", { keys: Object.keys(body ?? {}), type: typeof rawMessages });
    }
    if (messages.length === 0) {
      log("empty messages, rejecting", { rawMessages });
      return new Response(JSON.stringify({ error: "No messages provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log("messages summary", messages.map((m: any, i) => ({
      i,
      role: m?.role,
      hasParts: Array.isArray(m?.parts),
      partsLen: Array.isArray(m?.parts) ? m.parts.length : undefined,
      partTypes: Array.isArray(m?.parts) ? m.parts.map((p: any) => p?.type) : undefined,
      hasContent: m?.content !== undefined,
      contentType: typeof m?.content,
    })));
    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(messages);
      log("convertToModelMessages ok", { count: modelMessages.length });
    } catch (convErr) {
      log("convertToModelMessages FAILED", { error: String(convErr), stack: (convErr as Error)?.stack, messages });
      return new Response(JSON.stringify({ error: "Failed to convert messages", detail: String(convErr) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const gateway = createLovableAiGatewayProvider(LOVABLE_KEY);
    // Use the lite Gemini variant for snappier voice-style replies. Falls back
    // to the standard flash via the gateway if the lite model is unavailable.
    const model = gateway("google/gemini-3.1-flash-lite");
    const prefs = await loadAiPreferenceBlock();

    const result = streamText({
      model,
      system: `You are "Kicks", the Clean My Kicks Admin AI assistant. You help Clifford manage a sneaker restoration business and shop in Denton, TX.
You answer to the name "Kicks" and the wake phrase "Hey Kicks". Refer to yourself as Kicks.
Responses may be spoken out loud via browser TTS, so keep replies conversational and free of long code blocks unless explicitly asked. Skip heavy markdown formatting for short voice answers.
You can read products/orders/jobs freely, and propose any write actions via the propose_action tool — the admin will approve them from the suggestions inbox.
NEVER claim a write was performed; only that it was proposed for approval.

EXCEPTION — product media tools are direct-execute (no approval needed) because they're used to fix broken galleries in conversation: list_product_photos, delete_product_photo, attach_product_photo_from_url, set_primary_product_photo, reorder_product_photos. Use list_product_photos first to audit a product's gallery (it reports a "reachable" flag for each file); only then delete/replace. When attaching from a URL, confirm the source URL with the admin before fetching.
Be concise and concrete. Use light markdown for longer answers. When suggesting copy or prices, ground them in real data you've read.
You can also discuss your own research findings and patterns you've noticed about the shop, customers, products, and competitors — be a curious collaborator, not just a tool runner.

You have a Cleaning Guides knowledge base (table: cleaning_guides) indexed by shoe material (Suede, Leather, Mesh, Canvas, Knit, etc.). When a new or selected job involves restoration, use suggest_cleaning_protocol_for_job or list_cleaning_guides/get_cleaning_guide to recommend the right chemicals, brush stiffness, tools, and step-by-step instructions. If you discover a genuinely new, concrete protocol (e.g. for a material/technique not yet in the guides), you may use add_cleaning_guide to save it — tag your learnings clearly in the summary, and don't duplicate guides that already exist.

When tools return product/order/job data, ALWAYS include a short structured summary in your reply, formatted as a compact markdown table or bullet list with the IDs (shortened to first 8 chars), status, and price/amount fields from the tool output — do not invent or omit those fields. Keep the surrounding narrative brief.

If a tool returns { "error": "schema_mismatch" }, STOP and tell the admin clearly: name the table, the missing column, and the list of expected columns from the tool output. Suggest that a recent migration may have renamed or dropped that column. Do NOT retry the same tool with the same shape.

${prefs}`,
      messages: modelMessages,
      tools: buildTools(user.id),
      stopWhen: stepCountIs(50),
      onFinish: async ({ response }) => {
        log("onFinish", { ms: Date.now() - t0, responseMsgs: response.messages.length });
        if (!threadId) return;
        try {
          const a = admin();
          // Save the last user message + assistant response
          const lastUser = messages[messages.length - 1];
          if (lastUser?.role === "user") {
            await a.from("ai_messages").insert({ thread_id: threadId, role: "user", parts: lastUser.parts ?? [] });
          }
          for (const m of response.messages) {
            await a.from("ai_messages").insert({ thread_id: threadId, role: m.role, parts: m.content as any });
          }
          await a.from("ai_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
        } catch (e) {
          log("persist error", { error: String(e), stack: (e as Error)?.stack });
        }
      },
    });

    log("streaming response start", { ms: Date.now() - t0 });
    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (e) {
    log("FATAL handler error", { error: String(e), stack: (e as Error)?.stack, ms: Date.now() - t0 });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});