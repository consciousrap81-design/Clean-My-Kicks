
CREATE TABLE public.cleaning_guide_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.cleaning_guides(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create','update')),
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  changed_by UUID REFERENCES auth.users(id),
  change_note TEXT,
  material TEXT,
  title TEXT,
  summary TEXT,
  recommended_chemicals JSONB,
  brush_stiffness TEXT,
  tools JSONB,
  steps JSONB,
  cautions TEXT,
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cleaning_guide_versions_guide_idx ON public.cleaning_guide_versions (guide_id, version DESC);

GRANT SELECT, INSERT ON public.cleaning_guide_versions TO authenticated;
GRANT ALL ON public.cleaning_guide_versions TO service_role;

ALTER TABLE public.cleaning_guide_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read guide versions"
  ON public.cleaning_guide_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert guide versions"
  ON public.cleaning_guide_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_cleaning_guide_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
  diff TEXT[] := '{}';
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM public.cleaning_guide_versions WHERE guide_id = NEW.id;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.material IS DISTINCT FROM OLD.material THEN diff := diff || 'material'; END IF;
    IF NEW.title IS DISTINCT FROM OLD.title THEN diff := diff || 'title'; END IF;
    IF NEW.summary IS DISTINCT FROM OLD.summary THEN diff := diff || 'summary'; END IF;
    IF NEW.recommended_chemicals IS DISTINCT FROM OLD.recommended_chemicals THEN diff := diff || 'recommended_chemicals'; END IF;
    IF NEW.brush_stiffness IS DISTINCT FROM OLD.brush_stiffness THEN diff := diff || 'brush_stiffness'; END IF;
    IF NEW.tools IS DISTINCT FROM OLD.tools THEN diff := diff || 'tools'; END IF;
    IF NEW.steps IS DISTINCT FROM OLD.steps THEN diff := diff || 'steps'; END IF;
    IF NEW.cautions IS DISTINCT FROM OLD.cautions THEN diff := diff || 'cautions'; END IF;
    IF NEW.estimated_minutes IS DISTINCT FROM OLD.estimated_minutes THEN diff := diff || 'estimated_minutes'; END IF;
    IF array_length(diff, 1) IS NULL THEN RETURN NEW; END IF;
  END IF;

  INSERT INTO public.cleaning_guide_versions (
    guide_id, version, change_type, changed_fields, changed_by,
    material, title, summary, recommended_chemicals, brush_stiffness,
    tools, steps, cautions, estimated_minutes
  ) VALUES (
    NEW.id, next_version,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
    diff, auth.uid(),
    NEW.material, NEW.title, NEW.summary, NEW.recommended_chemicals, NEW.brush_stiffness,
    NEW.tools, NEW.steps, NEW.cautions, NEW.estimated_minutes
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cleaning_guides_versioning ON public.cleaning_guides;
CREATE TRIGGER cleaning_guides_versioning
  AFTER INSERT OR UPDATE ON public.cleaning_guides
  FOR EACH ROW EXECUTE FUNCTION public.record_cleaning_guide_version();

-- Seed initial version snapshot for any existing guides
INSERT INTO public.cleaning_guide_versions (
  guide_id, version, change_type, changed_fields,
  material, title, summary, recommended_chemicals, brush_stiffness,
  tools, steps, cautions, estimated_minutes
)
SELECT g.id, 1, 'create', '{}'::text[],
  g.material, g.title, g.summary, g.recommended_chemicals, g.brush_stiffness,
  g.tools, g.steps, g.cautions, g.estimated_minutes
FROM public.cleaning_guides g
WHERE NOT EXISTS (
  SELECT 1 FROM public.cleaning_guide_versions v WHERE v.guide_id = g.id
);
