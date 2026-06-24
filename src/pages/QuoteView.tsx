import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, CheckCircle2, XCircle, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Quote = {
  customer_name: string;
  shoe_brand: string | null;
  shoe_model: string | null;
  service_recommended: string | null;
  quote_amount: number;
  addons: Array<{ name: string; price?: number }> | null;
  notes: string | null;
  expires_at: string | null;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  photos: string[];
  deposit_amount?: number | null;
  allow_deposit?: boolean;
  payment_status?: "unpaid" | "partial" | "paid" | "refunded";
};

export default function QuoteView() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [message, setMessage] = useState("");
  const [payBusy, setPayBusy] = useState<"deposit" | "full" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quote-view?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load quote");
        setQuote(json.quote);
      } catch (e: any) {
        setError(e?.message ?? "Could not load quote");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("paid")) toast.success("Payment received! Check your email to set up your portal account.");
    if (sp.get("cancelled")) toast.message("Checkout cancelled.");
  }, []);

  async function startCheckout(mode: "deposit" | "full") {
    setPayBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { token, mode },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start checkout");
    } finally {
      setPayBusy(null);
    }
  }

  async function respond(action: "accept" | "decline" | "request_info") {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("quote-respond", {
        body: { token, action, message: message || undefined },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (action === "accept") {
        toast.success("Quote accepted! We'll be in touch shortly.");
        setQuote((q) => (q ? { ...q, status: "accepted" } : q));
      } else if (action === "decline") {
        toast.success("Quote declined.");
        setQuote((q) => (q ? { ...q, status: "declined" } : q));
      } else {
        toast.success("Message sent — we'll follow up with you.");
        setShowInfo(false);
        setMessage("");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center">
          <div className="text-lg font-display mb-2">Quote unavailable</div>
          <div className="text-sm text-muted-foreground">{error ?? "This quote could not be found."}</div>
        </CardContent></Card>
      </div>
    );
  }

  const total = Number(quote.quote_amount) + (quote.addons ?? []).reduce((s, a) => s + Number(a.price || 0), 0);
  const finalized = quote.status === "accepted" || quote.status === "declined" || quote.status === "expired";
  const showPay = quote.status === "accepted" && quote.payment_status !== "paid";
  const deposit = Number(quote.deposit_amount || 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display tracking-wide leading-tight">Clean My Kicks</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Your Custom Quote</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Prepared for</div>
                <div className="font-display text-xl tracking-wide">{quote.customer_name}</div>
              </div>
              <StatusBadge status={quote.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Shoe</div>
                <div className="font-medium">{[quote.shoe_brand, quote.shoe_model].filter(Boolean).join(" ") || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Service</div>
                <div className="font-medium">{quote.service_recommended || "—"}</div>
              </div>
              {quote.expires_at && (
                <div className="col-span-2">
                  <div className="text-xs uppercase text-muted-foreground">Valid until</div>
                  <div className="font-medium">{new Date(quote.expires_at).toLocaleDateString(undefined, { dateStyle: "long" })}</div>
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{quote.service_recommended || "Service"}</span>
                <span className="font-medium">${Number(quote.quote_amount).toFixed(2)}</span>
              </div>
              {(quote.addons ?? []).map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>+ {a.name}</span>
                  <span>${Number(a.price || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="text-2xl font-display">${total.toFixed(2)}</span>
              </div>
            </div>

            {quote.notes && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Notes & Recommendations</div>
                <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded-md p-3">{quote.notes}</div>
              </div>
            )}

            {quote.photos.length > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-2">Your Shoes</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {quote.photos.map((u, i) => (
                    <img key={i} src={u} alt={`Shoe ${i + 1}`} className="aspect-square w-full object-cover rounded-md border" />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!finalized ? (
          <div className="space-y-3">
            {showInfo && (
              <Card><CardContent className="p-4 space-y-3">
                <Textarea
                  rows={4}
                  placeholder="What would you like to know?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowInfo(false)} disabled={busy}>Cancel</Button>
                  <Button onClick={() => respond("request_info")} disabled={busy || !message.trim()}>Send Message</Button>
                </div>
              </CardContent></Card>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={() => respond("accept")} disabled={busy} size="lg">
                <CheckCircle2 className="h-4 w-4" /> Accept Quote
              </Button>
              <Button onClick={() => setShowInfo(true)} variant="outline" disabled={busy} size="lg">
                <MessageCircle className="h-4 w-4" /> Request More Info
              </Button>
              <Button onClick={() => respond("decline")} variant="outline" disabled={busy} size="lg">
                <XCircle className="h-4 w-4" /> Decline
              </Button>
            </div>
          </div>
        ) : (
          <Card><CardContent className="p-5 text-center text-sm text-muted-foreground">
            {quote.status === "accepted" && "You accepted this quote. We'll be in touch with next steps."}
            {quote.status === "declined" && "You declined this quote. Reach out anytime if you change your mind."}
            {quote.status === "expired" && "This quote has expired. Please contact us for an updated quote."}
          </CardContent></Card>
        )}

        {showPay && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Ready to pay?</div>
                <div className="font-display text-lg mt-1">Secure checkout via Stripe</div>
              </div>
              <div className={`grid gap-2 ${quote.allow_deposit && deposit > 0 ? "sm:grid-cols-2" : ""}`}>
                {quote.allow_deposit && deposit > 0 && (
                  <Button size="lg" variant="outline" disabled={!!payBusy} onClick={() => startCheckout("deposit")}>
                    {payBusy === "deposit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Pay Deposit · ${deposit.toFixed(2)}
                  </Button>
                )}
                <Button size="lg" disabled={!!payBusy} onClick={() => startCheckout("full")}>
                  {payBusy === "full" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {quote.payment_status === "partial" ? "Pay Balance" : `Pay Full · $${total.toFixed(2)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {quote.payment_status === "paid" && (
          <Card><CardContent className="p-5 text-center text-sm">
            ✅ Paid in full — thanks! Check your email for portal access.
          </CardContent></Card>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2">
          Questions? Reply to the message you received, or contact Clean My Kicks directly.
        </p>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: Quote["status"] }) {
  const map: Record<Quote["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    viewed: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    accepted: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    declined: "bg-muted text-muted-foreground",
    expired: "bg-muted text-muted-foreground",
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant="outline" className={map[status]}>{label}</Badge>;
}