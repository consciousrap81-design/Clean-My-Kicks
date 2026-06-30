CREATE TYPE public.hero_slide_status AS ENUM ('draft', 'published', 'archived');

CREATE TABLE public.hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  eyebrow TEXT,
  cta_label TEXT,
  cta_href TEXT,
  image_url TEXT,
  image_alt TEXT,
  status public.hero_slide_status NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 100,
  promo_code TEXT REFERENCES public.shop_promo_codes(code) ON DELETE SET NULL,
  created_by_ai BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published slides are viewable by everyone"
  ON public.hero_slides FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert hero slides"
  ON public.hero_slides FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update hero slides"
  ON public.hero_slides FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete hero slides"
  ON public.hero_slides FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER hero_slides_set_updated_at
  BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX hero_slides_status_sort_idx ON public.hero_slides(status, sort_order);
CREATE INDEX hero_slides_promo_code_idx ON public.hero_slides(promo_code);