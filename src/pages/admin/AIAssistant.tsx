import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Send, Sparkles, Trash2, Wrench, Mic, MicOff, Settings2, Search, Radio, Lock, Unlock, AlertTriangle, Package, ShoppingBag, Hammer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useKicksVoice, voiceSupported, type VoiceMode, type WakeSensitivity } from "@/hooks/useKicksVoice";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

const VOICE_PREFS_KEY = "kicks.voice.prefs.v1";
function loadVoicePrefs(): { mode: VoiceMode; sensitivity: WakeSensitivity } {
  if (typeof window === "undefined") return { mode: "wake", sensitivity: "medium" };
  try {
    const raw = window.localStorage.getItem(VOICE_PREFS_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v && (v.mode === "wake" || v.mode === "push") && ["strict","medium","loose"].includes(v.sensitivity)) return v;
    }
  } catch {}
  return { mode: "wake", sensitivity: "medium" };
}

type Thread = { id: string; title: string; updated_at: string; is_private: boolean };

export default function AIAssistant() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(() => loadVoicePrefs().mode);
  const [sensitivity, setSensitivity] = useState<WakeSensitivity>(() => loadVoicePrefs().sensitivity);
  const lastSpokenRef = useRef<string | null>(null);

  useEffect(() => {
    try { window.localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify({ mode: voiceMode, sensitivity })); } catch {}
  }, [voiceMode, sensitivity]);

  // Load threads
  useEffect(() => {
    supabase.from("ai_threads").select("id,title,updated_at,is_private").order("updated_at", { ascending: false })
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

  const voice = useKicksVoice({
    enabled: voiceOn,
    mode: voiceMode,
    sensitivity,
    onCommand: async (text) => {
      if (status === "submitted" || status === "streaming") return;
      toast(`Kicks heard: "${text}"`);
      await sendMessage({ text });
    },
  });

  // Speak the latest assistant message when streaming finishes
  useEffect(() => {
    if (!voiceOn) return;
    if (status !== "ready") return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    if (lastSpokenRef.current === last.id) return;
    const text = (last.parts ?? [])
      .map((p: any) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
    if (text) {
      lastSpokenRef.current = last.id;
      voice.speak(text);
    }
  }, [messages, status, voiceOn, voice]);

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
    const { data } = await supabase.from("ai_threads").insert({ user_id: user.user.id, title: "New conversation" }).select("id,title,updated_at,is_private").single();
    if (data) { setThreads((t) => [data as Thread, ...t]); navigate(`/admin/ai/${data.id}`); }
  }

  async function deleteThread(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await supabase.from("ai_threads").delete().eq("id", id);
    setThreads((t) => t.filter((x) => x.id !== id));
    if (id === threadId) navigate("/admin/ai");
  }

  const activeThread = threads.find((t) => t.id === threadId);
  async function togglePrivacy() {
    if (!activeThread) return;
    const next = !activeThread.is_private;
    const { error } = await supabase.from("ai_threads").update({ is_private: next }).eq("id", activeThread.id);
    if (error) { toast.error(error.message); return; }
    setThreads((ts) => ts.map((t) => t.id === activeThread.id ? { ...t, is_private: next } : t));
    toast.success(next ? "Conversation marked private — excluded from transcripts." : "Conversation is no longer private.");
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
                <span className="flex-1 truncate flex items-center gap-1.5">
                  {t.is_private && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <span className="truncate">{t.title}</span>
                </span>
                <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col border rounded-lg bg-card min-w-0">
        <div className="border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-display">Kicks</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">— your shop AI</span>
            {activeThread?.is_private && (
              <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" /> Private</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {voiceOn && voiceMode === "wake" && voice.heardWake && <Badge variant="secondary" className="animate-pulse">Listening for command…</Badge>}
            {voiceOn && voiceMode === "wake" && voice.listening && !voice.heardWake && <Badge variant="outline" className="text-[10px]">Say "Hey Kicks"</Badge>}
            {voiceOn && voiceMode === "push" && voice.pushActive && <Badge variant="secondary" className="animate-pulse">Recording…</Badge>}
            {voiceOn && voiceMode === "push" && !voice.pushActive && <Badge variant="outline" className="text-[10px]">Hold to talk</Badge>}
            <Button asChild size="sm" variant="ghost" title="Search transcripts">
              <Link to="/admin/ai/transcripts"><Search className="h-4 w-4" /></Link>
            </Button>
            {activeThread && (
              <Button
                size="sm"
                variant={activeThread.is_private ? "default" : "outline"}
                onClick={togglePrivacy}
                title={activeThread.is_private ? "Private — excluded from transcripts" : "Mark conversation private"}
              >
                {activeThread.is_private ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">{activeThread.is_private ? "Private" : "Private off"}</span>
              </Button>
            )}
            {voiceOn && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" title="Voice settings"><Settings2 className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Mode</Label>
                    <RadioGroup value={voiceMode} onValueChange={(v) => setVoiceMode(v as VoiceMode)} className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="wake" id="vm-wake" className="mt-0.5" />
                        <Label htmlFor="vm-wake" className="font-normal cursor-pointer">
                          <div className="text-sm flex items-center gap-1.5"><Radio className="h-3 w-3" /> Continuous (wake word)</div>
                          <div className="text-xs text-muted-foreground">Always listening for "Hey Kicks".</div>
                        </Label>
                      </div>
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="push" id="vm-push" className="mt-0.5" />
                        <Label htmlFor="vm-push" className="font-normal cursor-pointer">
                          <div className="text-sm flex items-center gap-1.5"><Mic className="h-3 w-3" /> Push-to-talk</div>
                          <div className="text-xs text-muted-foreground">Mic only opens while you hold the button.</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Wake-word sensitivity</Label>
                    <RadioGroup value={sensitivity} onValueChange={(v) => setSensitivity(v as WakeSensitivity)} className="space-y-1.5">
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="strict" id="ws-strict" className="mt-0.5" />
                        <Label htmlFor="ws-strict" className="font-normal cursor-pointer text-sm">Strict <span className="text-xs text-muted-foreground">— must say "Hey Kicks"</span></Label>
                      </div>
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="medium" id="ws-medium" className="mt-0.5" />
                        <Label htmlFor="ws-medium" className="font-normal cursor-pointer text-sm">Medium <span className="text-xs text-muted-foreground">— common variants</span></Label>
                      </div>
                      <div className="flex items-start gap-2">
                        <RadioGroupItem value="loose" id="ws-loose" className="mt-0.5" />
                        <Label htmlFor="ws-loose" className="font-normal cursor-pointer text-sm">Loose <span className="text-xs text-muted-foreground">— may trigger on similar words</span></Label>
                      </div>
                    </RadioGroup>
                    {voiceMode === "push" && (
                      <p className="text-[11px] text-muted-foreground">Sensitivity only applies in continuous mode.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              size="sm"
              variant={voiceOn ? "default" : "outline"}
              onClick={() => {
                if (!voiceSupported) { toast.error("Voice mode requires Chrome, Edge, or Safari."); return; }
                setVoiceOn((v) => !v);
              }}
              title={voiceOn ? "Voice mode on" : "Enable voice mode"}
            >
              {voiceOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">{voiceOn ? "Voice on" : "Voice"}</span>
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Hey, I'm Kicks 👟</p>
                <p className="text-sm">Ask me to draft product copy, review orders, suggest pricing, or scan competitors. Writes go to your approval inbox.</p>
                <p className="text-xs mt-2">Tip: turn on Voice and say <strong>"Hey Kicks"</strong> to talk hands-free.</p>
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
              placeholder={voiceOn ? (voiceMode === "wake" ? `Type or say "Hey Kicks…"` : "Type, or hold the mic to talk") : "Ask Kicks…"}
              rows={2}
              className="resize-none"
              disabled={busy}
            />
            {voiceOn && voiceMode === "push" && (
              <Button
                type="button"
                variant={voice.pushActive ? "default" : "outline"}
                onMouseDown={voice.pushStart}
                onMouseUp={voice.pushEnd}
                onMouseLeave={() => { if (voice.pushActive) voice.pushEnd(); }}
                onTouchStart={(e) => { e.preventDefault(); voice.pushStart(); }}
                onTouchEnd={(e) => { e.preventDefault(); voice.pushEnd(); }}
                title="Hold to talk"
                className={voice.pushActive ? "animate-pulse" : ""}
                disabled={busy}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
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
            const output = part.output;
            const card = renderToolOutput(name, output);
            if (card) {
              return (
                <div key={i} className="my-2 space-y-2">
                  {card}
                  <details className="rounded border bg-muted/40 text-xs">
                    <summary className="cursor-pointer px-2 py-1 flex items-center gap-1.5 text-muted-foreground"><Wrench className="h-3 w-3" /> {name} — raw</summary>
                    <pre className="px-2 pb-2 overflow-x-auto"><code>{JSON.stringify(part.input ?? part.output ?? part, null, 2)}</code></pre>
                  </details>
                </div>
              );
            }
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

function short(id?: string) { return id ? String(id).slice(0, 8) : ""; }

function renderToolOutput(name: string, output: any): JSX.Element | null {
  if (!output || typeof output !== "object") return null;

  if (output.error === "schema_mismatch") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" /> Schema mismatch on <code className="text-xs">{output.table}</code>
        </div>
        <div className="mt-1.5 text-xs">
          Missing column: <code className="bg-background px-1 rounded">{output.missing_column ?? "unknown"}</code>
        </div>
        {Array.isArray(output.expected_columns) && output.expected_columns.length > 0 && (
          <div className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Expected columns:</span> {output.expected_columns.join(", ")}
          </div>
        )}
        {output.detail && <div className="mt-1.5 text-[11px] text-muted-foreground font-mono break-all">{output.detail}</div>}
        <div className="mt-2 text-[11px] text-muted-foreground">A recent migration may have renamed or dropped that column. Update the AI tool's <code>select(...)</code> to match the live schema.</div>
      </div>
    );
  }

  if (output.kind === "products" && Array.isArray(output.products)) {
    return (
      <div className="rounded-lg border bg-card p-2 text-sm">
        <div className="flex items-center gap-1.5 px-1 py-1 text-xs text-muted-foreground"><Package className="h-3 w-3" /> {output.count} product{output.count === 1 ? "" : "s"}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left"><th className="px-2 py-1">ID</th><th className="px-2 py-1">Name</th><th className="px-2 py-1">Size</th><th className="px-2 py-1">Status</th><th className="px-2 py-1 text-right">Price</th></tr>
            </thead>
            <tbody>
              {output.products.map((p: any) => (
                <tr key={p.id} className="border-t"><td className="px-2 py-1 font-mono">{short(p.id)}</td><td className="px-2 py-1">{[p.brand, p.model || p.name].filter(Boolean).join(" ")}</td><td className="px-2 py-1">{p.size ?? "—"}</td><td className="px-2 py-1"><Badge variant="secondary" className="text-[10px]">{p.status}</Badge></td><td className="px-2 py-1 text-right font-medium">{p.price_formatted ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (output.kind === "orders" && Array.isArray(output.orders)) {
    return (
      <div className="rounded-lg border bg-card p-2 text-sm">
        <div className="flex items-center gap-1.5 px-1 py-1 text-xs text-muted-foreground"><ShoppingBag className="h-3 w-3" /> {output.count} order{output.count === 1 ? "" : "s"}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left"><th className="px-2 py-1">ID</th><th className="px-2 py-1">Customer</th><th className="px-2 py-1">Status</th><th className="px-2 py-1">Promo</th><th className="px-2 py-1 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {output.orders.map((o: any) => (
                <tr key={o.id} className="border-t"><td className="px-2 py-1 font-mono">{short(o.id)}</td><td className="px-2 py-1">{o.customer ?? "—"}</td><td className="px-2 py-1"><Badge variant="secondary" className="text-[10px]">{o.status}</Badge></td><td className="px-2 py-1">{o.promo_code ?? "—"}</td><td className="px-2 py-1 text-right font-medium">{o.amount_formatted ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (output.kind === "jobs" && Array.isArray(output.jobs)) {
    return (
      <div className="rounded-lg border bg-card p-2 text-sm">
        <div className="flex items-center gap-1.5 px-1 py-1 text-xs text-muted-foreground"><Hammer className="h-3 w-3" /> {output.count} job{output.count === 1 ? "" : "s"}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left"><th className="px-2 py-1">ID</th><th className="px-2 py-1">Shoe</th><th className="px-2 py-1">Status</th><th className="px-2 py-1">Payment</th><th className="px-2 py-1 text-right">Quoted</th></tr>
            </thead>
            <tbody>
              {output.jobs.map((j: any) => (
                <tr key={j.id} className="border-t"><td className="px-2 py-1 font-mono">{short(j.id)}</td><td className="px-2 py-1">{j.shoe ?? "—"}</td><td className="px-2 py-1"><Badge variant="secondary" className="text-[10px]">{j.status}</Badge></td><td className="px-2 py-1">{j.payment_status ?? "—"}</td><td className="px-2 py-1 text-right font-medium">{j.quoted_price_formatted ?? "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}