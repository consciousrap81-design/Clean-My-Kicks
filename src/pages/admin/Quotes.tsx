import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Copy, Mail, MailCheck, MailX, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_CLS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  viewed: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  accepted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  declined: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export default function Quotes() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: deliveryLog } = useQuery({
    queryKey: ["quote-delivery-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("recipient_email,status,error_message,created_at")
        .eq("template_name", "quote-sent")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const deliveryByEmail = useMemo(() => {
    const map = new Map<string, { status: string; error_message: string | null; created_at: string }>();
    for (const row of deliveryLog ?? []) {
      const key = (row.recipient_email ?? "").toLowerCase();
      // Latest-first — keep first seen per email
      if (key && !map.has(key)) map.set(key, row as any);
    }
    return map;
  }, [deliveryLog]);

  useEffect(() => {
    const ch = supabase
      .channel("admin-quotes")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () =>
        qc.invalidateQueries({ queryKey: ["quotes"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "email_send_log" }, () =>
        qc.invalidateQueries({ queryKey: ["quote-delivery-log"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  function copyLink(token: string) {
    const url = `${window.location.origin}/quote/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Quote link copied");
  }

  const list = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Quotes</h1>
        <p className="text-muted-foreground text-sm">All quotes sent to customers</p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
          <FileText className="h-8 w-8 opacity-50" />
          <div>No quotes yet. Create one from a Request.</div>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {list.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {q.customer_name} · {q.shoe_brand} {q.shoe_model}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {q.service_recommended || "—"} · ${Number(q.quote_amount).toFixed(2)} ·{" "}
                    Created {new Date(q.created_at).toLocaleDateString()}
                    {q.expires_at ? ` · Expires ${new Date(q.expires_at).toLocaleDateString()}` : ""}
                    {q.view_count > 0 ? ` · ${q.view_count} view${q.view_count === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DeliveryBadge entry={deliveryByEmail.get((q.customer_email ?? "").toLowerCase())} quoteStatus={q.status} />
                  <Badge variant="outline" className={STATUS_CLS[q.status]}>{q.status}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyLink(q.public_token)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/quote/${q.public_token}`} target="_blank">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryBadge({
  entry,
  quoteStatus,
}: {
  entry?: { status: string; error_message: string | null };
  quoteStatus: string;
}) {
  if (!entry) {
    if (quoteStatus === "draft") return null;
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
        <Mail className="h-3 w-3" /> No email
      </Badge>
    );
  }
  const s = entry.status;
  if (s === "sent")
    return (
      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
        <MailCheck className="h-3 w-3" /> Delivered
      </Badge>
    );
  if (s === "pending")
    return (
      <Badge variant="outline" className="bg-sky-500/15 text-sky-600 border-sky-500/30 gap-1">
        <Mail className="h-3 w-3" /> Sending
      </Badge>
    );
  if (s === "suppressed")
    return (
      <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1" title={entry.error_message ?? undefined}>
        <MailWarning className="h-3 w-3" /> Suppressed
      </Badge>
    );
  return (
    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/30 gap-1" title={entry.error_message ?? undefined}>
      <MailX className="h-3 w-3" /> {s === "dlq" ? "Failed" : s}
    </Badge>
  );
}