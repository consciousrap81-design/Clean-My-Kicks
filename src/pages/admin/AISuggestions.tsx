import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Sparkles, RefreshCw, Check, X, Undo2, ExternalLink, History, AlertTriangle } from "lucide-react";
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

// All kinds below have a real executor now. "Drafted" kinds produce a social post + reminder when applied.
const DRAFTED_KINDS = new Set(["marketing_idea", "content_idea"]);
const ACTIONABLE_KINDS = new Set([
  "publish_product", "pricing_idea", "restock_alert", "follow_up_request",
  "update_product", "price_change", "update_job_status", "create_promo",
  "marketing_idea", "content_idea",
]);

function hasActionableTarget(kind: string, payload: any): boolean {
  if (DRAFTED_KINDS.has(kind)) return true; // always applyable — Kicks generates the draft on apply
  switch (kind) {
    case "publish_product": return !!payload?.product_id;
    case "pricing_idea":
    case "price_change": return !!payload?.product_id && (typeof payload?.price_cents === "number" || typeof payload?.price === "number");
    case "restock_alert": return !!payload?.variant_id && typeof payload?.add_stock === "number";
    case "follow_up_request": return !!payload?.request_id && !!payload?.status;
    case "update_product": return !!payload?.product_id && !!payload?.updates;
    case "update_job_status": return !!payload?.job_id && !!payload?.status;
    case "create_promo": {
      const pct = Number(payload?.discount_percentage ?? payload?.amount);
      return Number.isFinite(pct) && pct >= 1 && pct <= 50;
    }
    default: return false;
  }
}

function previewFor(kind: string, payload: any): string | null {
  if (kind === "pricing_idea" || kind === "price_change") {
    const cents = payload?.price_cents;
    const price = typeof cents === "number" ? cents / 100 : payload?.price;
    if (typeof price === "number") return `New price → $${price.toFixed(2)}`;
  }
  if (kind === "create_promo") {
    const pct = payload?.discount_percentage ?? payload?.amount;
    const name = payload?.campaign_name;
    return pct ? `Will create promo code (${pct}% off${name ? ` · ${name}` : ""})` : null;
  }
  if (kind === "restock_alert" && payload?.add_stock) return `+${payload.add_stock} units`;
  if (kind === "publish_product") return `Will set status → available`;
  if (kind === "follow_up_request" && payload?.status) return `Request → ${payload.status}`;
  if (kind === "marketing_idea" || kind === "content_idea") return `Kicks will draft a social post + a reminder for 3 days from now`;
  return null;
}

export default function AISuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<ChangeHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSources, setShowSources] = useState(true);
  const [busyBulk, setBusyBulk] = useState(false);
  const [retrying, setRetrying] = useState(false);

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
    const { data, error } = await supabase.functions.invoke("admin-ai-execute", { body: { suggestion_id: id, action } });
    if (error) { toast.error(error.message); return; }
    if (action === "apply") {
      const r = data?.results?.[0];
      if (r && r.ok === false) toast.error(r.error || "Failed to apply");
      else if (r?.advisory) toast.success(r.message || "Advisory acknowledged");
      else toast.success(r?.message || "Applied");
    } else {
      toast.success("Dismissed");
    }
    await load();
  }

  async function bulkAct(action: "apply" | "dismiss") {
    if (!selected.size) return;
    setBusyBulk(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-execute", { body: { suggestion_ids: Array.from(selected), action } });
      if (error) throw error;
      if (action === "apply") {
        const results: any[] = data?.results ?? [];
        const ok = results.filter((r) => r.ok !== false).length;
        const failed = results.length - ok;
        if (failed > 0) toast.error(`${failed} failed, ${ok} succeeded`);
        else toast.success(`Applied ${ok} suggestion${ok === 1 ? "" : "s"}`);
      } else {
        toast.success(`Dismissed ${selected.size}`);
      }
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
  const stuckCount = useMemo(
    () => items.filter((i) => (i.status === "failed" || i.status === "acknowledged") && (i.kind === "create_promo" || i.kind === "marketing_idea" || i.kind === "content_idea" || i.kind === "pricing_idea" || i.kind === "price_change")).length,
    [items]
  );
  const allSelected = pending.length > 0 && pending.every((p) => selected.has(p.id));
  const staleCount = useMemo(
    () => pending.filter((p) => ACTIONABLE_KINDS.has(p.kind) && !hasActionableTarget(p.kind, p.payload)).length,
    [pending]
  );

  async function retryStuck() {
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-execute", { body: { action: "retry_stuck" } });
      if (error) throw error;
      toast.success(`Moved ${data?.reset ?? 0} stuck suggestion${data?.reset === 1 ? "" : "s"} back to pending`);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setRetrying(false); }
  }

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
        {stuckCount > 0 && (
          <Card className="p-3 border-blue-500/40 bg-blue-500/5 flex items-start gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs flex-1">
              <p className="font-medium">{stuckCount} previously-stuck suggestion{stuckCount === 1 ? "" : "s"} can now be applied.</p>
              <p className="text-muted-foreground mt-0.5">The pricing column bug is fixed, promos and post drafts have executors. Retry them now.</p>
            </div>
            <Button size="sm" variant="outline" onClick={retryStuck} disabled={retrying}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${retrying ? "animate-spin" : ""}`} /> Retry stuck
            </Button>
          </Card>
        )}
        {staleCount > 0 && (
          <Card className="p-3 border-amber-500/40 bg-amber-500/5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs flex-1">
              <p className="font-medium">{staleCount} suggestion{staleCount === 1 ? "" : "s"} from an older scan can't be applied — they're missing target IDs.</p>
              <p className="text-muted-foreground mt-0.5">Dismiss them and run a fresh scan so Kicks can attach the right product/variant/request IDs.</p>
            </div>
            <Button size="sm" variant="outline" onClick={runScan} disabled={scanning}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${scanning ? "animate-spin" : ""}`} /> Re-scan
            </Button>
          </Card>
        )}
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
          const advisory = ADVISORY_KINDS.has(s.kind);
          const actionable = hasActionableTarget(s.kind, s.payload);
          const stale = ACTIONABLE_KINDS.has(s.kind) && !actionable;
          return (
            <Card key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox className="mt-1" checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline">{s.kind}</Badge>
                    {DRAFTED_KINDS.has(s.kind) && <Badge variant="secondary" className="text-[10px]">Drafts a post</Badge>}
                    {actionable && <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Actionable</Badge>}
                    {stale && <Badge variant="destructive" className="text-[10px]">Missing target ID</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                  </div>
                  <p className="font-medium">{s.title}</p>
                  {s.summary && <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>}
                  {previewFor(s.kind, s.payload) && (
                    <p className="text-xs mt-1 px-2 py-1 rounded bg-primary/5 border border-primary/20 inline-block">
                      <span className="font-medium text-primary">On apply:</span> {previewFor(s.kind, s.payload)}
                    </p>
                  )}
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
                  <Button size="sm" onClick={() => act(s.id, "apply")} disabled={stale} title={stale ? "Missing target ID — re-scan to regenerate" : undefined}>
                    <Check className="h-3.5 w-3.5 mr-1" />Apply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => act(s.id, "dismiss")}><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {s.payload?.error && (
                <p className="mt-2 text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {s.payload.error}</p>
              )}
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