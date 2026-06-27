import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Check, RotateCw, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Draft = { formatted: string; summary?: string; highlights?: string[]; font_suggestion?: string; notes?: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  original: string;
  product?: { name?: string; brand?: string; model?: string; size?: string; condition?: string; price?: string };
  onAccept: (formatted: string) => void;
};

export default function PolishDescriptionDialog({ open, onOpenChange, original, product, onAccept }: Props) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [edited, setEdited] = useState("");

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
        body: JSON.stringify({ raw: original, product }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setDraft(j);
      setEdited(j.formatted ?? "");
    } catch (e: any) {
      toast.error(e.message || "Polish failed");
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    onAccept(edited);
    onOpenChange(false);
    setDraft(null);
    toast.success("Description updated");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setDraft(null); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Polish description with Kicks</DialogTitle>
          <DialogDescription>Kicks reformats your pasted text with sections, bullets, and bold highlights. Review and edit before applying.</DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Original</div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">{original || <span className="text-muted-foreground italic">(empty)</span>}</div>
            </div>
            <Button onClick={run} disabled={busy || !original.trim()} className="w-full">
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Polishing…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate draft</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {draft.notes && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
                <span className="font-medium">What Kicks changed:</span> {draft.notes}
              </div>
            )}

            {draft.highlights && draft.highlights.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Suggested highlights</div>
                <ul className="text-sm list-disc pl-5 space-y-0.5">
                  {draft.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {draft.font_suggestion && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Type className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span><span className="font-medium text-foreground">Typography note:</span> {draft.font_suggestion}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Editable markdown</div>
                <Textarea rows={14} value={edited} onChange={(e) => setEdited(e.target.value)} className="font-mono text-xs" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Live preview</div>
                <div className="rounded-md border bg-background p-3 text-sm prose prose-sm dark:prose-invert max-w-none min-h-[14rem]">
                  <ReactMarkdown>{edited}</ReactMarkdown>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => { setDraft(null); setEdited(""); }}>
                <RotateCw className="h-4 w-4 mr-2" /> Try again
              </Button>
              <Button onClick={accept} disabled={!edited.trim()}>
                <Check className="h-4 w-4 mr-2" /> Apply to product
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}