import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JobStatusBadge, PaymentBadge, JOB_STATUS_OPTIONS } from "@/components/admin/StatusBadge";
import { Plus, Search } from "lucide-react";

export default function Jobs() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", status],
    queryFn: async () => {
      let query = supabase
        .from("jobs")
        .select("id,status,payment_status,shoe_brand,shoe_model,quoted_price,intake_date,due_date,customer:customers(name,phone),service:services(name)")
        .order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status as any);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filtered = (jobs || []).filter((j: any) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      j.customer?.name?.toLowerCase().includes(s) ||
      j.shoe_brand?.toLowerCase().includes(s) ||
      j.shoe_model?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-display tracking-wide">Jobs</h1>
        <Button asChild>
          <Link to="/admin/jobs/new"><Plus className="h-4 w-4" /> New Job</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customer or shoe…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {JOB_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No jobs yet. Create your first job.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((j: any) => (
            <Link key={j.id} to={`/admin/jobs/${j.id}`}>
              <Card className="hover:border-primary transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {j.customer?.name || "—"} · {j.shoe_brand} {j.shoe_model}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {j.service?.name || "No service"} · Intake: {j.intake_date || "—"} · Due: {j.due_date || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">${Number(j.quoted_price).toFixed(2)}</span>
                    <PaymentBadge status={j.payment_status} />
                    <JobStatusBadge status={j.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}