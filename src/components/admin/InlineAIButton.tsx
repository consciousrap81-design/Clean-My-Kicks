import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export default function InlineAIButton({ label = "AI", context, placeholder = "What should the AI do here?" }: {
  label?: string;
  context: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");

  async function run() {
    setBusy(true); setOutput("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [{ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: `${context}\n\nUser request: ${prompt}` }] }],
        }),
      });
      if (!res.ok || !res.body) { toast.error("Failed"); return; }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // naive extract text deltas (UI message stream)
        const lines = buf.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const j = JSON.parse(line.slice(5).trim());
            if (j.type === "text-delta" && j.delta) setOutput((o) => o + j.delta);
          } catch {}
        }
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5 mr-1" /> {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[420px] sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Admin AI</SheetTitle>
            <SheetDescription className="text-xs">Writes are proposed for approval; nothing changes until you apply.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={placeholder} rows={3} />
            <Button onClick={run} disabled={busy || !prompt.trim()} className="w-full">{busy ? "Working…" : "Run"}</Button>
            {output && (
              <div className="prose prose-sm dark:prose-invert max-w-none border rounded p-3 bg-muted/30">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}