import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, Sparkles, Trash2, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Thread = { id: string; title: string; updated_at: string };

export default function AIAssistant() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load threads
  useEffect(() => {
    supabase.from("ai_threads").select("id,title,updated_at").order("updated_at", { ascending: false })
      .then(({ data }) => setThreads((data ?? []) as Thread[]));
  }, []);

  // Bootstrap an active thread
  useEffect(() => {
    if (threadId) return;
    (async () => {
      const { data: existing } = await supabase.from("ai_threads").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) { navigate(`/admin/ai/${existing.id}`, { replace: true }); return; }
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data: created } = await supabase.from("ai_threads").insert({ user_id: user.user.id, title: "New conversation" }).select("id").single();
      if (created) navigate(`/admin/ai/${created.id}`, { replace: true });
    })();
  }, [threadId, navigate]);

  // Load messages for thread
  useEffect(() => {
    if (!threadId) return;
    setInitialMessages(null);
    supabase.from("ai_messages").select("id,role,parts,created_at").eq("thread_id", threadId).order("created_at", { ascending: true })
      .then(({ data }) => {
        const msgs: UIMessage[] = (data ?? []).map((r: any) => ({
          id: r.id, role: r.role,
          parts: Array.isArray(r.parts) ? r.parts : (typeof r.parts === "string" ? [{ type: "text", text: r.parts }] : []),
        }));
        setInitialMessages(msgs);
      });
  }, [threadId]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-chat`,
    fetch: async (input, init) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      return fetch(input, { ...init, headers });
    },
    body: { threadId },
  }), [threadId]);

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages ?? [],
    transport,
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { inputRef.current?.focus(); }, [threadId, status]);

  const busy = status === "submitted" || status === "streaming";

  async function handleSend() {
    if (!input.trim() || busy) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  }

  async function newThread() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data } = await supabase.from("ai_threads").insert({ user_id: user.user.id, title: "New conversation" }).select("id,title,updated_at").single();
    if (data) { setThreads((t) => [data as Thread, ...t]); navigate(`/admin/ai/${data.id}`); }
  }

  async function deleteThread(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await supabase.from("ai_threads").delete().eq("id", id);
    setThreads((t) => t.filter((x) => x.id !== id));
    if (id === threadId) navigate("/admin/ai");
  }

  if (initialMessages === null && threadId) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      <aside className="w-64 shrink-0 border rounded-lg flex flex-col bg-card">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Threads</span>
          <Button size="icon" variant="ghost" onClick={newThread}><Plus className="h-4 w-4" /></Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {threads.map((t) => (
              <div key={t.id} className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent ${t.id === threadId ? "bg-accent" : ""}`}
                onClick={() => navigate(`/admin/ai/${t.id}`)}>
                <span className="flex-1 truncate">{t.title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col border rounded-lg bg-card min-w-0">
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Admin AI</p>
                <p className="text-sm">Ask me to draft product copy, review orders, suggest pricing, or scan competitors. Writes go to your approval inbox.</p>
              </div>
            )}
            {messages.map((m) => (
              <MessageView key={m.id} message={m} />
            ))}
            {busy && <div className="text-sm text-muted-foreground italic">Thinking…</div>}
          </div>
        </ScrollArea>
        <div className="border-t p-3">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask the admin AI…"
              rows={2}
              className="resize-none"
              disabled={busy}
            />
            {busy
              ? <Button onClick={stop} variant="outline">Stop</Button>
              : <Button onClick={handleSend} disabled={!input.trim()}><Send className="h-4 w-4" /></Button>}
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageView({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-lg ${isUser ? "bg-primary text-primary-foreground px-3 py-2" : ""}`}>
        {message.parts?.map((part: any, i: number) => {
          if (part.type === "text") {
            return isUser
              ? <div key={i} className="whitespace-pre-wrap text-sm">{part.text}</div>
              : <div key={i} className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{part.text}</ReactMarkdown></div>;
          }
          if (part.type?.startsWith?.("tool-") || part.toolName) {
            const name = part.toolName ?? part.type?.replace("tool-", "");
            return (
              <details key={i} className="my-2 rounded border bg-muted/40 text-xs">
                <summary className="cursor-pointer px-2 py-1 flex items-center gap-1.5"><Wrench className="h-3 w-3" /> {name} <span className="text-muted-foreground">— {part.state ?? "done"}</span></summary>
                <pre className="px-2 pb-2 overflow-x-auto"><code>{JSON.stringify(part.input ?? part.output ?? part, null, 2)}</code></pre>
              </details>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}