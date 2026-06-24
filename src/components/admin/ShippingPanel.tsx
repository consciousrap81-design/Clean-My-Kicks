import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Truck } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  label_created: "Label Created",
  in_transit: "In Transit",
  delivered: "Delivered",
  returned: "Returned",
  failed: "Failed",
};

export function ShippingPanel({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"inbound" | "outbound" | null>(null);

  const { data: request } = useQuery({
    queryKey: ["job-request", jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_requests")
        .select("id, fulfillment_method, ship_from_address")
        .eq("converted_job_id", jobId)
        .maybeSingle();
      return data;
    },
  });

  const { data: shipments = [], refetch } = useQuery({
    queryKey: ["shipments", request?.id],
    queryFn: async () => {
      if (!request?.id) return [];
      const { data } = await supabase
        .from("shipments")
        .select("*")
        .eq("request_id", request.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!request?.id,
  });

  if (!request) return null;
  if (request.fulfillment_method !== "mail_in") return null;

  const inbound = shipments.find((s: any) => s.direction === "inbound");
  const outbound = shipments.find((s: any) => s.direction === "outbound");

  async function buy(direction: "inbound" | "outbound") {
    setBusy(direction);
    try {
      const { data, error } = await supabase.functions.invoke("shippo-purchase-label", {
        body: { request_id: request!.id, direction },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`${direction === "inbound" ? "Inbound" : "Return"} label purchased`);
      await refetch();
      qc.invalidateQueries({ queryKey: ["job", jobId] });
    } catch (e: any) {
      toast.error(e?.message || "Failed to purchase label");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" /> Shipping (Mail-In, USPS Priority)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(["inbound", "outbound"] as const).map((dir) => {
          const s = dir === "inbound" ? inbound : outbound;
          return (
            <div key={dir} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {dir === "inbound" ? "Inbound (customer → shop)" : "Return (shop → customer)"}
                </div>
                {s ? (
                  <Badge variant="outline">{STATUS_LABEL[s.status] || s.status}</Badge>
                ) : (
                  <Button size="sm" disabled={busy === dir} onClick={() => buy(dir)}>
                    {busy === dir ? <Loader2 className="h-3 w-3 animate-spin" /> : `Generate ${dir === "inbound" ? "inbound" : "return"} label`}
                  </Button>
                )}
              </div>
              {s && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                  <span>Tracking: <span className="font-mono">{s.tracking_number}</span></span>
                  {s.label_url && (
                    <a className="inline-flex items-center gap-1 text-primary" href={s.label_url} target="_blank" rel="noreferrer">
                      Label PDF <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {s.tracking_url && (
                    <a className="inline-flex items-center gap-1 text-primary" href={s.tracking_url} target="_blank" rel="noreferrer">
                      Track <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {s.rate_cents != null && <span>${(s.rate_cents / 100).toFixed(2)}</span>}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}