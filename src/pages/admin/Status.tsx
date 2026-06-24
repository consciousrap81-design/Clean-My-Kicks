import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, Circle, CreditCard, Truck, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Health = "healthy" | "stale" | "unknown";

interface Snapshot {
  shippoLastEventAt: string | null;
  shippoEvents24h: number;
  shippoEvents7d: number;
  stripeLastPaidAt: string | null;
  stripePayments24h: number;
  stripePayments7d: number;
  emailsSent24h: number;
  emailsFailed24h: number;
  loadedAt: string;
}

function classify(lastAt: string | null): Health {
  if (!lastAt) return "unknown";
  const ageMs = Date.now() - new Date(lastAt).getTime();
  const day = 1000 * 60 * 60 * 24;
  if (ageMs <= 7 * day) return "healthy";
  return "stale";
}

function StatusBadge({ health }: { health: Health }) {
  if (health === "healthy") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Healthy
      </Badge>
    );
  }
  if (health === "stale") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
        <AlertTriangle className="w-3 h-3 mr-1" /> Stale
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <Circle className="w-3 h-3 mr-1" /> No data yet
    </Badge>
  );
}

function fmtAge(iso: string | null) {
  if (!iso) return "Never";
  try {
    return `${formatDistanceToNow(new Date(iso))} ago`;
  } catch {
    return "—";
  }
}

export default function AdminStatus() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [shippoLatest, shippo24, shippo7, stripeLatest, stripe24, stripe7, emails24, emailsFail24] = await Promise.all([
      supabase.from("shipment_events").select("occurred_at").order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("shipment_events").select("id", { count: "exact", head: true }).gte("occurred_at", since24),
      supabase.from("shipment_events").select("id", { count: "exact", head: true }).gte("occurred_at", since7),
      supabase.from("payments").select("paid_at").not("stripe_payment_intent", "is", null).order("paid_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("payments").select("id", { count: "exact", head: true }).not("stripe_payment_intent", "is", null).gte("paid_at", since24),
      supabase.from("payments").select("id", { count: "exact", head: true }).not("stripe_payment_intent", "is", null).gte("paid_at", since7),
      supabase.from("email_send_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since24),
      supabase.from("email_send_log").select("id", { count: "exact", head: true }).in("status", ["failed", "dlq"]).gte("created_at", since24),
    ]);

    setSnap({
      shippoLastEventAt: (shippoLatest.data as any)?.occurred_at ?? null,
      shippoEvents24h: shippo24.count ?? 0,
      shippoEvents7d: shippo7.count ?? 0,
      stripeLastPaidAt: (stripeLatest.data as any)?.paid_at ?? null,
      stripePayments24h: stripe24.count ?? 0,
      stripePayments7d: stripe7.count ?? 0,
      emailsSent24h: emails24.count ?? 0,
      emailsFailed24h: emailsFail24.count ?? 0,
      loadedAt: new Date().toISOString(),
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> System Status
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quick health check for Stripe and Shippo webhooks plus outbound email.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" /> Shippo Webhook
              </CardTitle>
              <StatusBadge health={classify(snap?.shippoLastEventAt ?? null)} />
            </div>
            <CardDescription>Receives tracking updates from carriers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Last event" value={fmtAge(snap?.shippoLastEventAt ?? null)} />
            <Row label="Events (24h)" value={snap?.shippoEvents24h ?? "—"} />
            <Row label="Events (7d)" value={snap?.shippoEvents7d ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Stripe Webhook
              </CardTitle>
              <StatusBadge health={classify(snap?.stripeLastPaidAt ?? null)} />
            </div>
            <CardDescription>Records completed checkout sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Last paid" value={fmtAge(snap?.stripeLastPaidAt ?? null)} />
            <Row label="Payments (24h)" value={snap?.stripePayments24h ?? "—"} />
            <Row label="Payments (7d)" value={snap?.stripePayments7d ?? "—"} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" /> Outbound Email (24h)
              </CardTitle>
              <StatusBadge
                health={
                  snap == null
                    ? "unknown"
                    : snap.emailsFailed24h > 0
                    ? "stale"
                    : snap.emailsSent24h > 0
                    ? "healthy"
                    : "unknown"
                }
              />
            </div>
            <CardDescription>Sent vs. failed in the last 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Sent" value={snap?.emailsSent24h ?? "—"} />
            <Row label="Failed / DLQ" value={snap?.emailsFailed24h ?? "—"} />
          </CardContent>
        </Card>
      </div>

      {snap && (
        <p className="text-xs text-muted-foreground text-center">
          Loaded {fmtAge(snap.loadedAt)}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}