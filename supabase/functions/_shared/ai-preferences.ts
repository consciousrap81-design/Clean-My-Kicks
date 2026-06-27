import { createClient } from "npm:@supabase/supabase-js@2";

type Settings = {
  tone: string;
  custom_instructions: string;
  forbidden_phrases: string[];
  preferred_phrases: string[];
};

const TONE_GUIDE: Record<string, string> = {
  professional: "Polished, brand-safe, concise B2B-friendly voice.",
  hype: "High-energy sneakerhead voice. Slang is welcome. Emoji OK in moderation.",
  friendly: "Warm, conversational, plain English.",
  luxury: "Refined, minimal, aspirational phrasing.",
  faith: "Mission-driven, uplifting, family-friendly. Brief faith references welcome.",
};

export async function loadAiPreferenceBlock(): Promise<string> {
  try {
    const a = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [{ data: s }, { data: fb }] = await Promise.all([
      a.from("ai_settings").select("*").limit(1).maybeSingle(),
      a.from("ai_feedback").select("action,kind,reason,suggestion_snapshot").order("created_at", { ascending: false }).limit(50),
    ]);
    const settings: Settings = {
      tone: s?.tone ?? "professional",
      custom_instructions: s?.custom_instructions ?? "",
      forbidden_phrases: s?.forbidden_phrases ?? [],
      preferred_phrases: s?.preferred_phrases ?? [],
    };

    const applied = (fb ?? []).filter((f: any) => f.action === "applied");
    const dismissed = (fb ?? []).filter((f: any) => f.action === "dismissed");
    const tally = (arr: any[]) => {
      const m = new Map<string, number>();
      arr.forEach((r: any) => r.kind && m.set(r.kind, (m.get(r.kind) ?? 0) + 1));
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    };
    const likedKinds = tally(applied).map(([k, n]) => `${k} x${n}`).join(", ") || "none yet";
    const dislikedKinds = tally(dismissed).map(([k, n]) => `${k} x${n}`).join(", ") || "none yet";
    const recentDismissedTitles = dismissed.slice(0, 5).map((f: any) => `• ${f.suggestion_snapshot?.title ?? "(untitled)"}`).join("\n") || "• (none)";
    const recentAppliedTitles = applied.slice(0, 5).map((f: any) => `• ${f.suggestion_snapshot?.title ?? "(untitled)"}`).join("\n") || "• (none)";

    return [
      `# Admin Preferences`,
      `Tone: ${settings.tone} — ${TONE_GUIDE[settings.tone] ?? TONE_GUIDE.professional}`,
      settings.custom_instructions ? `Custom rules from the owner:\n${settings.custom_instructions}` : "",
      settings.preferred_phrases.length ? `Preferred phrases (use when natural): ${settings.preferred_phrases.join(", ")}` : "",
      settings.forbidden_phrases.length ? `Forbidden phrases (never use): ${settings.forbidden_phrases.join(", ")}` : "",
      ``,
      `# What the owner has accepted`,
      `Kinds: ${likedKinds}`,
      recentAppliedTitles,
      ``,
      `# What the owner has rejected — do not repeat these patterns`,
      `Kinds: ${dislikedKinds}`,
      recentDismissedTitles,
      ``,
      `Bias future proposals toward what was accepted and away from what was dismissed.`,
    ].filter(Boolean).join("\n");
  } catch (e) {
    console.error("loadAiPreferenceBlock failed", e);
    return "";
  }
}