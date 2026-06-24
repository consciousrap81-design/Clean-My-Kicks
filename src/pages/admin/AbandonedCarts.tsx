import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ShoppingCart, Mail, MailCheck, Clock, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Cart = {
  id: string;
  product_id: string;
  stripe_session_id: string;
  customer_email: string | null;
  customer_name: string | null;
  status: "pending" | "recovered" | "expired" | "sold_to_other";
  first_email_sent_at: string | null;
  second_email_sent_at: string | null;
  recovered_at: string | null;
  recovery_token: string;
  created_at: string;
  product?: {
    id: string;
    name: string | null;
    brand: string | null;
    model: string | null;
    price: number;
  } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  recovered: "bg-emerald-100 text-emerald-700",
  expired: "bg-slate-200 text-slate-700",
  sold_to_other: "bg-rose-100 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  recovered: "Recovered",
  expired: "Expired",
  sold_to_other: "Sold to other",
};

export default function AbandonedCarts() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rangeDays, setRangeDays] = useState<string>("30");
  const [query, setQuery] = useState("");

  const { data: carts = [], isLoading, refetch } = useQuery({
    queryKey: ["abandoned-carts", rangeDays],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - Number(rangeDays || "30"));
      const { data, error } = await supabase
        .from("shop_abandoned_carts")
        .select(`
          id, product_id, stripe_session_id, customer_email, customer_name,
          status, first_email_sent_at, second_email_sent_at, recovered_at,
          recovery_token, created_at,
          product:shop_products ( id, name, brand, model, price )
        `)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as unknown as Cart[]) || [];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return carts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      const productName = [c.product?.brand, c.product?.model, c.product?.name].filter(Boolean).join(" ").toLowerCase();
      return (
        (c.customer_email || "").toLowerCase().includes(q) ||
        (c.customer_name || "").toLowerCase().includes(q) ||
        productName.includes(q) ||
        c.stripe_session_id.toLowerCase().includes(q)
      );
    });
  }, [carts, statusFilter, query]);

  const metrics = useMemo(() => {
    const total = carts.length;
    const recovered = carts.filter((c) => c.status === "recovered").length;
    const pending = carts.filter((c) => c.status === "pending").length;
    const expired = carts.filter((c) => c.status === "expired").length;
    const soldToOther = carts.filter((c) => c.status === "sold_to_other").length;
    const emailed = carts.filter((c) => c.first_email_sent_at).length;
    const recoveredAfterEmail = carts.filter((c) => c.status === "recovered" && c.first_email_sent_at).length;
    const recoveryRate = total > 0 ? (recovered / total) * 100 : 0;
    const emailRecoveryRate = emailed > 0 ? (recoveredAfterEmail / emailed) * 100 : 0;
    const recoveredValue = carts
      .filter((c) => c.status === "recovered")
      .reduce((sum, c) => sum + Number(c.product?.price || 0), 0);
    const lostValue = carts
      .filter((c) => c.status === "expired" || c.status === "sold_to_other")
      .reduce((sum, c) => sum + Number(c.product?.price || 0), 0);
    return {
      total, recovered, pending, expired, soldToOther, emailed,
      recoveryRate, emailRecoveryRate, recoveredValue, lostValue,
    };
  }, [carts]);

  function copyLink(token: string) {
    const url = `${window.location.origin}/recover-cart?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Recovery link copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" /> Abandoned Carts
          </h1>
          <p className="text-sm text-muted-foreground">
            Shoppers who started checkout but didn&rsquo;t finish, and how many we recovered.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Metric label="Abandoned" value={metrics.total} icon={ShoppingCart} />
        <Metric
          label="Recovery rate"
          value={`${metrics.recoveryRate.toFixed(1)}%`}
          sub={`${metrics.recovered} of ${metrics.total}`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <Metric
          label="Recovered $"
          value={`$${metrics.recoveredValue.toFixed(0)}`}
          sub={`Lost: $${metrics.lostValue.toFixed(0)}`}
          icon={MailCheck}
          tone="emerald"
        />
        <Metric
          label="Email recovery"
          value={`${metrics.emailRecoveryRate.toFixed(1)}%`}
          sub={`${metrics.emailed} emailed`}
          icon={Mail}
          tone="amber"
        />
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 text-sm">
        <StatusPill label="Pending" count={metrics.pending} status="pending" />
        <StatusPill label="Recovered" count={metrics.recovered} status="recovered" />
        <StatusPill label="Expired" count={metrics.expired} status="expired" />
        <StatusPill label="Sold to other" count={metrics.soldToOther} status="sold_to_other" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="recovered">Recovered</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="sold_to_other">Sold to other</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search email, name, product, session…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {carts.length}
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              No abandoned carts match your filters.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((c) => {
                const productName =
                  [c.product?.brand, c.product?.model, c.product?.name].filter(Boolean).join(" ") ||
                  "Unknown product";
                return (
                  <div key={c.id} className="p-4 grid gap-2 md:grid-cols-[1.4fr_1.4fr_1fr_auto] md:items-center">
                    <div>
                      <div className="font-medium">{productName}</div>
                      <div className="text-xs text-muted-foreground">
                        ${Number(c.product?.price || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="truncate">{c.customer_email || <span className="text-muted-foreground italic">Email not captured</span>}</div>
                      {c.customer_name && (
                        <div className="text-xs text-muted-foreground truncate">{c.customer_name}</div>
                      )}
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span title={format(new Date(c.created_at), "PPp")}>
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <EmailDot label="1st" sent={c.first_email_sent_at} />
                      <EmailDot label="2nd" sent={c.second_email_sent_at} />
                      {c.recovered_at && (
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Recovered {formatDistanceToNow(new Date(c.recovered_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Badge variant="secondary" className={STATUS_STYLES[c.status]}>
                        {STATUS_LABEL[c.status] || c.status}
                      </Badge>
                      {c.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(c.recovery_token)}
                          title="Copy recovery link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {c.product?.id && (
                        <Button asChild variant="ghost" size="sm" title="Open product">
                          <a href={`/admin/products/${c.product.id}`}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  label, value, sub, icon: Icon, tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "emerald" | "amber";
}) {
  const toneCls =
    tone === "emerald" ? "text-emerald-700 bg-emerald-50" :
    tone === "amber" ? "text-amber-700 bg-amber-50" :
    "text-foreground bg-muted";
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-md ${toneCls}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ label, count, status }: { label: string; count: number; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="secondary" className={STATUS_STYLES[status]}>{count}</Badge>
    </div>
  );
}

function EmailDot({ label, sent }: { label: string; sent: string | null }) {
  if (sent) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-700">
        <MailCheck className="w-3 h-3" />
        {label} email sent {formatDistanceToNow(new Date(sent), { addSuffix: true })}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <XCircle className="w-3 h-3" />
      {label} email not sent
    </div>
  );
}