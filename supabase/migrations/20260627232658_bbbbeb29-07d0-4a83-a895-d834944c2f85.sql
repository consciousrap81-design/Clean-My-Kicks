
-- Cleaning guides table for material-based restoration protocols
CREATE TABLE public.cleaning_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material TEXT NOT NULL, -- 'Suede', 'Leather', 'Mesh', 'Canvas', 'Knit', 'Patent', 'Nubuck', etc.
  title TEXT NOT NULL,
  summary TEXT,
  recommended_chemicals JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, purpose, dilution}]
  brush_stiffness TEXT, -- 'soft', 'medium', 'stiff', 'horsehair', etc.
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{order, title, instruction, caution}]
  cautions TEXT,
  estimated_minutes INTEGER,
  source TEXT, -- 'admin' | 'kicks_ai' | 'import'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cleaning_guides_material_idx ON public.cleaning_guides (lower(material));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_guides TO authenticated;
GRANT ALL ON public.cleaning_guides TO service_role;

ALTER TABLE public.cleaning_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cleaning guides"
  ON public.cleaning_guides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER cleaning_guides_set_updated_at
  BEFORE UPDATE ON public.cleaning_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link jobs to a primary material + optional guide reference for quick lookup
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS shoe_material TEXT,
  ADD COLUMN IF NOT EXISTS cleaning_guide_id UUID REFERENCES public.cleaning_guides(id) ON DELETE SET NULL;

-- Seed starter guides for the three core materials
INSERT INTO public.cleaning_guides (material, title, summary, recommended_chemicals, brush_stiffness, tools, steps, cautions, estimated_minutes, source)
VALUES
('Suede',
 'Suede Restoration Protocol',
 'Dry-first approach for suede and nubuck uppers — never saturate.',
 '[{"name":"Crep Protect Suede & Nubuck Cleaner","purpose":"spot cleaning","dilution":"undiluted"},{"name":"Distilled water","purpose":"light misting","dilution":"as needed"}]'::jsonb,
 'soft',
 '["Suede eraser","Soft horsehair brush","Microfiber towel","Suede block"]'::jsonb,
 '[{"order":1,"title":"Dry brush","instruction":"Brush nap in one direction with a soft horsehair brush to lift loose dirt.","caution":"Do not scrub"},{"order":2,"title":"Eraser pass","instruction":"Use suede eraser on scuffs and stains with light pressure.","caution":null},{"order":3,"title":"Targeted foam","instruction":"Apply suede cleaner foam to a soft brush, agitate stain area only.","caution":"Avoid soaking the panel"},{"order":4,"title":"Dry & restore nap","instruction":"Blot with microfiber, air dry 24h, then re-brush nap.","caution":"No direct heat"}]'::jsonb,
 'Never submerge. Heat and over-saturation will permanently darken suede.',
 45,
 'admin'),
('Leather',
 'Smooth Leather Cleaning Protocol',
 'Gentle pH-balanced cleaning followed by conditioning to preserve finish.',
 '[{"name":"Reshoevn8r leather cleaner","purpose":"general cleaning","dilution":"1:4 with water"},{"name":"Leather conditioner","purpose":"post-clean restoration","dilution":"undiluted"}]'::jsonb,
 'medium',
 '["Medium bristle brush","Microfiber towels","Cotton applicator"]'::jsonb,
 '[{"order":1,"title":"Wipe down","instruction":"Remove surface dust with a dry microfiber.","caution":null},{"order":2,"title":"Cleaner application","instruction":"Mist diluted cleaner onto brush, work in circular motions.","caution":"Do not let liquid pool in stitching"},{"order":3,"title":"Wipe & dry","instruction":"Wipe residue with damp microfiber, air dry away from heat.","caution":null},{"order":4,"title":"Condition","instruction":"Apply thin coat of conditioner, buff after 10 minutes.","caution":"Test on hidden area first"}]'::jsonb,
 'Avoid alcohol-based cleaners on painted/patent leather.',
 35,
 'admin'),
('Mesh',
 'Mesh & Knit Upper Protocol',
 'Foam-forward cleaning to lift dirt from open weaves without warping.',
 '[{"name":"Jason Markk Premium cleaner","purpose":"foam cleaning","dilution":"few drops in water"},{"name":"Oxygen-based brightener","purpose":"midsole/heavy stains","dilution":"per label"}]'::jsonb,
 'soft',
 '["Soft bristle brush","Two-bucket setup","Microfiber towels","Shoe trees"]'::jsonb,
 '[{"order":1,"title":"Remove laces & insoles","instruction":"Set aside for separate cleaning.","caution":null},{"order":2,"title":"Foam up","instruction":"Whip cleaner into rich foam, apply to upper with soft brush.","caution":"Use foam, not heavy water"},{"order":3,"title":"Light scrub","instruction":"Work in small circles across the mesh, refresh foam often.","caution":"Avoid stretching the knit"},{"order":4,"title":"Rinse & shape","instruction":"Wipe with clean damp microfiber, insert shoe trees, air dry 24h.","caution":"No dryer or direct sun"}]'::jsonb,
 'Knit uppers (Flyknit, Primeknit) can fuzz if over-brushed — keep strokes light.',
 40,
 'admin');
