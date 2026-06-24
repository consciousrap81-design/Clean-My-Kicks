import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, CheckCircle2, XCircle, Archive, Loader2, Camera, X } from "lucide-react";
import { toast } from "sonner";

type Request = {
  id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  service_requested: string | null;
  shoe_brand: string | null;
  shoe_model: string | null;
  shoe_size: string | null;
  drop_off_method: string | null;
  notes: string | null;
  photos: string[] | null;
  source: string;
  status: "pending" | "approved" | "declined" | "awaiting_photos";
  quoted_price: number;
  admin_notes: string | null;
  converted_job_id: string | null;
  submitted_at: string;
};

const STATUS_LABEL: Record<Request["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  awaiting_photos: "Awaiting Photos",
};

function StatusBadge({ status }: { status: Request["status"] }) {
  const cls =
    status === "pending"
      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
      : status === "approved"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
      : status === "awaiting_photos"
      ? "bg-sky-500/15 text-sky-600 border-sky-500/30"
      : "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={cls}>{STATUS_LABEL[status]}</Badge>;
}

async function resolvePhotoUrl(entry: string): Promise<string | null> {
  if (!entry) return null;
  if (entry.startsWith("http://") || entry.startsWith("https://")) return entry;
  const { data } = await supabase.storage.from("request-photos").createSignedUrl(entry, 3600);
  return data?.signedUrl ?? null;
}

export default function Requests() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<Request | null>(null);
  const [quoted, setQuoted] = useState<string>("0");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["booking-requests", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("booking_requests")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data as Request[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  function openRequest(r: Request) {
    setSelected(r);
    setQuoted(String(r.quoted_price ?? 0));
    setAdminNotes(r.admin_notes ?? "");
    setPhotoUrls([]);
    setLightboxIdx(null);
  }

  useEffect(() => {
    if (!selected?.photos?.length) {
      setPhotoUrls([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(selected.photos!.map(resolvePhotoUrl));
      if (!cancelled) setPhotoUrls(resolved.filter((u): u is string => !!u));
    })();
    return () => { cancelled = true; };
  }, [selected?.id]);

  async function saveDraft() {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("booking_requests")
      .update({ quoted_price: Number(quoted) || 0, admin_notes: adminNotes || null })
      .eq("id", selected.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
  }

  async function approveAndConvert() {
    if (!selected) return;
    setBusy(true);
    try {
      // 1. Find or create customer
      let customerId: string | undefined;
      const filters: string[] = [];
      if (selected.email) filters.push(`email.eq.${selected.email}`);
      if (selected.phone) filters.push(`phone.eq.${selected.phone}`);
      if (filters.length) {
        const { data: existing } = await supabase
          .from("customers")
          .select("id")
          .or(filters.join(","))
          .maybeSingle();
        customerId = existing?.id;
      }
      if (!customerId) {
        const { data: created, error: cErr } = await supabase
          .from("customers")
          .insert({
            name: selected.customer_name,
            email: selected.email,
            phone: selected.phone,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        customerId = created.id;
      }

      // 2. Match service by name
      let serviceId: string | null = null;
      if (selected.service_requested) {
        const { data: svc } = await supabase
          .from("services")
          .select("id")
          .ilike("name", `%${selected.service_requested}%`)
          .limit(1)
          .maybeSingle();
        serviceId = svc?.id ?? null;
      }

      // 3. Create job
      const conditionParts = [
        selected.shoe_size ? `Size: ${selected.shoe_size}` : null,
        selected.drop_off_method ? `Drop-off: ${selected.drop_off_method}` : null,
        selected.notes ? `Notes: ${selected.notes}` : null,
      ].filter(Boolean);

      const { data: job, error: jErr } = await supabase
        .from("jobs")
        .insert({
          customer_id: customerId!,
          service_id: serviceId,
          shoe_brand: selected.shoe_brand,
          shoe_model: selected.shoe_model,
          condition_notes: conditionParts.join("\n") || null,
          admin_notes: adminNotes || null,
          quoted_price: Number(quoted) || 0,
          status: "new_request",
          payment_status: "unpaid",
          intake_date: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (jErr) throw jErr;

      // 4. Carry uploaded photos over to the job as "before" photos.
      //    Copy each object from request-photos -> job-photos and create a
            //    job_photos row referencing the new path.
      const photoEntries = (selected.photos ?? []).filter(Boolean);
      for (const entry of photoEntries) {
        try {
          // Only storage paths can be copied. External URLs are skipped.
          if (/^https?:\/\//i.test(entry)) continue;
          const { data: blob, error: dlErr } = await supabase.storage
            .from("request-photos")
            .download(entry);
          if (dlErr || !blob) continue;
          const ext = entry.split(".").pop()?.toLowerCase() || "jpg";
          const destPath = `${job.id}/before/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("job-photos")
            .upload(destPath, blob, { contentType: blob.type || undefined, upsert: false });
          if (upErr) continue;
          await supabase.from("job_photos").insert({
            job_id: job.id,
            url: destPath,
            kind: "before",
          });
        } catch (err) {
          console.warn("photo carry-over failed", err);
        }
      }

      // 5. Mark request approved + link
      const { error: uErr } = await supabase
        .from("booking_requests")
        .update({
          status: "approved",
          quoted_price: Number(quoted) || 0,
          admin_notes: adminNotes || null,
          converted_job_id: job.id,
        })
        .eq("id", selected.id);
      if (uErr) throw uErr;

      toast.success("Approved and converted to job");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to convert");
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("booking_requests")
      .update({
        status: "declined",
        quoted_price: Number(quoted) || 0,
        admin_notes: adminNotes || null,
      })
      .eq("id", selected.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Request declined");
    setSelected(null);
    queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
  }

  async function requestMorePhotos() {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase
      .from("booking_requests")
      .update({
        status: "awaiting_photos",
        quoted_price: Number(quoted) || 0,
        admin_notes: adminNotes || null,
      })
      .eq("id", selected.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Marked as awaiting more photos");
    setSelected(null);
    queryClient.invalidateQueries({ queryKey: ["booking-requests"] });
  }

  const list = requests ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display tracking-wide">Requests</h1>
          <p className="text-muted-foreground text-sm">Incoming booking leads from the website</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="awaiting_photos">Awaiting Photos</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Inbox className="h-8 w-8 opacity-50" />
            <div>No {statusFilter !== "all" ? statusFilter : ""} requests.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((r) => (
            <Card
              key={r.id}
              onClick={() => openRequest(r)}
              className="cursor-pointer hover:border-primary transition-colors"
            >
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.customer_name} · {r.shoe_brand} {r.shoe_model}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.service_requested || "—"} · {r.email || r.phone || "—"} ·{" "}
                    Submitted {new Date(r.submitted_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{r.source}</Badge>
                  <StatusBadge status={r.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Review Request
                  <StatusBadge status={selected.status} />
                </DialogTitle>
                <DialogDescription>
                  Submitted {new Date(selected.submitted_at).toLocaleString()} · Source: {selected.source}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Customer</div>
                    <div className="font-medium">{selected.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Service</div>
                    <div className="font-medium">{selected.service_requested || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Email</div>
                    <div className="break-all">{selected.email || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Phone</div>
                    <div>{selected.phone || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Shoe</div>
                    <div>{selected.shoe_brand} {selected.shoe_model}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">Size / Drop-off</div>
                    <div>{selected.shoe_size || "—"} · {selected.drop_off_method || "—"}</div>
                  </div>
                </div>

                {selected.notes && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Customer Notes</div>
                    <div className="text-sm bg-muted/40 rounded-md p-3 whitespace-pre-wrap">{selected.notes}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Photos {selected.photos?.length ? `(${selected.photos.length})` : ""}
                  </div>
                  {!selected.photos?.length ? (
                    <div className="text-sm text-muted-foreground italic">No photos uploaded.</div>
                  ) : photoUrls.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Loading photos…</div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photoUrls.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLightboxIdx(i)}
                          className="aspect-square rounded-md overflow-hidden border border-border bg-muted hover:border-primary transition-colors"
                        >
                          <img src={url} alt={`Request photo ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase text-muted-foreground block mb-1">Quoted Price ($)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={quoted}
                      onChange={(e) => setQuoted(e.target.value)}
                      disabled={selected.status !== "pending"}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase text-muted-foreground block mb-1">Internal Notes</label>
                  <Textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Notes for the team (not shown to customer)"
                    disabled={selected.status !== "pending"}
                  />
                </div>

                {selected.converted_job_id && (
                  <div className="text-xs text-muted-foreground">
                    Converted to job:{" "}
                    <a className="text-primary underline" href={`/admin/jobs/${selected.converted_job_id}`}>
                      view job
                    </a>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-wrap gap-2 sm:gap-2">
                {selected.status === "pending" || selected.status === "awaiting_photos" ? (
                  <>
                    <Button variant="outline" onClick={saveDraft} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save
                    </Button>
                    <Button variant="outline" onClick={requestMorePhotos} disabled={busy}>
                      <Camera className="h-4 w-4" /> Request More Photos
                    </Button>
                    <Button variant="outline" onClick={decline} disabled={busy}>
                      <XCircle className="h-4 w-4" /> Decline / Archive
                    </Button>
                    <Button onClick={approveAndConvert} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve & Create Job
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    <Archive className="h-4 w-4" /> Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={lightboxIdx !== null} onOpenChange={(o) => !o && setLightboxIdx(null)}>
        <DialogContent className="max-w-4xl p-2 sm:p-4 bg-background">
          {lightboxIdx !== null && photoUrls[lightboxIdx] && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                aria-label="Close"
                className="absolute -top-1 -right-1 z-10 rounded-full bg-background/90 border border-border p-1.5 shadow"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={photoUrls[lightboxIdx]}
                alt={`Request photo ${lightboxIdx + 1}`}
                className="w-full max-h-[80vh] object-contain rounded-md"
              />
              <div className="text-center text-xs text-muted-foreground mt-2">
                {lightboxIdx + 1} / {photoUrls.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}