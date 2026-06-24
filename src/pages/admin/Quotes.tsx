import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Copy } from "lucide-react";
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

  useEffect(() => {
    const ch = supabase
      .channel("admin-quotes")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () =>
        qc.invalidateQueries({ queryKey: ["quotes"] }),
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