import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock } from "lucide-react";

export default function OrderDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const { data: job } = useQuery({
    queryKey: ["customer-job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, services:service_id(name), job_photos(*), payments(*), job_updates(*)")
        .eq("id", jobId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  useEffect(() => {
    (async () => {
      if (!job?.job_photos) return;
      const urls: Record<string, string> = {};
      for (const p of job.job_photos as any[]) {
        const { data } = await supabase.storage.from("job-photos").createSignedUrl(p.url, 3600);
        if (data) urls[p.id] = data.signedUrl;
      }
      setPhotoUrls(urls);
    })();
  }, [job?.job_photos]);

  if (!job) return <div className="text-muted-foreground text-sm">Loading…</div>;

  const before = (job.job_photos || []).filter((p: any) => p.kind === "before");
  const after = (job.job_photos || []).filter((p: any) => p.kind === "after");
  const updates = (job.job_updates || []).filter((u: any) => u.customer_visible);

  const timeline = [
    ...updates.map((u: any) => ({ at: u.created_at, label: u.body, kind: "note" as const })),
    ...(job.intake_date ? [{ at: job.intake_date, label: "Shoes received", kind: "status" as const }] : []),
    ...(job.completion_date ? [{ at: job.completion_date, label: "Service completed", kind: "status" as const }] : []),
    { at: job.created_at, label: "Order created", kind: "status" as const },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="space-y-4">
      <Link to="/account" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-xl tracking-wide">
                {[job.shoe_brand, job.shoe_model].filter(Boolean).join(" ") || "Sneaker Service"}
              </div>
              <div className="text-sm text-muted-foreground">{job.services?.name || "Service"}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-display">${Number(job.quoted_price).toFixed(2)}</div>
              <Badge variant="outline" className="mt-1">{job.payment_status}</Badge>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="outline">{job.status.replace(/_/g, " ")}</Badge>
          </div>
        </CardContent>
      </Card>

      {(job.payments || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {job.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">${Number(p.amount).toFixed(2)} <span className="text-muted-foreground font-normal">· {p.kind}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</div>
                </div>
                <Badge variant="outline">{p.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground">No updates yet.</div>
          ) : (
            <ol className="space-y-3">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className={t.kind === "note" ? "" : "text-muted-foreground"}>{t.label}</div>
                    <div className="text-xs text-muted-foreground">{new Date(t.at).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {before.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Before</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {before.map((p: any) => photoUrls[p.id] && (
                <img key={p.id} src={photoUrls[p.id]} alt="" className="aspect-square w-full object-cover rounded-md border" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {after.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">After</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {after.map((p: any) => photoUrls[p.id] && (
                <img key={p.id} src={photoUrls[p.id]} alt="" className="aspect-square w-full object-cover rounded-md border" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}