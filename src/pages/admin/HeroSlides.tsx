import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Sparkles, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

type Slide = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  image_alt: string | null;
  status: "draft" | "published" | "archived";
  sort_order: number;
  promo_code: string | null;
  created_by_ai: boolean;
  published_at: string | null;
  created_at: string;
};

export default function HeroSlides() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Slide | null>(null);

  const { data: slides } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_slides")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Slide[];
    },
  });

  async function update(id: string, patch: Partial<Slide>) {
    const { error } = await supabase.from("hero_slides").update(patch as any).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
  }

  async function publish(s: Slide) {
    await update(s.id, { status: "published", published_at: new Date().toISOString() } as any);
    toast.success(`Published: ${s.title}`);
  }
  async function unpublish(s: Slide) {
    await update(s.id, { status: "draft" } as any);
    toast.success("Moved back to draft");
  }
  async function archive(s: Slide) {
    if (!confirm("Archive this slide? It won't appear on the homepage.")) return;
    await update(s.id, { status: "archived" } as any);
  }
  async function del(s: Slide) {
    if (!confirm("Permanently delete this slide?")) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    toast.success("Deleted");
  }
  async function reorder(s: Slide, dir: -1 | 1) {
    await update(s.id, { sort_order: Math.max(0, s.sort_order + dir * 10) } as any);
  }

  async function saveEdit() {
    if (!editing) return;
    const { error } = await supabase
      .from("hero_slides")
      .update({
        title: editing.title,
        subtitle: editing.subtitle,
        eyebrow: editing.eyebrow,
        cta_label: editing.cta_label,
        cta_href: editing.cta_href,
        image_alt: editing.image_alt,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    setEditing(null);
    toast.success("Saved");
  }

  const drafts = (slides ?? []).filter((s) => s.status === "draft");
  const published = (slides ?? []).filter((s) => s.status === "published");
  const archived = (slides ?? []).filter((s) => s.status === "archived");

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Hero Slides</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Slides shown in the rotating homepage hero. New AI-generated promo slides land here as drafts —
          review, then publish.
        </p>
      </div>

      <Section title="Drafts (awaiting approval)" items={drafts} empty="No drafts. Kicks will drop new promo slides here after creating a promo code.">
        {(s) => (
          <SlideCard
            slide={s}
            onPublish={() => publish(s)}
            onEdit={() => setEditing(s)}
            onArchive={() => archive(s)}
            onDelete={() => del(s)}
            onUp={() => reorder(s, -1)}
            onDown={() => reorder(s, 1)}
          />
        )}
      </Section>

      <Section title="Published (live on the homepage)" items={published} empty="No live promo slides yet.">
        {(s) => (
          <SlideCard
            slide={s}
            onUnpublish={() => unpublish(s)}
            onEdit={() => setEditing(s)}
            onArchive={() => archive(s)}
            onDelete={() => del(s)}
            onUp={() => reorder(s, -1)}
            onDown={() => reorder(s, 1)}
          />
        )}
      </Section>

      {archived.length > 0 && (
        <Section title="Archived" items={archived} empty="">
          {(s) => (
            <SlideCard
              slide={s}
              onPublish={() => publish(s)}
              onEdit={() => setEditing(s)}
              onDelete={() => del(s)}
            />
          )}
        </Section>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit slide copy</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Eyebrow"><Input value={editing.eyebrow ?? ""} onChange={(e) => setEditing({ ...editing, eyebrow: e.target.value })} /></Field>
              <Field label="Title"><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Subtitle"><Textarea rows={3} value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA label"><Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} /></Field>
                <Field label="CTA link"><Input value={editing.cta_href ?? ""} onChange={(e) => setEditing({ ...editing, cta_href: e.target.value })} placeholder="/shop" /></Field>
              </div>
              <Field label="Image alt text"><Input value={editing.image_alt ?? ""} onChange={(e) => setEditing({ ...editing, image_alt: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section<T>({ title, items, empty, children }: { title: string; items: T[]; empty: string; children: (item: T) => React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm uppercase tracking-wider text-muted-foreground">{title} ({items.length})</h2>
      {items.length === 0 ? (
        empty ? <p className="text-sm text-muted-foreground border rounded-md p-4">{empty}</p> : null
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{items.map((it, i) => <div key={(it as any).id ?? i}>{children(it)}</div>)}</div>
      )}
    </div>
  );
}

function SlideCard({
  slide, onPublish, onUnpublish, onEdit, onArchive, onDelete, onUp, onDown,
}: {
  slide: Slide;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] bg-muted relative">
        {slide.image_url ? (
          <img src={slide.image_url} alt={slide.image_alt ?? slide.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant={slide.status === "published" ? "default" : "secondary"}>{slide.status}</Badge>
          {slide.created_by_ai && <Badge variant="outline" className="bg-background/80"><Sparkles className="w-3 h-3 mr-1" />AI</Badge>}
          {slide.promo_code && <Badge variant="outline" className="bg-background/80">{slide.promo_code}</Badge>}
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        {slide.eyebrow && <div className="text-[10px] uppercase tracking-widest text-primary">{slide.eyebrow}</div>}
        <div className="font-display text-lg leading-tight">{slide.title}</div>
        {slide.subtitle && <div className="text-sm text-muted-foreground line-clamp-2">{slide.subtitle}</div>}
        <div className="flex flex-wrap gap-1 pt-1">
          {onPublish && <Button size="sm" onClick={onPublish}><Eye className="w-3.5 h-3.5 mr-1" />Publish</Button>}
          {onUnpublish && <Button size="sm" variant="secondary" onClick={onUnpublish}><EyeOff className="w-3.5 h-3.5 mr-1" />Unpublish</Button>}
          {onEdit && <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>}
          {onUp && <Button size="sm" variant="ghost" onClick={onUp}><ArrowUp className="w-3.5 h-3.5" /></Button>}
          {onDown && <Button size="sm" variant="ghost" onClick={onDown}><ArrowDown className="w-3.5 h-3.5" /></Button>}
          {onArchive && <Button size="sm" variant="ghost" onClick={onArchive}>Archive</Button>}
          {onDelete && <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}