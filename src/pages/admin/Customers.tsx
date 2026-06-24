import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export default function Customers() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, jobs(id), lead_source:lead_sources(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-customers-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-display tracking-wide">Customers</h1>
      {isLoading ? <div className="text-muted-foreground">Loading…</div> : (data || []).length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No customers yet.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {data!.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.phone || "—"} · {c.email || "—"} {c.lead_source?.name && `· via ${c.lead_source.name}`}</div>
                </div>
                <div className="text-sm text-muted-foreground">{c.jobs?.length || 0} job(s)</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}