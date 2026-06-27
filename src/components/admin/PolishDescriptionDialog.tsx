import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Check, RotateCw, Type, History, X, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

type Tone = "luxury" | "casual" | "technical";
type Density = "light" | "standard" | "bold";
type Draft = { formatted: string; summary?: string; highlights?: string[]; font_suggestion?: string; notes?: string };
type Version = { id: string; createdAt: number; tone: Tone; density: Density; draft: Draft; label?: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  original: string;
  product?: { name?: string; brand?: string; model?: string; size?: string; condition?: string; price?: string };
  onAccept: (formatted: string) => void;
};

function splitBlocks(md: string): string[] {
  return md.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
}

function storageKey(product?: Props["product"]) {
  const k = [product?.brand, product?.model, product?.name].filter(Boolean).join("|") || "default";
  return `cmk.polish.versions.${k}`;
}

export default function PolishDescriptionDialog({ open, onOpenChange, original, product, onAccept }: Props) {
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<Tone>("casual");
  const [density, setDensity] = useState<Density>("standard");
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [edited, setEdited] = useState("");
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});

  const active = versions.find((v) => v.id === activeId) || null;
  const blocks = useMemo(() => splitBlocks(edited), [edited]);

  // Load persisted versions when product context changes
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(storageKey(product));
      const parsed: Version[] = raw ? JSON.parse(raw) : [];
      setVersions(parsed);
    } catch {
      setVersions([]);
    }
  }, [open, product?.brand, product?.model, product?.name]);

  function persist(next: Version[]) {
    setVersions(next);
    try { localStorage.setItem(storageKey(product), JSON.stringify(next.slice(-20))); } catch {}
  }

  function loadVersion(v: Version) {
    setActiveId(v.id);
    setEdited(v.draft.formatted);
    const init: Record<number, boolean> = {};
    splitBlocks(v.draft.formatted).forEach((_, i) => (init[i] = true));
    setAccepted(init);
  }

  async function run() {
    if (!original.trim()) { toast.error("Add a description first"); return; }
    setBusy(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polish-product-description`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ raw: original, product, tone, density }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      const v: Version = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        tone, density,
        draft: j,
        label: `v${versions.length + 1} · ${tone}/${density}`,
      };
      persist([...versions, v]);
      loadVersion(v);
    } catch (e: any) {
      toast.error(e.message || "Polish failed");
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    // Apply only blocks the user accepted; if user manually edited the textarea
    // the edited content wins (block toggles still filter by block index).
    const kept = blocks.filter((_, i) => accepted[i] !== false).join("\n\n");
    onAccept(kept || edited);
    onOpenChange(false);
    setActiveId(null);
    toast.success("Description updated");
  }

  function restoreOriginal() {
    onAccept(original);
    toast.success("Restored original description");
  }

  function reset() {
    setActiveId(null);
    setEdited("");
    setAccepted({});
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setActiveId(null); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Polish description with Kicks</DialogTitle>
          <DialogDescription>Pick a tone and density, then accept or reject each block before applying.</DialogDescription>
        </DialogHeader>

        {/* Style controls — always visible */}
        <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3">
          <div>
            <Label className="text-xs">Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="luxury">Luxury — refined, aspirational</SelectItem>
                <SelectItem value="casual">Casual — sneakerhead voice</SelectItem>
                <SelectItem value="technical">Technical — spec-forward</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Formatting density</Label>
            <Select value={density} onValueChange={(v) => setDensity(v as Density)}>
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light — minimal formatting</SelectItem>
                <SelectItem value="standard">Standard — sections + bullets</SelectItem>
                <SelectItem value="bold">Bold — fully structured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!active ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Original</div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">{original || <span className="text-muted-foreground italic">(empty)</span>}</div>
            </div>
            {versions.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><History className="h-3 w-3" /> Previous drafts</div>
                <div className="flex flex-wrap gap-2">
                  {versions.map((v) => (
                    <button key={v.id} type="button" onClick={() => loadVersion(v)} className="text-xs rounded-md border px-2 py-1 hover:bg-accent">
                      {v.label} · {new Date(v.createdAt).toLocaleTimeString()}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={run} disabled={busy || !original.trim()} className="w-full">
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Polishing…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate draft</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Version switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground"><History className="h-3 w-3 inline mr-1" />Versions:</span>
              {versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => loadVersion(v)}
                  className={`text-xs rounded-md border px-2 py-1 ${v.id === activeId ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {active.draft.notes && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
                <span className="font-medium">What Kicks changed:</span> {active.draft.notes}
              </div>
            )}

            {active.draft.highlights && active.draft.highlights.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Suggested highlights</div>
                <ul className="text-sm list-disc pl-5 space-y-0.5">
                  {active.draft.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {active.draft.font_suggestion && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Type className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span><span className="font-medium text-foreground">Typography note:</span> {active.draft.font_suggestion}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Editable markdown</div>
                <Textarea
                  rows={18}
                  value={edited}
                  onChange={(e) => {
                    setEdited(e.target.value);
                    const next: Record<number, boolean> = {};
                    splitBlocks(e.target.value).forEach((_, i) => (next[i] = accepted[i] !== false));
                    setAccepted(next);
                  }}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
                  <span>Block-by-block preview</span>
                  <Badge variant="outline" className="font-normal text-[10px]">click ✓ to keep · ✕ to drop</Badge>
                </div>
                <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                  {blocks.length === 0 && <div className="text-xs text-muted-foreground italic">(empty)</div>}
                  {blocks.map((b, i) => {
                    const keep = accepted[i] !== false;
                    return (
                      <div
                        key={i}
                        className={`rounded-md border p-3 text-sm transition ${keep ? "bg-background" : "bg-muted/40 opacity-50 line-through decoration-1"}`}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={keep}
                            onCheckedChange={(v) => setAccepted({ ...accepted, [i]: !!v })}
                            className="mt-1"
                          />
                          <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                            <ReactMarkdown>{b}</ReactMarkdown>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAccepted({ ...accepted, [i]: !keep })}
                            className="text-muted-foreground hover:text-foreground"
                            title={keep ? "Reject this block" : "Accept this block"}
                          >
                            {keep ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
              <Button variant="ghost" onClick={restoreOriginal} title="Replace with the original pre-polish description">
                <Undo2 className="h-4 w-4 mr-2" /> Restore original
              </Button>
              <Button variant="ghost" onClick={reset}>
                Back
              </Button>
              <Button variant="outline" onClick={run} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCw className="h-4 w-4 mr-2" />}
                Regenerate
              </Button>
              <Button onClick={accept} disabled={!edited.trim()}>
                <Check className="h-4 w-4 mr-2" /> Apply selected blocks
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}