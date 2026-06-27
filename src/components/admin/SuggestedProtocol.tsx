import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, AlertTriangle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  material?: string | null;
  guideId?: string | null;
  onApplyGuide?: (guideId: string) => void;
};

export function SuggestedProtocol({ material, guideId, onApplyGuide }: Props) {
  const { data: guide, isLoading } = useQuery({
    queryKey: ["suggested-protocol", guideId, material],
    enabled: !!(guideId || material),
    queryFn: async () => {
      if (guideId) {
        const { data } = await supabase.from("cleaning_guides").select("*").eq("id", guideId).maybeSingle();
        if (data) return data;
      }
      if (material) {
        const { data } = await supabase
          .from("cleaning_guides")
          .select("*")
          .ilike("material", material)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        return data;
      }
      return null;
    },
  });

  if (!material && !guideId) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Suggested Protocol{material ? ` — ${material}` : ""}
        </CardTitle>
        {guide && (
          <Link to={`/admin/cleaning-guides?guide=${guide.id}`}>
            <Button size="sm" variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" /> Full guide
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <div className="text-muted-foreground">Looking up protocol…</div>
        ) : !guide ? (
          <div className="text-muted-foreground">
            No protocol found for "{material}". <Link to="/admin/cleaning-guides" className="underline">Add one</Link>.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{guide.title}</span>
              {guide.brush_stiffness && <Badge variant="outline">Brush: {guide.brush_stiffness}</Badge>}
              {guide.estimated_minutes != null && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" /> ~{guide.estimated_minutes} min
                </Badge>
              )}
              {onApplyGuide && guide.id !== guideId && (
                <Button size="sm" variant="secondary" className="ml-auto" onClick={() => onApplyGuide(guide.id)}>
                  Apply to job
                </Button>
              )}
            </div>
            {guide.summary && <p className="text-muted-foreground">{guide.summary}</p>}
            {Array.isArray(guide.recommended_chemicals) && guide.recommended_chemicals.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Chemicals</div>
                <ul className="space-y-0.5">
                  {(guide.recommended_chemicals as any[]).map((c, i) => (
                    <li key={i} className="text-xs">
                      <span className="font-medium">{c.name}</span>
                      {c.purpose && <span className="text-muted-foreground"> · {c.purpose}</span>}
                      {c.dilution && <span className="text-muted-foreground"> · {c.dilution}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(guide.steps) && guide.steps.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Steps</div>
                <ol className="space-y-1.5">
                  {(guide.steps as any[])
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((s, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <span className="font-mono text-muted-foreground shrink-0">{s.order ?? i + 1}.</span>
                        <div>
                          {s.title && <div className="font-medium">{s.title}</div>}
                          <div>{s.instruction}</div>
                          {s.caution && (
                            <div className="text-amber-700 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="h-3 w-3" /> {s.caution}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                </ol>
              </div>
            )}
            {guide.cautions && (
              <div className="text-xs flex items-start gap-1 text-amber-700">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {guide.cautions}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}