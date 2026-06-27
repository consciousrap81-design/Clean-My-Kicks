import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, MessageSquare, Sparkles, ExternalLink, Lock } from "lucide-react";

type ThreadRow = { id: string; title: string; updated_at: string; is_private: boolean };
type MsgRow = { id: string; thread_id: string; role: string; parts: any; created_at: string };

function partsToText(parts: any): string {
  if (Array.isArray(parts)) {
    return parts.map((p) => (p && typeof p === "object" && p.type === "text" ? String(p.text ?? "") : "")).join(" ").trim();
  }
  if (typeof parts === "string") return parts;
  return "";
}

function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(Math.max(0, idx - 80), idx);
  const hit = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length, idx + q.length + 160);
  return (
    <>
      {idx > 80 ? "…" : ""}{before}
      <mark className="bg-primary/30 text-foreground rounded px-0.5">{hit}</mark>
      {after}{idx + q.length + 160 < text.length ? "…" : ""}
    </>
  );
}

export default function AITranscripts() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: t }, { data: m }] = await Promise.all([
        supabase.from("ai_threads").select("id,title,updated_at,is_private").eq("is_private", false).order("updated_at", { ascending: false }),
        supabase.from("ai_messages").select("id,thread_id,role,parts,created_at,ai_threads!inner(is_private)").eq("ai_threads.is_private", false).order("created_at", { ascending: false }).limit(2000),
      ]);
      setThreads((t ?? []) as ThreadRow[]);
      setMessages((m ?? []) as MsgRow[]);
      setLoading(false);
    })();
  }, []);

  const threadIndex = useMemo(() => {
    const map = new Map<string, ThreadRow>();
    for (const t of threads) map.set(t.id, t);
    return map;
  }, [threads]);

  const enriched = useMemo(() => messages.map((m) => ({ ...m, text: partsToText(m.parts) })), [messages]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return enriched.filter((m) => m.text.toLowerCase().includes(needle)).slice(0, 100);
  }, [enriched, q]);

  const totalMsgs = messages.length;
  const totalThreads = threads.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-display flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Kicks transcripts</h1>
          <p className="text-sm text-muted-foreground">Every Kicks conversation is auto-saved. Search past research, decisions, and site notes.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Private chats excluded</Badge>
          <Badge variant="outline">{totalThreads} threads</Badge>
          <Badge variant="outline">{totalMsgs.toLocaleString()} messages indexed</Badge>
        </div>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search transcripts (keyword, product, customer, decision)…"
          className="pl-9"
        />
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading transcripts…</div>}

      {!loading && q.trim() === "" && (
        <div className="grid gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent threads</h2>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-3">
              {threads.map((t) => {
                const preview = enriched.find((m) => m.thread_id === t.id);
                return (
                  <Card key={t.id} className="p-3 hover:bg-accent/40 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.title || "Untitled conversation"}</div>
                        <div className="text-xs text-muted-foreground truncate">{preview?.text?.slice(0, 140) || "No messages yet"}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground">{new Date(t.updated_at).toLocaleDateString()}</span>
                        <Button asChild size="sm" variant="ghost"><Link to={`/admin/ai/${t.id}`}>Open <ExternalLink className="h-3 w-3 ml-1" /></Link></Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {threads.length === 0 && <div className="text-sm text-muted-foreground">No conversations yet.</div>}
            </div>
          </ScrollArea>
        </div>
      )}

      {!loading && q.trim() !== "" && (
        <div className="grid gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </h2>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-2 pr-3">
              {matches.map((m) => {
                const t = threadIndex.get(m.thread_id);
                return (
                  <Card key={m.id} className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={m.role === "user" ? "default" : "secondary"} className="text-[10px] uppercase">
                          {m.role === "user" ? "You" : "Kicks"}
                        </Badge>
                        <Link to={`/admin/ai/${m.thread_id}`} className="text-sm font-medium truncate hover:underline">
                          {t?.title || "Untitled conversation"}
                        </Link>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{highlight(m.text, q)}</p>
                  </Card>
                );
              })}
              {matches.length === 0 && (
                <div className="text-sm text-muted-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4" /> No matches in saved transcripts.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}