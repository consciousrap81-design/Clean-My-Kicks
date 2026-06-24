import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Package } from "lucide-react";

const PAY_CLS: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  partial: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  unpaid: "bg-muted text-muted-foreground",
  refunded: "bg-muted text-muted-foreground",
};

export default function AccountDashboard() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["customer-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, shoe_brand, shoe_model, status, payment_status, quoted_price, intake_date, created_at, services:service_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: quotes } = useQuery({
    queryKey: ["customer-quotes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, public_token, shoe_brand, shoe_model, service_recommended, quote_amount, status, payment_status, created_at")
        .in("status", ["sent", "viewed", "accepted"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display tracking-wide">My Clean My Kicks Orders</h1>
        <p className="text-sm text-muted-foreground">Track your sneaker restorations from intake to pickup.</p>
      </header>

      {quotes && quotes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Open Quotes</h2>
          <div className="grid gap-2">
            {quotes.map((q) => (
              <Link key={q.id} to={`/quote/${q.public_token}`} className="block">
                <Card className="hover:bg-accent/5 transition">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {[q.shoe_brand, q.shoe_model].filter(Boolean).join(" ") || "Quote"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {q.service_recommended || "—"} · ${Number(q.quote_amount).toFixed(2)}
                      </div>
                    </div>
                    <Badge variant="outline">{q.status}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Orders</h2>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (jobs ?? []).length === 0 ? (
          <Card><CardContent className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Package className="h-8 w-8 opacity-50" />
            <div>No orders yet. Once you accept a quote and pay, it'll show up here.</div>
          </CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {(jobs ?? []).map((j: any) => (
              <Link key={j.id} to={`/account/orders/${j.id}`} className="block">
                <Card className="hover:bg-accent/5 transition">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {[j.shoe_brand, j.shoe_model].filter(Boolean).join(" ") || "Sneaker Service"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {j.services?.name || "Service"} · ${Number(j.quoted_price).toFixed(2)}
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant="outline">{j.status.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline" className={PAY_CLS[j.payment_status] ?? ""}>
                          {j.payment_status}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}