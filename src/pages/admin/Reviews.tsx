import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, CheckCircle2, XCircle, EyeOff, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { StarRating } from "@/components/shop/StarRating";

type Row = {
  id: string;
  product_id: string;
  order_id: string | null;
  user_id: string;
  reviewer_name: string | null;
  rating: number;
  title: string | null;
  body: string;
  photo_path: string | null;
  status: "pending" | "approved" | "rejected" | "hidden";
  rejection_reason: string | null;
  created_at: string;
  product?: { id: string; name: string | null; brand: string | null; model: string | null } | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  hidden: "bg-slate-200 text-slate-700",
};

export default function AdminReviews() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [query, setQuery] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("shop_reviews")
        .select(`
          id, product_id, order_id, user_id, reviewer_name, rating, title, body, photo_path,
          status, rejection_reason, created_at,
          product:shop_products ( id, name, brand, model )
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as Row[]) || [];
    },
  });

  useEffect(() => {
    const paths = reviews.map((r) => r.photo_path).filter(Boolean) as string[];
    if (paths.length === 0) { setPhotoUrls({}); return; }
    (async () => {
      const { data } = await supabase.storage.from("shop-review-photos").createSignedUrls(paths, 60 * 60);
      const out: Record<string, string> = {};
      data?.forEach((s) => { if (s.path && s.signedUrl) out[s.path] = s.signedUrl; });
      setPhotoUrls(out);
    })();
  }, [reviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const product = [r.product?.brand, r.product?.model, r.product?.name].filter(Boolean).join(" ").toLowerCase();
      return (
        product.includes(q) ||
        (r.reviewer_name || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q)
      );
    });
  }, [reviews, query]);

  const counts = useMemo(() => {
    return {
      pending: reviews.filter((r) => r.status === "pending").length,
      approved: reviews.filter((r) => r.status === "approved").length,
      rejected: reviews.filter((r) => r.status === "rejected").length,
      hidden: reviews.filter((r) => r.status === "hidden").length,
    };
  }, [reviews]);

  async function act(review: Row, action: "approve" | "reject" | "hide" | "unhide", reasonText?: string) {
    setBusyId(review.id);
    const t = toast.loading(`${action}…`);
    try {
      const { data, error } = await supabase.functions.invoke("moderate-shop-review", {
        body: { reviewId: review.id, action, reason: reasonText },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Review ${action}d`, { id: t });
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (e: any) {
      toast.error(`Couldn't ${action}`, { id: t, description: e?.message || String(e) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" /> Reviews
          </h1>
          <p className="text-sm text-muted-foreground">Approve, reject, or hide customer reviews before they appear on the storefront.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Pill label="Pending" count={counts.pending} status="pending" />
        <Pill label="Approved" count={counts.approved} status="approved" />
        <Pill label="Rejected" count={counts.rejected} status="rejected" />
        <Pill label="Hidden" count={counts.hidden} status="hidden" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search product, name, text…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} shown</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No reviews match.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => {
                const productName =
                  [r.product?.brand, r.product?.model, r.product?.name].filter(Boolean).join(" ") || "Unknown product";
                return (
                  <li key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <StarRating value={r.rating} />
                        {r.title && <span className="font-medium">{r.title}</span>}
                        <Badge variant="secondary" className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "PPp")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <a href={`/shop/${r.product_id}`} target="_blank" rel="noreferrer" className="underline">{productName}</a>
                      {" · "}
                      {r.reviewer_name || "Anonymous"}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                    {r.photo_path && photoUrls[r.photo_path] && (
                      <a href={photoUrls[r.photo_path]} target="_blank" rel="noreferrer">
                        <img
                          src={photoUrls[r.photo_path]}
                          alt="Review photo"
                          className="max-h-44 rounded-md border"
                        />
                      </a>
                    )}
                    {r.rejection_reason && (
                      <p className="text-xs text-rose-600">Rejected: {r.rejection_reason}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      {r.status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => act(r, r.status === "hidden" ? "unhide" : "approve")}
                          disabled={busyId === r.id}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          {r.status === "hidden" ? "Unhide" : "Approve"}
                        </Button>
                      )}
                      {r.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setRejecting(r); setReason(r.rejection_reason || ""); }}
                          disabled={busyId === r.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      )}
                      {r.status === "approved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => act(r, "hide")}
                          disabled={busyId === r.id}
                        >
                          <EyeOff className="w-4 h-4 mr-1" /> Hide
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this review?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer won't be notified, but you can record an internal reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (internal note)</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. unrelated photo, offensive language…"
              maxLength={500}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (rejecting) await act(rejecting, "reject", reason.trim() || undefined);
                setRejecting(null);
                setReason("");
              }}
            >
              Reject review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Pill({ label, count, status }: { label: string; count: number; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="secondary" className={STATUS_STYLES[status]}>{count}</Badge>
    </div>
  );
}