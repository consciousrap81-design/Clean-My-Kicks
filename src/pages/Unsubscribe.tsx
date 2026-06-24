import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  useEffect(() => {
    (async () => {
      if (!token) return setState("invalid");
      try {
        const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
          headers: { apikey },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return setState("invalid");
        if (json.valid === false && json.reason === "already_unsubscribed") return setState("already");
        if (json.valid) return setState("valid");
        setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token, url, apikey]);

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.success || json.reason === "already_unsubscribed") setState("done");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <div>
            <div className="font-display text-xl tracking-wide">Clean My Kicks</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Email Preferences</div>
          </div>

          {state === "loading" && (
            <div className="flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          )}

          {state === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Click below to unsubscribe from Clean My Kicks emails. You&rsquo;ll no longer receive quotes or updates.
              </p>
              <Button onClick={confirm} disabled={busy} size="lg" className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Unsubscribe"}
              </Button>
            </>
          )}

          {state === "done" && (
            <div className="space-y-2">
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm">You&rsquo;ve been unsubscribed. We won&rsquo;t email you again.</p>
            </div>
          )}

          {state === "already" && (
            <div className="space-y-2">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">This email is already unsubscribed.</p>
            </div>
          )}

          {(state === "invalid" || state === "error") && (
            <div className="space-y-2">
              <XCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">
                {state === "invalid"
                  ? "This unsubscribe link is invalid or has expired."
                  : "Something went wrong. Please try again."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}