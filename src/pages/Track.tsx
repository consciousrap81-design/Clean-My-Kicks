import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, PackageSearch, Sparkles, ExternalLink, Truck, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Seo from "@/components/Seo";

type Shipment = {
  id: string;
  direction: "inbound" | "outbound";
  carrier: string | null;
  service: string | null;
  tracking_number: string;
  tracking_url: string | null;
  status: string;
  status_label: string;
  tracking_status_detail: string | null;
  eta: string | null;
  last_event_at: string | null;
  notifications_enabled: boolean;
};
type Event = {
  id: string;
  occurred_at: string;
  status: string | null;
  status_detail: string | null;
  location: string | null;
};

const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-shipment`;
const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Mode = "tracking" | "order";

export default function Track() {
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("o") ? "order" : "tracking");
  const [tracking, setTracking] = useState(params.get("n") || "");
  const [order, setOrder] = useState(params.get("o") || "");
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [unsubBanner, setUnsubBanner] = useState(false);

  async function call(body: Record<string, unknown>): Promise<{ shipment: Shipment; events: Event[] }> {
    const res = await fetch(fnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Lookup failed");
    return json;
  }

  async function lookup(opts: { n?: string; o?: string }) {
    if (!opts.n && !opts.o) return;
    setLoading(true); setErr(null); setShipment(null); setEvents([]);
    try {
      const json = await call({ n: opts.n, o: opts.o, action: "view" });
      setShipment(json.shipment); setEvents(json.events || []);
      setParams(opts.n ? { n: opts.n } : { o: opts.o! }, { replace: true });
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  // initial load: signed unsubscribe, or tracking, or order
  useEffect(() => {
    const u = params.get("u");
    if (u) {
      (async () => {
        setLoading(true); setErr(null);
        try {
          const json = await call({ u, action: "unsubscribe_signed" });
          setShipment(json.shipment); setEvents(json.events || []);
          setTracking(json.shipment.tracking_number);
          setUnsubBanner(true);
          setParams({ n: json.shipment.tracking_number }, { replace: true });
        } catch (e: any) { setErr(e.message); }
        finally { setLoading(false); }
      })();
      return;
    }
    const n = params.get("n"); const o = params.get("o");
    if (n) lookup({ n }); else if (o) lookup({ o });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleNotifications(next: boolean) {
    if (!shipment) return;
    setToggling(true);
    try {
      const json = await call({ n: shipment.tracking_number, action: "toggle", notifications_enabled: next });
      setShipment({ ...shipment, notifications_enabled: json.shipment.notifications_enabled });
      toast.success(next ? "Email updates turned on" : "Email updates turned off");
    } catch (e: any) { toast.error(e.message); }
    finally { setToggling(false); }
  }

  function downloadPdf() {
    if (!shipment) return;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 56;
    let y = M;

    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.setTextColor(255, 102, 0);
    doc.text("CLEAN MY KICKS", M, y); y += 22;
    doc.setTextColor(11, 18, 32);
    doc.setFontSize(20);
    doc.text("Shipment tracking details", M, y); y += 26;

    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated ${new Date().toLocaleString("en-US")}`, M, y); y += 24;

    doc.setDrawColor(226, 232, 240); doc.line(M, y, W - M, y); y += 20;

    const rows: [string, string][] = [
      ["Status", shipment.status_label],
      ["Direction", shipment.direction === "inbound" ? "To Clean My Kicks" : "Return to customer"],
      ["Carrier", `${shipment.carrier || "USPS"} ${shipment.service || ""}`.trim()],
      ["Tracking number", shipment.tracking_number],
      ["Estimated delivery", shipment.eta ? new Date(shipment.eta).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—"],
      ["Last update", shipment.last_event_at ? new Date(shipment.last_event_at).toLocaleString("en-US") : "—"],
      ...(shipment.tracking_status_detail ? [["Latest detail", shipment.tracking_status_detail] as [string, string]] : []),
    ];
    doc.setFontSize(11);
    rows.forEach(([k, v]) => {
      doc.setFont("helvetica", "bold"); doc.setTextColor(11, 18, 32);
      doc.text(k, M, y);
      doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
      const wrapped = doc.splitTextToSize(String(v), W - M - 180);
      doc.text(wrapped, M + 160, y);
      y += 18 + (wrapped.length - 1) * 14;
      if (y > H - 80) { doc.addPage(); y = M; }
    });

    y += 14;
    doc.setDrawColor(226, 232, 240); doc.line(M, y, W - M, y); y += 22;

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(11, 18, 32);
    doc.text("Timeline", M, y); y += 18;
    doc.setFontSize(10);
    if (events.length === 0) {
      doc.setFont("helvetica", "italic"); doc.setTextColor(148, 163, 184);
      doc.text("No events recorded yet.", M, y);
    } else {
      events.forEach((e) => {
        if (y > H - 90) { doc.addPage(); y = M; }
        doc.setFont("helvetica", "bold"); doc.setTextColor(11, 18, 32);
        doc.text(e.status || "Update", M, y);
        doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
        doc.text(new Date(e.occurred_at).toLocaleString("en-US"), M + 220, y);
        y += 14;
        if (e.status_detail) {
          const wrap = doc.splitTextToSize(e.status_detail, W - M * 2);
          doc.setTextColor(51, 65, 85); doc.text(wrap, M, y);
          y += wrap.length * 13;
        }
        if (e.location) {
          doc.setTextColor(148, 163, 184); doc.text(e.location, M, y); y += 13;
        }
        y += 6;
      });
    }

    doc.save(`tracking-${shipment.tracking_number}.pdf`);
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Track Your Order | Clean My Kicks"
        description="Track your Clean My Kicks shipment by order or tracking number. View status, ETA, and full delivery history."
        path="/track"
      />
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display tracking-wide text-lg">Clean My Kicks</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Track your shipment</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {unsubBanner && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Email updates turned off for this shipment.</div>
                <div className="text-muted-foreground">You can turn them back on anytime using the toggle below.</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="mb-4">
                <TabsTrigger value="tracking">Tracking number</TabsTrigger>
                <TabsTrigger value="order">Order number</TabsTrigger>
              </TabsList>
              <TabsContent value="tracking">
                <form
                  className="flex flex-col sm:flex-row gap-3"
                  onSubmit={(e) => { e.preventDefault(); lookup({ n: tracking.trim() }); }}
                >
                  <div className="flex-1">
                    <Label htmlFor="t" className="text-xs uppercase tracking-wider text-muted-foreground">Tracking number</Label>
                    <Input id="t" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. 9400 1118 9922 3197 4284 90" className="mt-1" />
                  </div>
                  <Button type="submit" disabled={loading} size="lg" className="sm:self-end">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageSearch className="h-4 w-4 mr-2" />Track</>}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="order">
                <form
                  className="flex flex-col sm:flex-row gap-3"
                  onSubmit={(e) => { e.preventDefault(); lookup({ o: order.trim() }); }}
                >
                  <div className="flex-1">
                    <Label htmlFor="o" className="text-xs uppercase tracking-wider text-muted-foreground">Order number</Label>
                    <Input id="o" value={order} onChange={(e) => setOrder(e.target.value)} placeholder="From your quote / confirmation email" className="mt-1" />
                  </div>
                  <Button type="submit" disabled={loading} size="lg" className="sm:self-end">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageSearch className="h-4 w-4 mr-2" />Find</>}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            {err && <p className="text-sm text-destructive mt-3">{err}</p>}
          </CardContent>
        </Card>

        {shipment && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      {shipment.direction === "inbound" ? "To Clean My Kicks" : "Back to you"}
                    </span>
                  </div>
                  <div className="mt-1 text-2xl font-semibold">{shipment.status_label}</div>
                  {shipment.tracking_status_detail && (
                    <div className="text-sm text-muted-foreground mt-1">{shipment.tracking_status_detail}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="font-mono">{shipment.tracking_number}</Badge>
                  <Button variant="outline" size="sm" onClick={downloadPdf}>
                    <Download className="h-3 w-3 mr-2" /> Download tracking details
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <Field label="Carrier" value={`${shipment.carrier || "USPS"} ${shipment.service || ""}`.trim()} />
                <Field label="Estimated delivery" value={shipment.eta ? new Date(shipment.eta).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
                <Field label="Last update" value={shipment.last_event_at ? new Date(shipment.last_event_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"} />
              </div>

              {shipment.tracking_url && (
                <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary">
                  Carrier tracking page <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <div className="text-sm font-medium">Email me when this shipment updates</div>
                  <div className="text-xs text-muted-foreground">Sent on status changes and delivery-date updates.</div>
                </div>
                <Switch checked={shipment.notifications_enabled} disabled={toggling} onCheckedChange={toggleNotifications} />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Timeline</div>
                {events.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No events yet. Check back soon.</div>
                ) : (
                  <ol className="space-y-3 border-l pl-4">
                    {events.map((e) => (
                      <li key={e.id}>
                        <div className="text-sm font-medium">
                          {e.status || "Update"}
                          <span className="text-muted-foreground font-normal text-xs ml-2">
                            {new Date(e.occurred_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        {e.status_detail && <div className="text-sm text-muted-foreground">{e.status_detail}</div>}
                        {e.location && <div className="text-xs text-muted-foreground">{e.location}</div>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}
