import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, PackageSearch, Sparkles, ExternalLink, Truck } from "lucide-react";
import { toast } from "sonner";

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

export default function Track() {
  const [params, setParams] = useSearchParams();
  const [value, setValue] = useState(params.get("n") || "");
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [togglingOn, setTogglingOn] = useState(false);

  async function lookup(tracking: string) {
    if (!tracking.trim()) return;
    setLoading(true); setErr(null); setShipment(null); setEvents([]);
    try {
      const res = await fetch(`${fnUrl}?n=${encodeURIComponent(tracking.trim())}`, { headers: { apikey } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lookup failed");
      setShipment(json.shipment); setEvents(json.events || []);
      setParams({ n: tracking.trim() }, { replace: true });
    } catch (e: any) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const n = params.get("n");
    if (n) lookup(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleNotifications(next: boolean) {
    if (!shipment) return;
    setTogglingOn(true);
    try {
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey },
        body: JSON.stringify({ n: shipment.tracking_number, action: "toggle", notifications_enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setShipment({ ...shipment, notifications_enabled: json.shipment.notifications_enabled });
      toast.success(next ? "Email updates turned on" : "Email updates turned off");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setTogglingOn(false); }
  }

  return (
    <div className="min-h-screen bg-background">
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
        <Card>
          <CardContent className="p-6">
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => { e.preventDefault(); lookup(value); }}
            >
              <div className="flex-1">
                <Label htmlFor="t" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Tracking number
                </Label>
                <Input
                  id="t" value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 9400 1118 9922 3197 4284 90"
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={loading} size="lg" className="sm:self-end">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageSearch className="h-4 w-4 mr-2" />Track</>}
              </Button>
            </form>
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
                <Badge variant="outline" className="font-mono">{shipment.tracking_number}</Badge>
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
                <Switch
                  checked={shipment.notifications_enabled}
                  disabled={togglingOn}
                  onCheckedChange={toggleNotifications}
                />
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
