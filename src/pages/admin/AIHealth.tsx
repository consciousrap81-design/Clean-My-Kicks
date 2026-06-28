import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

type Counts = Record<string, number>;

type HealthData = {
  sugByStatus: Counts;
  fbByAction: Counts;
  auditCount: number;
  historyTotal: number;
  historyUndone: number;
  appliedSugs: { id: string; title: string; resolved_at: string | null }[];
  dismissedSugs: { id: string; title: string; resolved_at: string | null }[];
  feedbackSugIds: Set<string>;
  feedbackByAction: Record<string, Set<string>>;
  failed: { id: string; kind: string; title: string; created_at: string }[];
  errorAudits: { id: string; tool: string; output: any; created_at: string }[];
  undoneHistory: { id: string; suggestion_id: string | null; undone_at: string | null }[];
  undoneFeedbackSugIds: Set<string>;
};

const WINDOW_DAYS = 30;

function pct(n: number, d: number) {
  if (!d) return 100;
  return Math.round((n / d) * 100);
}

function coverageBadge(p: number) {
  if (p >= 100) return <Badge className="bg-emerald-600 hover:bg-emerald-600">{p}% healthy</Badge>;
  if (p >= 90) return <Badge className="bg-amber-500 hover:bg-amber-500">{p}% partial</Badge>;
  return <Badge variant="destructive">{p}% degraded</Badge>;
}

export default function AIHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
    const [sugRes, fbRes, auditAllRes, historyRes, failedRes, errAuditsRes] = await Promise.all([
      supabase.from("ai_suggestions").select("id,title,status,resolved_at,created_at").gte("created_at", since).limit(1000),
      supabase.from("ai_feedback").select("id,suggestion_id,action,created_at").gte("created_at", since).limit(1000),
      supabase.from("ai_audit_log").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase.from("ai_change_history").select("id,suggestion_id,undone,undone_at,created_at").gte("created_at", since).limit(1000),
      supabase.from("ai_suggestions").select("id,kind,title,created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(10),
      supabase.from("ai_audit_log").select("id,tool,output,created_at").order("created_at", { ascending: false }).limit(200),
    ]);

    const sugs = sugRes.data ?? [];
    const fbs = fbRes.data ?? [];
    const hist = historyRes.data ?? [];

    const sugByStatus: Counts = {};
    for (const s of sugs) sugByStatus[s.status] = (sugByStatus[s.status] ?? 0) + 1;

    const fbByAction: Counts = {};
    const feedbackByAction: Record<string, Set<string>> = {};
    for (const f of fbs) {
      fbByAction[f.action] = (fbByAction[f.action] ?? 0) + 1;
      if (!feedbackByAction[f.action]) feedbackByAction[f.action] = new Set();
      if (f.suggestion_id) feedbackByAction[f.action].add(f.suggestion_id);
    }

    const errorAudits = (errAuditsRes.data ?? []).filter((a: any) => {
      const o = a.output;
      if (!o || typeof o !== "object") return false;
      return "error" in o || o.ok === false;
    }).slice(0, 10);

    setData({
      sugByStatus,
      fbByAction,
      auditCount: auditAllRes.count ?? 0,
      historyTotal: hist.length,
      historyUndone: hist.filter((h) => h.undone).length,
      appliedSugs: sugs.filter((s) => s.status === "applied"),
      dismissedSugs: sugs.filter((s) => s.status === "dismissed"),
      feedbackSugIds: new Set(fbs.map((f) => f.suggestion_id).filter(Boolean) as string[]),
      feedbackByAction,
      failed: failedRes.data ?? [],
      errorAudits,
      undoneHistory: hist.filter((h) => h.undone),
      undoneFeedbackSugIds: feedbackByAction["undone"] ?? new Set(),
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">{loading ? "Loading health data…" : "No data"}</div>;
  }

  const appliedCovered = data.appliedSugs.filter((s) => (data.feedbackByAction["applied"] ?? new Set()).has(s.id)).length;
  const dismissedCovered = data.dismissedSugs.filter((s) => (data.feedbackByAction["dismissed"] ?? new Set()).has(s.id)).length;
  const undoneCovered = data.undoneHistory.filter((h) => h.suggestion_id && data.undoneFeedbackSugIds.has(h.suggestion_id)).length;

  const appliedPct = pct(appliedCovered, data.appliedSugs.length);
  const dismissedPct = pct(dismissedCovered, data.dismissedSugs.length);
  const undonePct = pct(undoneCovered, data.undoneHistory.length);

  const totalActivity =
    (data.sugByStatus.applied ?? 0) +
    (data.sugByStatus.dismissed ?? 0) +
    (data.fbByAction.applied ?? 0) +
    (data.fbByAction.dismissed ?? 0) +
    data.auditCount +
    data.historyTotal;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Adaptability Health
          </h1>
          <p className="text-sm text-muted-foreground">
            Last {WINDOW_DAYS} days of feedback, audit, and change-history activity for Kicks.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {totalActivity === 0 && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">No learning activity recorded in the last {WINDOW_DAYS} days.</p>
              <p className="text-muted-foreground">
                Pipeline tables are reachable but empty for this window — Kicks hasn't logged any apply/dismiss/undo events yet. Approve or dismiss a suggestion from the AI Suggestions inbox to start the feedback loop.
              </p>
            </div>
          </div>
        </Card>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Suggestions" rows={[
          ["pending", data.sugByStatus.pending ?? 0],
          ["applied", data.sugByStatus.applied ?? 0],
          ["dismissed", data.sugByStatus.dismissed ?? 0],
          ["failed", data.sugByStatus.failed ?? 0],
        ]} />
        <StatCard label="Feedback events" rows={[
          ["applied", data.fbByAction.applied ?? 0],
          ["dismissed", data.fbByAction.dismissed ?? 0],
          ["undone", data.fbByAction.undone ?? 0],
        ]} />
        <StatCard label="Audit log" rows={[["entries", data.auditCount]]} />
        <StatCard label="Change history" rows={[
          ["total", data.historyTotal],
          ["undone", data.historyUndone],
        ]} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Coverage checks</h2>
        <CoverageRow label="Applied suggestions logged in ai_feedback" covered={appliedCovered} total={data.appliedSugs.length} p={appliedPct} />
        <CoverageRow label="Dismissed suggestions logged in ai_feedback" covered={dismissedCovered} total={data.dismissedSugs.length} p={dismissedPct} />
        <CoverageRow label="Undo events linked to ai_feedback" covered={undoneCovered} total={data.undoneHistory.length} p={undonePct} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Recent errors & failed actions
        </h2>
        {data.failed.length === 0 && data.errorAudits.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> No failed suggestions or audit errors recorded.
          </Card>
        ) : (
          <>
            {data.failed.map((f) => (
              <Card key={f.id} className="p-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="destructive">failed</Badge>
                  <Badge variant="outline" className="text-[10px]">{f.kind}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1">{f.title}</p>
              </Card>
            ))}
            {data.errorAudits.map((a) => (
              <Card key={a.id} className="p-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="destructive">audit error</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.tool}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto"><code>{JSON.stringify(a.output, null, 2)}</code></pre>
              </Card>
            ))}
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, rows }: { label: string; rows: [string, number][] }) {
  return (
    <Card className="p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground capitalize">{k}</span>
            <span className="font-medium tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CoverageRow({ label, covered, total, p }: { label: string; covered: number; total: number; p: number }) {
  return (
    <Card className="p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{covered} of {total} recorded</p>
      </div>
      {coverageBadge(p)}
    </Card>
  );
}