
CREATE TABLE public.ai_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES public.ai_suggestions(id) ON DELETE SET NULL,
  actor UUID,
  kind TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  before_state JSONB,
  after_state JSONB,
  undone BOOLEAN NOT NULL DEFAULT false,
  undone_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_change_history TO authenticated;
GRANT ALL ON public.ai_change_history TO service_role;
ALTER TABLE public.ai_change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_change_history" ON public.ai_change_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ai_change_history_created_at_idx ON public.ai_change_history (created_at DESC);
