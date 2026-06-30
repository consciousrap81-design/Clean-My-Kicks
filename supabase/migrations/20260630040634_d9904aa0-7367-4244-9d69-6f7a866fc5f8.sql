
CREATE TABLE public.ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES public.ai_suggestions(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES public.admin_reminders(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'social_post',
  platform TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  cta TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_drafts TO authenticated;
GRANT ALL ON public.ai_drafts TO service_role;

ALTER TABLE public.ai_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_drafts" ON public.ai_drafts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_drafts_updated_at
  BEFORE UPDATE ON public.ai_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ai_drafts_status ON public.ai_drafts(status, created_at DESC);
CREATE INDEX idx_ai_drafts_suggestion ON public.ai_drafts(suggestion_id);
