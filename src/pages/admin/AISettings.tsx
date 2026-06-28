import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Save, Brain, Volume2, Play } from "lucide-react";
import { toast } from "sonner";
import { KICKS_VOICE_STORAGE_KEY, type KicksVoicePrefs, type KicksVoiceId, previewKicksVoice } from "@/hooks/useKicksVoice";
import { Slider } from "@/components/ui/slider";

type Settings = {
  id?: string;
  tone: string;
  custom_instructions: string;
  forbidden_phrases: string[];
  preferred_phrases: string[];
  auto_apply_safe: boolean;
};

const TONES = [
  { value: "professional", label: "Professional", hint: "Polished, brand-safe, B2B-friendly" },
  { value: "hype", label: "Hype / Sneakerhead", hint: "High-energy, slang, emoji-friendly" },
  { value: "friendly", label: "Friendly & Casual", hint: "Warm, plain-spoken, approachable" },
  { value: "luxury", label: "Premium / Luxury", hint: "Refined, minimal, aspirational" },
  { value: "faith", label: "Faith-forward", hint: "Mission-driven, uplifting, family-friendly" },
];

export default function AISettings() {
  const [s, setS] = useState<Settings>({
    tone: "professional",
    custom_instructions: "",
    forbidden_phrases: [],
    preferred_phrases: [],
    auto_apply_safe: false,
  });
  const [stats, setStats] = useState<{ applied: number; dismissed: number; topApplied: string[]; topDismissed: string[] }>({ applied: 0, dismissed: 0, topApplied: [], topDismissed: [] });
  const [saving, setSaving] = useState(false);
  const [forbidInput, setForbidInput] = useState("");
  const [preferInput, setPreferInput] = useState("");
  const [voicePrefs, setVoicePrefs] = useState<KicksVoicePrefs>(() => {
    if (typeof window === "undefined") return { voice: "coral", instructions: "", speed: 1.0, useAiVoice: true };
    try {
      const raw = window.localStorage.getItem(KICKS_VOICE_STORAGE_KEY);
      return raw ? { voice: "coral", instructions: "", speed: 1.0, useAiVoice: true, ...JSON.parse(raw) } : { voice: "coral", instructions: "", speed: 1.0, useAiVoice: true };
    } catch { return { voice: "coral", instructions: "", speed: 1.0, useAiVoice: true }; }
  });
  const [previewing, setPreviewing] = useState<string | null>(null);

  function saveVoicePrefs(next: KicksVoicePrefs) {
    setVoicePrefs(next);
    try { window.localStorage.setItem(KICKS_VOICE_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }
  async function preview(voice: KicksVoiceId) {
    setPreviewing(voice);
    try { await previewKicksVoice({ ...voicePrefs, voice, useAiVoice: true }); }
    finally { setTimeout(() => setPreviewing(null), 600); }
  }

  async function load() {
    const { data } = await supabase.from("ai_settings").select("*").limit(1).maybeSingle();
    if (data) setS(data as Settings);
    const { data: fb } = await supabase.from("ai_feedback").select("action,kind").order("created_at", { ascending: false }).limit(200);
    if (fb) {
      const applied = fb.filter((f) => f.action === "applied");
      const dismissed = fb.filter((f) => f.action === "dismissed");
      const tally = (arr: any[]) => {
        const m = new Map<string, number>();
        arr.forEach((r) => r.kind && m.set(r.kind, (m.get(r.kind) ?? 0) + 1));
        return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} (${n})`);
      };
      setStats({ applied: applied.length, dismissed: dismissed.length, topApplied: tally(applied), topDismissed: tally(dismissed) });
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      tone: s.tone,
      custom_instructions: s.custom_instructions,
      forbidden_phrases: s.forbidden_phrases,
      preferred_phrases: s.preferred_phrases,
      auto_apply_safe: s.auto_apply_safe,
      updated_by: user?.id,
    };
    const { error } = s.id
      ? await supabase.from("ai_settings").update(payload).eq("id", s.id)
      : await supabase.from("ai_settings").insert({ ...payload, singleton: true });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("AI settings saved");
    load();
  }

  function addChip(kind: "forbid" | "prefer") {
    const v = (kind === "forbid" ? forbidInput : preferInput).trim();
    if (!v) return;
    if (kind === "forbid") {
      setS({ ...s, forbidden_phrases: [...s.forbidden_phrases, v] });
      setForbidInput("");
    } else {
      setS({ ...s, preferred_phrases: [...s.preferred_phrases, v] });
      setPreferInput("");
    }
  }
  function removeChip(kind: "forbid" | "prefer", i: number) {
    if (kind === "forbid") setS({ ...s, forbidden_phrases: s.forbidden_phrases.filter((_, idx) => idx !== i) });
    else setS({ ...s, preferred_phrases: s.preferred_phrases.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-display flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Settings</h1>
        <p className="text-sm text-muted-foreground">Tone, custom rules, and what the assistant has learned from your decisions.</p>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <Label>Tone</Label>
          <Select value={s.tone} onValueChange={(v) => setS({ ...s, tone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex flex-col"><span>{t.label}</span><span className="text-[11px] text-muted-foreground">{t.hint}</span></div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Custom instructions</Label>
          <Textarea
            rows={5}
            placeholder="e.g. Always mention our Denton, TX location. Highlight free local pickup. Don't propose discounts over 15%."
            value={s.custom_instructions}
            onChange={(e) => setS({ ...s, custom_instructions: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground mt-1">These rules are applied to every chat reply and every scheduled suggestion.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Preferred phrases</Label>
            <div className="flex gap-2 mt-1">
              <Input value={preferInput} onChange={(e) => setPreferInput(e.target.value)} placeholder="e.g. 'restored to the soul'" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip("prefer"))} />
              <Button type="button" variant="outline" onClick={() => addChip("prefer")}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {s.preferred_phrases.map((p, i) => (
                <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeChip("prefer", i)}>{p} ✕</Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Forbidden phrases</Label>
            <div className="flex gap-2 mt-1">
              <Input value={forbidInput} onChange={(e) => setForbidInput(e.target.value)} placeholder="e.g. 'cheap', 'used'" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChip("forbid"))} />
              <Button type="button" variant="outline" onClick={() => addChip("forbid")}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {s.forbidden_phrases.map((p, i) => (
                <Badge key={i} variant="outline" className="cursor-pointer" onClick={() => removeChip("forbid", i)}>{p} ✕</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded border p-3">
          <div>
            <p className="text-sm font-medium">Auto-apply safe suggestions</p>
            <p className="text-xs text-muted-foreground">Currently advisory only — every write still routes through the inbox for now.</p>
          </div>
          <Switch checked={s.auto_apply_safe} onCheckedChange={(v) => setS({ ...s, auto_apply_safe: v })} />
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-2" /> Save settings</Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> What the AI has learned</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Applied</p>
            <p className="text-2xl font-display">{stats.applied}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Top: {stats.topApplied.join(", ") || "—"}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Dismissed</p>
            <p className="text-2xl font-display">{stats.dismissed}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Top: {stats.topDismissed.join(", ") || "—"}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">The assistant reads the latest 50 feedback entries on every scan and chat to bias future proposals toward what you accept and away from what you reject.</p>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium flex items-center gap-2"><Volume2 className="h-4 w-4 text-primary" /> Kicks voice</h2>
            <p className="text-[11px] text-muted-foreground">Uses the Lovable AI Gateway (gpt-4o-mini-tts) when on, falls back to your browser voice otherwise.</p>
          </div>
          <Switch
            checked={voicePrefs.useAiVoice}
            onCheckedChange={(v) => saveVoicePrefs({ ...voicePrefs, useAiVoice: v })}
          />
        </div>

        <div className="grid gap-2">
          <Label>Voice (friendly female options)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VOICE_OPTIONS.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between rounded border p-2 ${voicePrefs.voice === v.id ? "border-primary bg-primary/5" : ""}`}
              >
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => saveVoicePrefs({ ...voicePrefs, voice: v.id })}
                >
                  <p className="text-sm font-medium">{v.label}{voicePrefs.voice === v.id && <span className="ml-2 text-[10px] text-primary">selected</span>}</p>
                  <p className="text-[11px] text-muted-foreground">{v.hint}</p>
                </button>
                <Button type="button" size="sm" variant="outline" disabled={previewing === v.id} onClick={() => preview(v.id)}>
                  <Play className="h-3 w-3 mr-1" /> {previewing === v.id ? "…" : "Preview"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Speed ({voicePrefs.speed?.toFixed(2)}x)</Label>
          <Slider
            min={0.75} max={1.25} step={0.05}
            value={[voicePrefs.speed ?? 1.0]}
            onValueChange={(v) => saveVoicePrefs({ ...voicePrefs, speed: v[0] })}
          />
        </div>

        <div>
          <Label>Voice instructions (optional)</Label>
          <Textarea
            rows={3}
            placeholder="Leave blank for the default 'perky, knowledgeable coworker' style. Override here to tune tone, energy, pacing, accent…"
            value={voicePrefs.instructions ?? ""}
            onChange={(e) => saveVoicePrefs({ ...voicePrefs, instructions: e.target.value })}
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={() => preview(voicePrefs.voice)}>
            <Play className="h-4 w-4 mr-2" /> Preview current settings
          </Button>
        </div>
      </Card>
    </div>
  );
}

const VOICE_OPTIONS: { id: KicksVoiceId; label: string; hint: string }[] = [
  { id: "coral",   label: "Coral",   hint: "Warm, perky, conversational — recommended default." },
  { id: "shimmer", label: "Shimmer", hint: "Bright and upbeat, light energy." },
  { id: "nova",    label: "Nova",    hint: "Clear and confident, a touch professional." },
  { id: "sage",    label: "Sage",    hint: "Calm, soft-spoken, measured pacing." },
  { id: "alloy",   label: "Alloy",   hint: "Neutral and balanced; good clarity." },
  { id: "ballad",  label: "Ballad",  hint: "Expressive with more melodic inflection." },
  { id: "fable",   label: "Fable",   hint: "Storyteller cadence — slightly playful." },
];