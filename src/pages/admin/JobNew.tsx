import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SuggestedProtocol } from "@/components/admin/SuggestedProtocol";

const MATERIALS = ["Suede", "Leather", "Mesh", "Canvas", "Knit", "Patent", "Nubuck"];

export default function JobNew() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    shoe_brand: "", shoe_model: "", condition_notes: "",
    service_id: "", lead_source_id: "",
    quoted_price: "", intake_date: new Date().toISOString().slice(0, 10),
    due_date: "", admin_notes: "",
    shoe_material: "", cleaning_guide_id: "",
  });

  const { data: services } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => (await supabase.from("services").select("id,name,base_price").eq("active", true)).data || [],
  });
  const { data: sources } = useQuery({
    queryKey: ["sources-active"],
    queryFn: async () => (await supabase.from("lead_sources").select("id,name").eq("active", true)).data || [],
  });

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast.error("Customer name required");
    setSaving(true);

    const { data: customer, error: cErr } = await supabase
      .from("customers")
      .insert({ name: form.name, phone: form.phone || null, email: form.email || null, lead_source_id: form.lead_source_id || null })
      .select()
      .single();
    if (cErr) { setSaving(false); return toast.error(cErr.message); }

    const { data: job, error: jErr } = await supabase.from("jobs").insert({
      customer_id: customer.id,
      service_id: form.service_id || null,
      shoe_brand: form.shoe_brand || null,
      shoe_model: form.shoe_model || null,
      condition_notes: form.condition_notes || null,
      quoted_price: Number(form.quoted_price || 0),
      intake_date: form.intake_date || null,
      due_date: form.due_date || null,
      admin_notes: form.admin_notes || null,
      lead_source_id: form.lead_source_id || null,
      shoe_material: form.shoe_material || null,
      cleaning_guide_id: form.cleaning_guide_id || null,
    }).select().single();

    setSaving(false);
    if (jErr) return toast.error(jErr.message);
    toast.success("Job created");
    navigate(`/admin/jobs/${job.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-3xl font-display tracking-wide">New Job</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Shoe & Service</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div><Label>Brand</Label><Input value={form.shoe_brand} onChange={(e) => set("shoe_brand", e.target.value)} /></div>
            <div><Label>Model</Label><Input value={form.shoe_model} onChange={(e) => set("shoe_model", e.target.value)} /></div>
            <div>
              <Label>Service</Label>
              <Select value={form.service_id} onValueChange={(v) => {
                set("service_id", v);
                const svc = services?.find((s: any) => s.id === v);
                if (svc && !form.quoted_price) set("quoted_price", String(svc.base_price));
              }}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>
                  {services?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} — ${s.base_price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lead Source</Label>
              <Select value={form.lead_source_id} onValueChange={(v) => set("lead_source_id", v)}>
                <SelectTrigger><SelectValue placeholder="How did they find us?" /></SelectTrigger>
                <SelectContent>
                  {sources?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Condition Notes</Label><Textarea value={form.condition_notes} onChange={(e) => set("condition_notes", e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Dates</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div><Label>Quoted Price</Label><Input type="number" step="0.01" value={form.quoted_price} onChange={(e) => set("quoted_price", e.target.value)} /></div>
            <div><Label>Intake Date</Label><Input type="date" value={form.intake_date} onChange={(e) => set("intake_date", e.target.value)} /></div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
            <div className="md:col-span-3"><Label>Admin Notes</Label><Textarea value={form.admin_notes} onChange={(e) => set("admin_notes", e.target.value)} /></div>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/jobs")}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Job</Button>
        </div>
      </form>
    </div>
  );
}