import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PromoCodeEdit() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    amount: 10,
    min_subtotal_cents: 0,
    max_redemptions: "" as string,
    expires_at: "",
    active: true,
    applies_to: "all" as "all" | "accessories" | "sneakers",
  });

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    supabase.from("shop_promo_codes").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          code: data.code,
          discount_type: data.discount_type as "percent" | "fixed",
          amount: data.amount,
          min_subtotal_cents: data.min_subtotal_cents,
          max_redemptions: data.max_redemptions !== null ? String(data.max_redemptions) : "",
          expires_at: data.expires_at ? data.expires_at.slice(0, 16) : "",
          active: data.active,
          applies_to: data.applies_to as "all" | "accessories" | "sneakers",
        });
      }
      setLoading(false);
    });
  }, [id, isNew]);

  async function save() {
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return toast.error("Code must be 2–40 chars (letters, digits, _ or -)");
    if (form.amount <= 0) return toast.error("Amount must be > 0");
    if (form.discount_type === "percent" && form.amount > 100) return toast.error("Percent ≤ 100");
    setSaving(true);
    const payload = {
      code,
      discount_type: form.discount_type,
      amount: form.amount,
      min_subtotal_cents: form.min_subtotal_cents || 0,
      max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      active: form.active,
      applies_to: form.applies_to,
    };
    const { error } = isNew
      ? await supabase.from("shop_promo_codes").insert(payload)
      : await supabase.from("shop_promo_codes").update(payload).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    nav("/admin/promo-codes");
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-display tracking-wide">{isNew ? "New Promo Code" : "Edit Promo Code"}</h1>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>Code</Label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SUMMER10"
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Discount type</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="fixed">Fixed amount off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.discount_type === "percent" ? "Percent" : "Cents off"}</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
              />
              {form.discount_type === "fixed" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  ${(form.amount / 100).toFixed(2)} off
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Applies to</Label>
            <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Whole cart</SelectItem>
                <SelectItem value="accessories">Accessories only</SelectItem>
                <SelectItem value="sneakers">Sneakers only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min subtotal (cents)</Label>
              <Input
                type="number"
                value={form.min_subtotal_cents}
                onChange={(e) => setForm({ ...form, min_subtotal_cents: Number(e.target.value) || 0 })}
              />
              {form.min_subtotal_cents > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  ${(form.min_subtotal_cents / 100).toFixed(2)} minimum
                </p>
              )}
            </div>
            <div>
              <Label>Max redemptions</Label>
              <Input
                type="number"
                value={form.max_redemptions}
                onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div>
            <Label>Expires at</Label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="cursor-pointer">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive codes won't apply at checkout.</p>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => nav("/admin/promo-codes")}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}