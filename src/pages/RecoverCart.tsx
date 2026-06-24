import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type State =
  | { kind: "loading" }
  | { kind: "redirecting" }
  | { kind: "sold" }
  | { kind: "unavailable" }
  | { kind: "busy" }
  | { kind: "error"; message: string };

export default function RecoverCart() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setState({ kind: "error", message: "Missing recovery token." });
        return;
      }
      const { data, error } = await supabase.functions.invoke("recover-shop-cart", {
        method: "GET",
        body: undefined,
        // pass token via query string
      } as any);
      if (cancelled) return;
      // supabase-js doesn't support query strings on invoke cleanly — fall back to a direct fetch
      if (error || !data) {
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recover-shop-cart?token=${encodeURIComponent(token)}`;
          const resp = await fetch(url, {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          });
          const json = await resp.json();
          handle(json);
        } catch (e: any) {
          setState({ kind: "error", message: e?.message || "Could not reach recovery service." });
        }
        return;
      }
      handle(data);
    }

    function handle(payload: any) {
      if (payload?.error) {
        setState({ kind: "error", message: payload.error });
        return;
      }
      switch (payload?.status) {
        case "sold":
          setState({ kind: "sold" });
          return;
        case "unavailable":
          setState({ kind: "unavailable" });
          return;
        case "reserved_by_other":
          setState({ kind: "busy" });
          return;
        case "recovered":
        case "ok":
        default:
          if (payload?.redirect) {
            setState({ kind: "redirecting" });
            window.location.href = payload.redirect;
          } else {
            setState({ kind: "error", message: "Unexpected response." });
          }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-4">
        {state.kind === "loading" && (
          <>
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <h1 className="text-2xl font-semibold">Picking up where you left off…</h1>
            <p className="text-muted-foreground">Hang tight while we re-reserve your pair.</p>
          </>
        )}
        {state.kind === "redirecting" && (
          <>
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <h1 className="text-2xl font-semibold">Sending you to checkout…</h1>
          </>
        )}
        {state.kind === "sold" && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-orange-500" />
            <h1 className="text-2xl font-semibold">These kicks just sold</h1>
            <p className="text-muted-foreground">
              Every pair we restore is one-of-one — someone snagged this one. Plenty more in the shop.
            </p>
            <Button asChild><Link to="/shop">Browse the shop</Link></Button>
          </>
        )}
        {state.kind === "busy" && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-orange-500" />
            <h1 className="text-2xl font-semibold">Reserved by someone else right now</h1>
            <p className="text-muted-foreground">
              Another shopper is in checkout. If they don&rsquo;t finish in 15 minutes, you can try again.
            </p>
            <Button asChild variant="outline"><Link to="/shop">Back to shop</Link></Button>
          </>
        )}
        {state.kind === "unavailable" && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-orange-500" />
            <h1 className="text-2xl font-semibold">This item isn&rsquo;t available</h1>
            <Button asChild><Link to="/shop">Browse the shop</Link></Button>
          </>
        )}
        {state.kind === "error" && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground">{state.message}</p>
            <Button asChild><Link to="/shop">Back to shop</Link></Button>
          </>
        )}
      </div>
    </main>
  );
}