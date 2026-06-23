import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function Services() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const { data: services } = useQuery({
    queryKey: ["services-all"],
    queryFn: async () => (await supabase.from("services").select("*").order("name")).data || [],
  });

  async function add() {
    if (!name) return;
    const { error } = await supabase.from("services").insert({ name, description: desc || null, base_price: Number(price || 0) });
    if (error) return toast.error(error.message);
    setName(""); setDesc(""); setPrice("");
    qc.invalidateQueries({ queryKey: ["services-all"] });
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("services").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["services-all"] });
  }
  async function del(id: string) {
    if (!confirm("Delete service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["services-all"] });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-display tracking-wide">Services</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Add Service</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Base Price</Label><Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="md:col-span-2"><Button onClick={add}>Add</Button></div>
        </CardContent>
      </Card>
      <div className="grid gap-2">
        {(services || []).map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{s.name} — ${Number(s.base_price).toFixed(2)}</div>
                {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={s.active} onCheckedChange={(v) => toggle(s.id, v)} />
                  <span>{s.active ? "Active" : "Inactive"}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}