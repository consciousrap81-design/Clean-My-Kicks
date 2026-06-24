import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "@/components/admin/StatusBadge";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [paymentAmt, setPaymentAmt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [updateBody, setUpdateBody] = useState("");
  const [updateVisible, setUpdateVisible] = useState(true);

  const { data: services } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => (await supabase.from("services").select("id,name,base_price").eq("active", true)).data || [],
  });
  const { data: sources } = useQuery({
    queryKey: ["sources-active"],
    queryFn: async () => (await supabase.from("lead_sources").select("id,name").eq("active", true)).data || [],
  });

  const { data: job, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, customer:customers(*), payments(*), job_photos(*), job_updates(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => { if (job) setForm(job); }, [job]);

  useEffect(() => {
    (async () => {
      if (!job?.job_photos) return;
      const urls: Record<string, string> = {};
      for (const p of job.job_photos as any[]) {
        const { data } = await supabase.storage.from("job-photos").createSignedUrl(p.url, 3600);
        if (data) urls[p.id] = data.signedUrl;
      }
      setPhotoUrls(urls);
    })();
  }, [job?.job_photos]);

  if (!form) return <div className="text-muted-foreground">Loading…</div>;

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true);
    const payload = {
      service_id: form.service_id, shoe_brand: form.shoe_brand, shoe_model: form.shoe_model,
      condition_notes: form.condition_notes, quoted_price: Number(form.quoted_price || 0),
      payment_status: form.payment_status, status: form.status,
      intake_date: form.intake_date || null, due_date: form.due_date || null,
      completion_date: form.completion_date || null, admin_notes: form.admin_notes,
      lead_source_id: form.lead_source_id,
    };
    const { error } = await supabase.from("jobs").update(payload).eq("id", id!);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Job updated");
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: ["admin-metrics"] });
    refetch();
  }

  async function addPayment() {
    if (!paymentAmt) return;
    const { error } = await supabase.from("payments").insert({
      job_id: id!, amount: Number(paymentAmt), method: paymentMethod || null,
    });
    if (error) return toast.error(error.message);
    setPaymentAmt(""); setPaymentMethod("");
    toast.success("Payment recorded");
    refetch();
    qc.invalidateQueries({ queryKey: ["admin-metrics"] });
  }

  async function deletePayment(pid: string) {
    const { error } = await supabase.from("payments").delete().eq("id", pid);
    if (error) return toast.error(error.message);
    refetch();
    qc.invalidateQueries({ queryKey: ["admin-metrics"] });
  }

  async function uploadPhoto(file: File, kind: "before" | "after") {
    const path = `${id}/${kind}/${crypto.randomUUID()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("job-photos").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase.from("job_photos").insert({ job_id: id!, url: path, kind });
    if (error) return toast.error(error.message);
    toast.success(`${kind} photo uploaded`);
    refetch();
  }

  async function togglePhotoVisibility(p: any) {
    const { error } = await supabase
      .from("job_photos")
      .update({ customer_visible: !p.customer_visible })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    refetch();
  }

  async function postUpdate() {
    if (!updateBody.trim()) return;
    const { error } = await supabase.from("job_updates").insert({
      job_id: id!,
      body: updateBody.trim(),
      customer_visible: updateVisible,
    });
    if (error) return toast.error(error.message);
    setUpdateBody("");
    toast.success("Update posted");
    refetch();
  }

  async function deleteUpdate(uid: string) {
    const { error } = await supabase.from("job_updates").delete().eq("id", uid);
    if (error) return toast.error(error.message);
    refetch();
  }

  async function deletePhoto(p: any) {
    await supabase.storage.from("job-photos").remove([p.url]);
    await supabase.from("job_photos").delete().eq("id", p.id);
    refetch();
  }

  async function deleteJob() {
    if (!confirm("Delete this job and all its payments/photos?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Job deleted");
    navigate("/admin/jobs");
  }

  const totalPaid = (form.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
  const balance = Number(form.quoted_price || 0) - totalPaid;
  const beforePhotos = (form.job_photos || []).filter((p: any) => p.kind === "before");
  const afterPhotos = (form.job_photos || []).filter((p: any) => p.kind === "after");

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display tracking-wide">{form.customer?.name}</h1>
          <p className="text-sm text-muted-foreground">{form.customer?.phone} · {form.customer?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={deleteJob}><Trash2 className="h-4 w-4" /> Delete</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Shoe & Service</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Brand</Label><Input value={form.shoe_brand || ""} onChange={(e) => set("shoe_brand", e.target.value)} /></div>
              <div><Label>Model</Label><Input value={form.shoe_model || ""} onChange={(e) => set("shoe_model", e.target.value)} /></div>
            </div>
            <div><Label>Service</Label>
              <Select value={form.service_id || ""} onValueChange={(v) => set("service_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{services?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Lead Source</Label>
              <Select value={form.lead_source_id || ""} onValueChange={(v) => set("lead_source_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{sources?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Condition Notes</Label><Textarea value={form.condition_notes || ""} onChange={(e) => set("condition_notes", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status & Pricing</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Job Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JOB_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={(v) => set("payment_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Quoted Price</Label><Input type="number" step="0.01" value={form.quoted_price || ""} onChange={(e) => set("quoted_price", e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Intake</Label><Input type="date" value={form.intake_date?.slice(0,10) || ""} onChange={(e) => set("intake_date", e.target.value)} /></div>
              <div><Label>Due</Label><Input type="date" value={form.due_date?.slice(0,10) || ""} onChange={(e) => set("due_date", e.target.value)} /></div>
              <div><Label>Completed</Label><Input type="date" value={form.completion_date?.slice(0,10) || ""} onChange={(e) => set("completion_date", e.target.value)} /></div>
            </div>
            <div><Label>Admin Notes</Label><Textarea value={form.admin_notes || ""} onChange={(e) => set("admin_notes", e.target.value)} /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Payments — Paid ${totalPaid.toFixed(2)} / Balance ${balance.toFixed(2)}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input type="number" step="0.01" placeholder="Amount" value={paymentAmt} onChange={(e) => setPaymentAmt(e.target.value)} className="w-32" />
            <Input placeholder="Method (cash, card…)" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-48" />
            <Button onClick={addPayment}>Add Payment</Button>
          </div>
          {(form.payments || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No payments yet</div>
          ) : (
            <div className="divide-y border rounded-md">
              {form.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>${Number(p.amount).toFixed(2)} {p.method && `· ${p.method}`}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">{new Date(p.paid_at).toLocaleDateString()}</span>
                    <Button size="sm" variant="ghost" onClick={() => deletePayment(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(["before", "after"] as const).map((kind) => {
          const photos = kind === "before" ? beforePhotos : afterPhotos;
          return (
            <Card key={kind}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base capitalize">{kind} Photos</CardTitle>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0], kind)} />
                  <span className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-accent/10">
                    <Upload className="h-4 w-4" /> Upload
                  </span>
                </label>
              </CardHeader>
              <CardContent>
                {photos.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No photos</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p: any) => (
                      <div key={p.id} className="relative group aspect-square rounded-md overflow-hidden border">
                        {photoUrls[p.id] && <img src={photoUrls[p.id]} alt="" className="w-full h-full object-cover" />}
                        <button
                          onClick={() => togglePhotoVisibility(p)}
                          className={`absolute bottom-1 left-1 right-1 text-[10px] px-1.5 py-0.5 rounded ${p.customer_visible ? "bg-emerald-600/85 text-white" : "bg-background/85 text-muted-foreground"}`}
                          title="Toggle customer visibility"
                        >
                          {p.customer_visible ? "Customer can see" : "Hidden from customer"}
                        </button>
                        <button onClick={() => deletePhoto(p)} className="absolute top-1 right-1 p-1 bg-background/80 rounded opacity-0 group-hover:opacity-100">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Customer Updates (Timeline)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Post an update for the customer (e.g., 'Sole restoration complete, drying overnight.')"
            value={updateBody}
            onChange={(e) => setUpdateBody(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Switch checked={updateVisible} onCheckedChange={setUpdateVisible} id="vis" />
              <Label htmlFor="vis">{updateVisible ? "Visible to customer" : "Internal only"}</Label>
            </div>
            <Button onClick={postUpdate} disabled={!updateBody.trim()}>Post Update</Button>
          </div>
          {(form.job_updates || []).length > 0 && (
            <div className="divide-y border rounded-md">
              {(form.job_updates as any[])
                .slice()
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((u) => (
                <div key={u.id} className="px-3 py-2 text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="whitespace-pre-wrap">{u.body}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{new Date(u.created_at).toLocaleString()}</span>
                      <Badge variant="outline" className={u.customer_visible ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" : ""}>
                        {u.customer_visible ? "Customer-visible" : "Internal"}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteUpdate(u.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}