import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function PromoCodes() {
  const qc = useQueryClient();

  const { data: codes } = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function del(id: string) {
    if (!confirm("Delete this promo code?")) return;
    const { error } = await supabase.from("shop_promo_codes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-promo-codes"] });
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-wide">Promo Codes</h1>
        <Button asChild>
          <Link to="/admin/promo-codes/new"><Plus className="w-4 h-4 mr-1" /> New Code</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Create discount codes for the shop checkout. Codes apply at the cart drawer and discount the Stripe total.
      </p>

      <div className="grid gap-3">
        {(codes ?? []).length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No promo codes yet.</CardContent></Card>
        )}
        {(codes ?? []).map((c: any) => {
          const expired = c.expires_at && new Date(c.expires_at) <= new Date();
          const exhausted = c.max_redemptions !== null && c.redemption_count >= c.max_redemptions;
          return (
            <Card key={c.id}>
              <CardContent className="p-3 md:p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-mono font-semibold">{c.code}</h3>
                    {!c.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    {expired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                    {exhausted && <Badge variant="destructive" className="text-[10px]">Used up</Badge>}
                    {c.applies_to !== "all" && <Badge variant="outline" className="text-[10px]">{c.applies_to} only</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.discount_type === "percent" ? `${c.amount}% off` : `$${(c.amount / 100).toFixed(2)} off`}
                    {c.min_subtotal_cents > 0 && ` · min $${(c.min_subtotal_cents / 100).toFixed(2)}`}
                    {" · "}
                    {c.redemption_count}{c.max_redemptions !== null ? `/${c.max_redemptions}` : ""} redeemed
                    {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/promo-codes/${c.id}`}><Pencil className="w-3.5 h-3.5" /></Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => del(c.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}