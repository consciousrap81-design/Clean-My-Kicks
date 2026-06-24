import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Copy, ExternalLink } from "lucide-react";

export default function Settings() {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: sources } = useQuery({
    queryKey: ["sources-all"],
    queryFn: async () => (await supabase.from("lead_sources").select("*").order("name")).data || [],
  });

  async function add() {
    if (!name) return;
    const { error } = await supabase.from("lead_sources").insert({ name });
    if (error) return toast.error(error.message);
    setName("");
    qc.invalidateQueries({ queryKey: ["sources-all"] });
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("lead_sources").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sources-all"] });
  }
  async function del(id: string) {
    const { error } = await supabase.from("lead_sources").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["sources-all"] });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-3xl font-display tracking-wide">Settings</h1>
      <StripeWebhookCard />
      <Card>
        <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Add lead source…" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={add}>Add</Button>
          </div>
          <div className="divide-y border rounded-md">
            {(sources || []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2">
                <span>{s.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <Switch checked={s.active} onCheckedChange={(v) => toggle(s.id, v)} />
                  <Button variant="ghost" size="sm" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StripeWebhookCard() {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;
  function copy() {
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied");
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Stripe Webhook</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          In your Stripe Dashboard → Developers → Webhooks, add an endpoint
          listening for <code className="text-xs bg-muted px-1 py-0.5 rounded">checkout.session.completed</code>
          using the URL below, then paste the generated signing secret into
          the <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_WEBHOOK_SECRET</code> backend secret.
        </p>
        <div className="flex items-center gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" asChild>
            <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}