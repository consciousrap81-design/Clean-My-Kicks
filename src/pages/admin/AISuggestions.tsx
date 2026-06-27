import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Sparkles, RefreshCw, Check, X, Undo2, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";

type Suggestion = { id: string; kind: string; title: string; summary: string | null; status: string; payload: any; created_at: string };
type ChangeHistory = { id: string; suggestion_id: string | null; kind: string; table_name: string | null; record_id: string | null; before_state: any; after_state: any; undone: boolean; undone_at: string | null; created_at: string };
type SourceLink = { title?: string; url?: string; snippet?: string };

function extractSources(payload: any): SourceLink[] {
  if (!payload) return [];
  const candidates = [payload.sources, payload.raw?.sources, payload.citations, payload.raw?.citations];
  for (const c of candidates) if (Array.isArray(c) && c.length) return c as SourceLink[];
  return [];
}

export default function AISuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<ChangeHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSources, setShowSources] = useState(true);
  const [busyBulk, setBusyBulk] = useState(false);

  async function load() {
    setLoading(true);
    const [s, h] = await Promise.all([
      supabase.from("ai_suggestions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("ai_change_history").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setItems((s.data ?? []) as Suggestion[]);
    setHistory((h.data ?? []) as ChangeHistory[]);
    setSelected(new Set());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function runScan() {
    setScanning(true);
    try {
      const { error } = await supabase.functions.invoke("admin-ai-scan", { body: {} });
      if (error) throw error;
      toast.success("Scan complete");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setScanning(false); }
  }

  async function act(id: string, action: "apply" | "dismiss") {
    const { error } = await supabase.functions.invoke("admin-ai-execute", { body: { suggestion_id: id, action } });
    if (error) { toast.error(error.message); return; }
    toast.success(action === "apply" ? "Applied" : "Dismissed");
    await load();
  }

  async function bulkAct(action: "apply" | "dismiss") {
    if (!selected.size) return;
    setBusyBulk(true);
    try {
      const { error } = await supabase.functions.invoke("admin-ai-execute", { body: { suggestion_ids: Array.from(selected), action } });
      if (error) throw error;
      toast.success(`${action === "apply" ? "Applied" : "Dismissed"} ${selected.size} suggestion${selected.size === 1 ? "" : "s"}`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusyBulk(false); }
  }

  async function undo(historyId: string) {
    const { error } = await supabase.functions.invoke("admin-ai-execute", { body: { action: "undo", history_id: historyId } });
    if (error) { toast.error(error.message); return; }
    toast.success("Change reverted");
    await load();
  }

  const pending = useMemo(() => items.filter((i) => i.status === "pending"), [items]);
  const resolved = useMemo(() => items.filter((i) => i.status !== "pending"), [items]);
  const allSelected = pending.length > 0 && pending.every((p) => selected.has(p.id));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(pending.map((p) => p.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Suggestions</h1>
          <p className="text-sm text-muted-foreground">Approve or dismiss proposals. Every applied change can be undone.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showSources} onCheckedChange={setShowSources} /> Show sources
          </label>
          <Button onClick={runScan} disabled={scanning} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} /> Run scan
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Pending ({pending.length})</h2>
          {pending.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} /> Select all
              </label>
              <Button size="sm" disabled={!selected.size || busyBulk} onClick={() => bulkAct("apply")}>
                <Check className="h-3.5 w-3.5 mr-1" /> Apply ({selected.size})
              </Button>
              <Button size="sm" variant="ghost" disabled={!selected.size || busyBulk} onClick={() => bulkAct("dismiss")}>
                <X className="h-3.5 w-3.5 mr-1" /> Dismiss
              </Button>
            </div>
          )}
        </div>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && pending.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No pending suggestions.</Card>}
        {pending.map((s) => {
          const sources = extractSources(s.payload);
          const reasoning = s.payload?.reasoning ?? s.payload?.raw?.reasoning;
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox className="mt-1" checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{s.kind}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  <p className="font-medium">{s.title}</p>
                  {s.summary && <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>}
                  {reasoning && <p className="text-xs text-muted-foreground mt-2 italic">Why: {reasoning}</p>}
                  {showSources && sources.length > 0 && (
                    <div className="mt-3 space-y-1 border-l-2 border-primary/40 pl-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sources & citations</p>
                      {sources.map((src, i) => (
                        <div key={i} className="text-xs">
                          {src.url ? (
                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                              {src.title || src.url} <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="font-medium">{src.title || "Reference"}</span>
                          )}
                          {src.snippet && <p className="text-muted-foreground">{src.snippet}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {showSources && sources.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2">No external sources cited — based on your internal data only.</p>
                  )}
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Raw payload</summary>
                    <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto"><code>{JSON.stringify(s.payload, null, 2)}</code></pre>
                  </details>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => act(s.id, "apply")}><Check className="h-3.5 w-3.5 mr-1" />Apply</Button>
                  <Button size="sm" variant="ghost" onClick={() => act(s.id, "dismiss")}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><History className="h-4 w-4" /> Version history ({history.length})</h2>
        {history.length === 0 && <p className="text-xs text-muted-foreground">No applied AI changes yet.</p>}
        {history.map((h) => (
          <Card key={h.id} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{h.kind}</Badge>
                  {h.table_name && <span className="text-xs text-muted-foreground">{h.table_name}#{(h.record_id || "").slice(0, 8)}</span>}
                  <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                  {h.undone && <Badge variant="secondary" className="text-[10px]">undone</Badge>}
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Diff</summary>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div><p className="text-[10px] uppercase text-muted-foreground">Before</p><pre className="p-2 bg-muted rounded overflow-x-auto"><code>{JSON.stringify(h.before_state, null, 2)}</code></pre></div>
                    <div><p className="text-[10px] uppercase text-muted-foreground">After</p><pre className="p-2 bg-muted rounded overflow-x-auto"><code>{JSON.stringify(h.after_state, null, 2)}</code></pre></div>
                  </div>
                </details>
              </div>
              {!h.undone && (
                <Button size="sm" variant="outline" onClick={() => undo(h.id)}>
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
                </Button>
              )}
            </div>
          </Card>
        ))}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Recent suggestions ({resolved.length})</h2>
          {resolved.slice(0, 20).map((s) => (
            <div key={s.id} className="text-sm flex items-center gap-2 px-3 py-1.5 rounded border">
              <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
              <span className="truncate flex-1">{s.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}