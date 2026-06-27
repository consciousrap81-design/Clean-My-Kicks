
CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  tone text NOT NULL DEFAULT 'professional',
  custom_instructions text NOT NULL DEFAULT '',
  forbidden_phrases text[] NOT NULL DEFAULT '{}',
  preferred_phrases text[] NOT NULL DEFAULT '{}',
  auto_apply_safe boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_settings" ON public.ai_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER ai_settings_updated_at BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.ai_settings (singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id uuid REFERENCES public.ai_suggestions(id) ON DELETE SET NULL,
  actor uuid,
  action text NOT NULL CHECK (action IN ('applied','dismissed','edited','undone')),
  kind text,
  reason text,
  suggestion_snapshot jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_feedback" ON public.ai_feedback FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX ai_feedback_created_idx ON public.ai_feedback (created_at DESC);
CREATE INDEX ai_feedback_action_idx ON public.ai_feedback (action, kind);
