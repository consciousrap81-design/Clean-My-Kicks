import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type PreviewItem = {
  key: string;
  displayName: string;
  category: "auth" | "transactional";
  subject: string;
  from: string;
  replyTo: string | null;
  to: string;
  html: string;
  status: "ready" | "render_failed";
  errorMessage?: string;
};

function extractCta(html: string): { label: string; bg: string; color: string } | null {
  const m = html.match(/<a[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
  if (!m) return null;
  const style = m[1];
  const label = m[2].replace(/<[^>]+>/g, "").trim();
  const bg = /background(?:-color)?\s*:\s*([^;"]+)/i.exec(style)?.[1]?.trim() ?? "transparent";
  const color = /(?:^|;|\s)color\s*:\s*([^;"]+)/i.exec(style)?.[1]?.trim() ?? "#000";
  if (!label) return null;
  return { label, bg, color };
}

export default function EmailPreview() {
  const [items, setItems] = useState<PreviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("admin-email-preview", {
        method: "GET" as any,
      });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      const list = (data?.templates ?? []) as PreviewItem[];
      setItems(list);
      setSelectedKey(list[0]?.key ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(
    () => items?.find((i) => i.key === selectedKey) ?? null,
    [items, selectedKey],
  );

  if (error) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl mb-2">Email Preview</h1>
        <Card><CardContent className="p-4 text-destructive text-sm">{error}</CardContent></Card>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
      </div>
    );
  }

  const groups = {
    auth: items.filter((i) => i.category === "auth"),
    transactional: items.filter((i) => i.category === "transactional"),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" /> Email Preview
        </h1>
        <p className="text-sm text-muted-foreground">
          Renders each template with sample data, using the current From / Reply-To / branding config.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Templates</CardTitle></CardHeader>
          <CardContent className="p-2">
            <Tabs defaultValue="auth" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="auth">Auth</TabsTrigger>
                <TabsTrigger value="transactional">App</TabsTrigger>
              </TabsList>
              {(["auth", "transactional"] as const).map((cat) => (
                <TabsContent key={cat} value={cat} className="mt-2 space-y-1">
                  {groups[cat].map((t) => (
                    <Button
                      key={t.key}
                      variant={t.key === selectedKey ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start capitalize"
                      onClick={() => setSelectedKey(t.key)}
                    >
                      {t.displayName}
                      {t.status === "render_failed" && (
                        <Badge variant="destructive" className="ml-auto">err</Badge>
                      )}
                    </Button>
                  ))}
                  {groups[cat].length === 0 && (
                    <div className="text-xs text-muted-foreground p-2">None.</div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {selected && <PreviewPane item={selected} />}
      </div>
    </div>
  );
}

function PreviewPane({ item }: { item: PreviewItem }) {
  const cta = item.status === "ready" ? extractCta(item.html) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base capitalize">{item.displayName}</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5">
              <Badge variant="outline" className="mr-2">{item.category}</Badge>
              <code>{item.key}</code>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[90px_1fr] gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Subject</dt>
          <dd className="font-medium">{item.subject || <em className="text-muted-foreground">—</em>}</dd>
          <dt className="text-muted-foreground">From</dt>
          <dd className="font-mono text-xs break-all">{item.from}</dd>
          <dt className="text-muted-foreground">Reply-To</dt>
          <dd className="font-mono text-xs break-all">
            {item.replyTo ?? <span className="text-muted-foreground italic">not set (replies go to From)</span>}
          </dd>
          <dt className="text-muted-foreground">To</dt>
          <dd className="font-mono text-xs break-all">{item.to}</dd>
          <dt className="text-muted-foreground">CTA</dt>
          <dd>
            {cta ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center rounded px-3 py-1.5 text-xs font-medium"
                  style={{ backgroundColor: cta.bg, color: cta.color }}
                >
                  {cta.label}
                </span>
                <code className="text-[10px] text-muted-foreground">bg {cta.bg} · text {cta.color}</code>
              </div>
            ) : (
              <span className="text-muted-foreground italic text-xs">no button detected</span>
            )}
          </dd>
        </dl>

        {item.status === "render_failed" ? (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            Render failed: {item.errorMessage}
          </div>
        ) : (
          <div className="rounded border overflow-hidden bg-white">
            <iframe
              title={`${item.key} preview`}
              srcDoc={item.html}
              className="w-full h-[640px] bg-white"
              sandbox=""
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}