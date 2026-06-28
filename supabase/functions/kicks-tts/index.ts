import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Voices that read as friendly female on gpt-4o-mini-tts.
const ALLOWED_VOICES = new Set([
  "alloy", "coral", "nova", "sage", "shimmer", "ballad", "fable",
]);

const DEFAULT_INSTRUCTIONS =
  "Speak as a friendly, perky female coworker. Warm and upbeat, but natural — not exaggerated. " +
  "Use natural pacing with small, conversational pauses at commas and periods. " +
  "Add gentle vocal inflection so it never sounds monotone. " +
  "Articulate clearly, like a knowledgeable teammate giving a quick update.";

async function verifyAdmin(req: Request) {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${auth}` } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: role } = await admin.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return role ? user : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await verifyAdmin(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      text?: string;
      voice?: string;
      instructions?: string;
      speed?: number;
    };
    const text = (body.text ?? "").toString().slice(0, 2000).trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "Empty text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const voice = body.voice && ALLOWED_VOICES.has(body.voice) ? body.voice : "coral";
    const instructions = (body.instructions?.trim()) || DEFAULT_INSTRUCTIONS;
    const speed = typeof body.speed === "number" && body.speed >= 0.5 && body.speed <= 1.5
      ? body.speed : 1.0;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_KEY}`,
        "Lovable-API-Key": LOVABLE_KEY,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: text,
        voice,
        instructions,
        response_format: "mp3",
        speed,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("kicks-tts upstream error", upstream.status, errText);
      return new Response(JSON.stringify({ error: "TTS failed", status: upstream.status, detail: errText.slice(0, 500) }), {
        status: upstream.status === 429 || upstream.status === 402 ? upstream.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("kicks-tts error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});