import { createClient } from "npm:@supabase/supabase-js@2";
import { generateText } from "npm:ai@7";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { loadAiPreferenceBlock } from "../_shared/ai-preferences.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function verifyAdmin(req: Request) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${auth}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return role ? user : null;
}

function extractJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await verifyAdmin(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { raw, product } = await req.json() as { raw: string; product?: { name?: string; brand?: string; model?: string; size?: string; condition?: string; price?: string } };
    if (!raw || !raw.trim()) {
      return new Response(JSON.stringify({ error: "Empty description" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const gateway = createLovableAiGatewayProvider(LOVABLE_KEY);
    const prefs = await loadAiPreferenceBlock();

    const ctx = product ? `Product context:\n${JSON.stringify(product)}\n\n` : "";

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `You are "Kicks", a copywriter for Clean My Kicks (sneaker restoration shop, Denton TX).
You rewrite messy pasted product descriptions into clean, scannable, customer-ready markdown that fits a 1-of-1 restored sneaker listing.

Rules:
- Output VALID JSON only: {"formatted":"<markdown>","summary":"<one short paragraph for SEO meta, <=160 chars>","highlights":["bullet 1","bullet 2"],"font_suggestion":"<short note about typographic emphasis e.g. bold sizing line>","notes":"<1-2 sentences explaining your changes>"}
- "formatted" is the new description body. Use short paragraphs, **bold** for key callouts (size, brand, condition), and "- " bullet lists for what was done / included / flaws.
- Group naturally into sections with bold mini-headers like **Restoration**, **Includes**, **Condition** when content supports it. Don't invent facts.
- Preserve every concrete claim from the source. Don't add sizes/prices/brands that aren't already implied.
- Keep the warm, faith-aligned, sneakerhead-friendly Clean My Kicks voice.
- No emojis unless the source uses them. No HTML.

${prefs}`,
      prompt: `${ctx}Raw pasted description:\n"""\n${raw}\n"""\n\nReturn the JSON now.`,
    });

    const parsed = extractJson(text);
    if (!parsed?.formatted) {
      return new Response(JSON.stringify({ error: "Model returned no draft", raw: text }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});