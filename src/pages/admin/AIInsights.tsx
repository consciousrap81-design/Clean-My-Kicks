import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar,
} from "recharts";

type Feedback = { action: string; kind: string | null; created_at: string };

function bucketByDay(rows: Feedback[], days: number) {
  const map = new Map<string, { date: string; applied: number; dismissed: number; undone: number }>();
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { date: key.slice(5), applied: 0, dismissed: 0, undone: 0 });
  }
  rows.forEach((r) => {
    const key = r.created_at.slice(0, 10);
    const b = map.get(key);
    if (!b) return;
    if (r.action === "applied") b.applied++;
    else if (r.action === "dismissed") b.dismissed++;
    else if (r.action === "undone") b.undone++;
  });
  return Array.from(map.values());
}

function byKind(rows: Feedback[]) {
  const m = new Map<string, { kind: string; applied: number; dismissed: number; undone: number; rate: number }>();
  rows.forEach((r) => {
    const k = r.kind ?? "other";
    const cur = m.get(k) ?? { kind: k, applied: 0, dismissed: 0, undone: 0, rate: 0 };
    if (r.action === "applied") cur.applied++;
    else if (r.action === "dismissed") cur.dismissed++;
    else if (r.action === "undone") cur.undone++;
    m.set(k, cur);
  });
  const out = Array.from(m.values()).map((r) => {
    const total = r.applied + r.dismissed;
    return { ...r, rate: total ? Math.round((r.applied / total) * 100) : 0, total };
  });
  return out.sort((a, b) => (b.applied + b.dismissed) - (a.applied + a.dismissed));
}

export default function AIInsights() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(); since.setDate(since.getDate() - days);
      const { data } = await supabase
        .from("ai_feedback")
        .select("action,kind,created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });
      if (!active) return;
      setRows((data ?? []) as Feedback[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [days]);

  const totals = useMemo(() => {
    const applied = rows.filter((r) => r.action === "applied").length;
    const dismissed = rows.filter((r) => r.action === "dismissed").length;
    const undone = rows.filter((r) => r.action === "undone").length;
    const decided = applied + dismissed;
    return { applied, dismissed, undone, decided, rate: decided ? Math.round((applied / decided) * 100) : 0 };
  }, [rows]);

  const series = useMemo(() => bucketByDay(rows, days), [rows, days]);
  const kinds = useMemo(() => byKind(rows), [rows]);

  const improving = kinds.filter((k) => k.total >= 3).sort((a, b) => b.rate - a.rate).slice(0, 3);
  const struggling = kinds.filter((k) => k.total >= 3).sort((a, b) => a.rate - b.rate).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> AI Insights</h1>
          <p className="text-sm text-muted-foreground">How Kicks is performing: apply vs dismiss rates by category over time.</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Applied</p><p className="text-2xl font-display">{totals.applied}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Dismissed</p><p className="text-2xl font-display">{totals.dismissed}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Undone</p><p className="text-2xl font-display">{totals.undone}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Success rate</p><p className="text-2xl font-display">{totals.rate}%</p><p className="text-[11px] text-muted-foreground">{totals.decided} decisions</p></Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Decisions over time</h2>
        {loading ? <div className="h-64 grid place-items-center text-sm text-muted-foreground">Loading…</div> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="ap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="dm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Area type="monotone" dataKey="applied" stroke="hsl(var(--primary))" fill="url(#ap)" />
              <Area type="monotone" dataKey="dismissed" stroke="hsl(var(--destructive))" fill="url(#dm)" />
              <Area type="monotone" dataKey="undone" stroke="hsl(var(--muted-foreground))" fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-medium mb-3">Success rate by suggestion kind</h2>
        {kinds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback yet — apply or dismiss some AI suggestions to build the dataset.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, kinds.length * 42)}>
            <BarChart data={kinds} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="kind" fontSize={11} width={140} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="applied" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="dismissed" stackId="a" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /> What Kicks is winning at</h2>
          {improving.length === 0 ? <p className="text-xs text-muted-foreground">Need at least 3 decisions per kind.</p> : (
            <ul className="space-y-2">
              {improving.map((k) => (
                <li key={k.kind} className="flex items-center justify-between text-sm">
                  <span>{k.kind}</span>
                  <Badge variant="secondary">{k.rate}% applied ({k.applied}/{k.total})</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-2"><TrendingDown className="h-4 w-4 text-destructive" /> Where Kicks is struggling</h2>
          {struggling.length === 0 ? <p className="text-xs text-muted-foreground">Need at least 3 decisions per kind.</p> : (
            <ul className="space-y-2">
              {struggling.map((k) => (
                <li key={k.kind} className="flex items-center justify-between text-sm">
                  <span>{k.kind}</span>
                  <Badge variant="outline">{k.rate}% applied ({k.applied}/{k.total})</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground flex items-start gap-2"><Sparkles className="h-3.5 w-3.5 text-primary mt-0.5" />
          These patterns are fed back into every chat and scheduled scan via your <strong className="text-foreground">AI Settings</strong>. Dismissed kinds bias future proposals away from those patterns; applied kinds reinforce them.
        </p>
      </Card>
    </div>
  );
}