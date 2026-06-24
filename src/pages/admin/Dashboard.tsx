import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Clock, CheckCircle2, DollarSign, AlertCircle, Timer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

function StatCard({ icon: Icon, label, value, sub }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
            <div className="text-2xl font-display mt-1">{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
          </div>
          <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const [jobsRes, paymentsRes, servicesRes, sourcesRes] = await Promise.all([
        supabase.from("jobs").select("id,status,quoted_price,intake_date,completion_date,service_id,lead_source_id"),
        supabase.from("payments").select("amount"),
        supabase.from("services").select("id,name"),
        supabase.from("lead_sources").select("id,name"),
      ]);
      const jobs = jobsRes.data || [];
      const payments = paymentsRes.data || [];
      const services = servicesRes.data || [];
      const sources = sourcesRes.data || [];

      const totalJobs = jobs.length;
      const completedSet = new Set(["completed", "shipped", "picked_up"]);
      const completed = jobs.filter((j) => completedSet.has(j.status)).length;
      const pending = jobs.filter((j) => !completedSet.has(j.status) && j.status !== "cancelled").length;

      const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const totalQuoted = jobs
        .filter((j) => j.status !== "cancelled")
        .reduce((s, j) => s + Number(j.quoted_price || 0), 0);
      const unpaid = Math.max(0, totalQuoted - totalRevenue);

      const turnaroundDays = jobs
        .filter((j) => j.intake_date && j.completion_date)
        .map((j) => (new Date(j.completion_date!).getTime() - new Date(j.intake_date!).getTime()) / 86400000);
      const avgTurnaround =
        turnaroundDays.length > 0
          ? turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length
          : 0;

      const svcCount: Record<string, number> = {};
      jobs.forEach((j) => { if (j.service_id) svcCount[j.service_id] = (svcCount[j.service_id] || 0) + 1; });
      const topServices = Object.entries(svcCount)
        .map(([id, count]) => ({ name: services.find((s) => s.id === id)?.name || "Unknown", count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const srcCount: Record<string, number> = {};
      jobs.forEach((j) => { if (j.lead_source_id) srcCount[j.lead_source_id] = (srcCount[j.lead_source_id] || 0) + 1; });
      const leadSources = Object.entries(srcCount)
        .map(([id, count]) => ({ name: sources.find((s) => s.id === id)?.name || "Unknown", count }))
        .sort((a, b) => b.count - a.count);

      return { totalJobs, pending, completed, totalRevenue, unpaid, avgTurnaround, topServices, leadSources };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (isLoading || !data) return <div className="text-muted-foreground">Loading metrics…</div>;

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Business overview for Clean My Kicks</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={ListChecks} label="Total Jobs" value={data.totalJobs} />
        <StatCard icon={Clock} label="Pending" value={data.pending} />
        <StatCard icon={CheckCircle2} label="Completed" value={data.completed} />
        <StatCard icon={DollarSign} label="Revenue" value={fmt(data.totalRevenue)} />
        <StatCard icon={AlertCircle} label="Unpaid" value={fmt(data.unpaid)} />
        <StatCard icon={Timer} label="Avg Turnaround" value={`${data.avgTurnaround.toFixed(1)}d`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Services</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data.topServices.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topServices}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
          <CardContent className="h-64">
            {data.leadSources.length === 0 ? (
              <div className="text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.leadSources}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}