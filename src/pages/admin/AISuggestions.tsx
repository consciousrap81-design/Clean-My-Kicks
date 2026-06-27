import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sparkles, RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";

type Suggestion = { id: string; kind: string; title: string; summary: string | null; status: string; payload: any; created_at: string };

export default function AISuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("ai_suggestions").select("*").order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as Suggestion[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function runScan() {
    setScanning(true);
    try {
      const { error } = await supabase.functions.invoke("admin-ai-scan", { body: {} });
      if (error) throw error;
      toast.success("Scan complete");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setScanning(false); }
  }

  async function act(id: string, action: "apply" | "dismiss") {
    const { error } = await supabase.functions.invoke("admin-ai-execute", { body: { suggestion_id: id, action } });
    if (error) { toast.error(error.message); return; }
    toast.success(action === "apply" ? "Applied" : "Dismissed");
    await load();
  }

  const pending = items.filter((i) => i.status === "pending");
  const resolved = items.filter((i) => i.status !== "pending");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Suggestions</h1>
          <p className="text-sm text-muted-foreground">Approve or dismiss proposals from the admin AI and scheduled scans.</p>
        </div>
        <Button onClick={runScan} disabled={scanning} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} /> Run scan now
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Pending ({pending.length})</h2>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && pending.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No pending suggestions.</Card>}
        {pending.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{s.kind}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                </div>
                <p className="font-medium">{s.title}</p>
                {s.summary && <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>}
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Details</summary>
                  <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto"><code>{JSON.stringify(s.payload, null, 2)}</code></pre>
                </details>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => act(s.id, "apply")}><Check className="h-3.5 w-3.5 mr-1" />Apply</Button>
                <Button size="sm" variant="ghost" onClick={() => act(s.id, "dismiss")}><X className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Recent ({resolved.length})</h2>
          {resolved.slice(0, 20).map((s) => (
            <div key={s.id} className="text-sm flex items-center gap-2 px-3 py-1.5 rounded border">
              <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
              <span className="truncate flex-1">{s.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}