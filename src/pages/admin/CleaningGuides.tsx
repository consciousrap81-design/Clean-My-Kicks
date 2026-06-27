import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Trash2, History, Save, BookOpen, AlertTriangle, Clock, Sparkles } from "lucide-react";

const MATERIALS = ["Suede", "Leather", "Mesh", "Canvas", "Knit", "Patent", "Nubuck"];

type Guide = any;

function parseJSON<T>(v: string, fallback: T): T {
  try { return JSON.parse(v) as T; } catch { return fallback; }
}

export default function CleaningGuides() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("guide"));
  const [draft, setDraft] = useState<Guide | null>(null);
  const [editing, setEditing] = useState(false);
  const [chemicalsText, setChemicalsText] = useState("[]");
  const [toolsText, setToolsText] = useState("[]");
  const [stepsText, setStepsText] = useState("[]");

  const { data: guides = [] } = useQuery({
    queryKey: ["cleaning-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cleaning_guides")
        .select("*")
        .order("material")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return guides.filter((g) => {
      if (filter !== "all" && g.material?.toLowerCase() !== filter.toLowerCase()) return false;
      if (search && !`${g.title} ${g.summary ?? ""} ${g.material}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [guides, filter, search]);

  const selected: Guide | null = useMemo(
    () => guides.find((g: any) => g.id === selectedId) ?? null,
    [guides, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setDraft(selected);
      setChemicalsText(JSON.stringify(selected.recommended_chemicals ?? [], null, 2));
      setToolsText(JSON.stringify(selected.tools ?? [], null, 2));
      setStepsText(JSON.stringify(selected.steps ?? [], null, 2));
      setEditing(false);
    }
  }, [selectedId, selected?.updated_at]);

  const { data: versions = [] } = useQuery({
    queryKey: ["cleaning-guide-versions", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cleaning_guide_versions")
        .select("*")
        .eq("guide_id", selectedId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function selectGuide(id: string | null) {
    setSelectedId(id);
    if (id) setParams({ guide: id }); else setParams({});
  }

  async function createNew() {
    const { data, error } = await supabase
      .from("cleaning_guides")
      .insert({ material: "Suede", title: "New Cleaning Protocol", source: "admin" })
      .select()
      .single();
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cleaning-guides"] });
    selectGuide(data.id);
    setEditing(true);
    toast.success("Draft guide created");
  }

  async function saveDraft() {
    if (!draft) return;
    const chemicals = parseJSON(chemicalsText, null);
    const tools = parseJSON(toolsText, null);
    const steps = parseJSON(stepsText, null);
    if (chemicals == null) return toast.error("Chemicals JSON is invalid");
    if (tools == null) return toast.error("Tools JSON is invalid");
    if (steps == null) return toast.error("Steps JSON is invalid");
    const { error } = await supabase
      .from("cleaning_guides")
      .update({
        material: draft.material,
        title: draft.title,
        summary: draft.summary,
        brush_stiffness: draft.brush_stiffness,
        cautions: draft.cautions,
        estimated_minutes: draft.estimated_minutes ? Number(draft.estimated_minutes) : null,
        recommended_chemicals: chemicals,
        tools,
        steps,
      })
      .eq("id", draft.id);
    if (error) return toast.error(error.message);
    toast.success("Guide saved — new version recorded");
    qc.invalidateQueries({ queryKey: ["cleaning-guides"] });
    qc.invalidateQueries({ queryKey: ["cleaning-guide-versions", draft.id] });
    setEditing(false);
  }

  async function deleteGuide() {
    if (!draft || !confirm("Delete this guide and its full version history?")) return;
    const { error } = await supabase.from("cleaning_guides").delete().eq("id", draft.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cleaning-guides"] });
    selectGuide(null);
    toast.success("Guide deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display tracking-wide flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Cleaning Guides
          </h1>
          <p className="text-sm text-muted-foreground">Material-based restoration protocols with versioned change history.</p>
        </div>
        <Button onClick={createNew} className="gap-1"><Plus className="h-4 w-4" /> New Guide</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Browse + Filter */}
        <Card className="md:sticky md:top-4 self-start">
          <CardHeader className="pb-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guides…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All materials</SelectItem>
                {MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-2 max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 && <div className="text-sm text-muted-foreground p-2">No guides match.</div>}
            <ul className="space-y-1">
              {filtered.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => selectGuide(g.id)}
                    className={`w-full text-left px-2 py-2 rounded-md border transition-colors ${
                      selectedId === g.id ? "bg-primary/10 border-primary/40" : "hover:bg-muted/50 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{g.material}</Badge>
                      {g.source === "kicks_ai" && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Kicks
                        </Badge>
                      )}
                    </div>
                    <div className="font-medium text-sm mt-1 line-clamp-1">{g.title}</div>
                    {g.summary && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{g.summary}</div>}
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Detail */}
        <div className="space-y-4 min-w-0">
          {!draft ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a guide from the list to view its protocol.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label>Title</Label>
                          <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        </div>
                        <div>
                          <Label>Material</Label>
                          <Select value={draft.material} onValueChange={(v) => setDraft({ ...draft, material: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-xl">{draft.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <Badge variant="outline">{draft.material}</Badge>
                          {draft.brush_stiffness && <Badge variant="outline">Brush: {draft.brush_stiffness}</Badge>}
                          {draft.estimated_minutes != null && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" /> ~{draft.estimated_minutes} min
                            </Badge>
                          )}
                          {draft.source && <Badge variant="secondary" className="text-[10px]">source: {draft.source}</Badge>}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {editing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => { setEditing(false); setDraft(selected); }}>Cancel</Button>
                        <Button size="sm" onClick={saveDraft} className="gap-1"><Save className="h-3.5 w-3.5" /> Save</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={deleteGuide}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editing ? (
                    <>
                      <div><Label>Summary</Label>
                        <Textarea value={draft.summary ?? ""} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><Label>Brush Stiffness</Label>
                          <Input value={draft.brush_stiffness ?? ""} onChange={(e) => setDraft({ ...draft, brush_stiffness: e.target.value })} />
                        </div>
                        <div><Label>Estimated Minutes</Label>
                          <Input type="number" value={draft.estimated_minutes ?? ""} onChange={(e) => setDraft({ ...draft, estimated_minutes: e.target.value })} />
                        </div>
                      </div>
                      <div><Label>Cautions</Label>
                        <Textarea value={draft.cautions ?? ""} onChange={(e) => setDraft({ ...draft, cautions: e.target.value })} />
                      </div>
                      <div><Label className="text-xs">Recommended Chemicals (JSON array of {`{name, purpose, dilution}`})</Label>
                        <Textarea rows={5} className="font-mono text-xs" value={chemicalsText} onChange={(e) => setChemicalsText(e.target.value)} />
                      </div>
                      <div><Label className="text-xs">Tools (JSON string array)</Label>
                        <Textarea rows={3} className="font-mono text-xs" value={toolsText} onChange={(e) => setToolsText(e.target.value)} />
                      </div>
                      <div><Label className="text-xs">Steps (JSON array of {`{order, title, instruction, caution}`})</Label>
                        <Textarea rows={8} className="font-mono text-xs" value={stepsText} onChange={(e) => setStepsText(e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <>
                      {draft.summary && <p className="text-sm text-muted-foreground">{draft.summary}</p>}

                      {Array.isArray(draft.recommended_chemicals) && draft.recommended_chemicals.length > 0 && (
                        <section>
                          <h3 className="text-sm font-medium mb-2">Recommended Chemicals</h3>
                          <ul className="space-y-1.5">
                            {(draft.recommended_chemicals as any[]).map((c, i) => (
                              <li key={i} className="text-sm flex items-baseline gap-2">
                                <span className="font-medium">{c.name}</span>
                                {c.purpose && <span className="text-muted-foreground">— {c.purpose}</span>}
                                {c.dilution && <Badge variant="outline" className="text-[10px]">{c.dilution}</Badge>}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {Array.isArray(draft.tools) && draft.tools.length > 0 && (
                        <section>
                          <h3 className="text-sm font-medium mb-2">Tools</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {(draft.tools as string[]).map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                          </div>
                        </section>
                      )}

                      {Array.isArray(draft.steps) && draft.steps.length > 0 && (
                        <section>
                          <h3 className="text-sm font-medium mb-2">Step-by-Step</h3>
                          <ol className="space-y-3">
                            {(draft.steps as any[])
                              .slice()
                              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                              .map((s, i) => (
                                <li key={i} className="flex gap-3">
                                  <div className="h-7 w-7 rounded-full bg-primary/15 text-primary text-sm font-medium flex items-center justify-center shrink-0">
                                    {s.order ?? i + 1}
                                  </div>
                                  <div className="flex-1">
                                    {s.title && <div className="font-medium">{s.title}</div>}
                                    <div className="text-sm text-muted-foreground">{s.instruction}</div>
                                    {s.caution && (
                                      <div className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> {s.caution}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                          </ol>
                        </section>
                      )}

                      {draft.cautions && (
                        <section className="rounded-md border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                          <span>{draft.cautions}</span>
                        </section>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" /> Change History ({versions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {versions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No history yet.</div>
                  ) : (
                    versions.map((v: any, idx) => {
                      const prev = versions[idx + 1];
                      return (
                        <div key={v.id} className="border rounded-md p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant={v.change_type === "create" ? "secondary" : "default"}>
                              v{v.version} · {v.change_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(v.created_at).toLocaleString()}
                            </span>
                            {(v.changed_fields ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1 ml-auto">
                                {(v.changed_fields as string[]).map((f) => (
                                  <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {v.change_type === "update" && prev && (
                            <div className="space-y-1.5">
                              {(v.changed_fields as string[]).map((f) => (
                                <DiffRow key={f} field={f} before={prev[f]} after={v[f]} />
                              ))}
                            </div>
                          )}
                          {v.change_type === "create" && (
                            <div className="text-xs text-muted-foreground">Initial version captured.</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiffRow({ field, before, after }: { field: string; before: any; after: any }) {
  const fmt = (v: any) => {
    if (v == null) return <span className="italic text-muted-foreground">empty</span>;
    if (typeof v === "object") return <code className="text-[11px] break-all">{JSON.stringify(v)}</code>;
    return <span className="break-words">{String(v)}</span>;
  };
  return (
    <div className="grid grid-cols-[80px_1fr_1fr] gap-2 text-xs items-start border-t pt-1.5 first:border-0 first:pt-0">
      <div className="font-mono text-muted-foreground">{field}</div>
      <div className="bg-destructive/10 rounded px-2 py-1 line-clamp-3">{fmt(before)}</div>
      <div className="bg-emerald-500/10 rounded px-2 py-1 line-clamp-3">{fmt(after)}</div>
    </div>
  );
}