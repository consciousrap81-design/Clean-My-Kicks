CREATE TABLE public.shop_product_before_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shop_product_before_photos_product_idx ON public.shop_product_before_photos(product_id, sort_order);
GRANT SELECT ON public.shop_product_before_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_product_before_photos TO authenticated;
GRANT ALL ON public.shop_product_before_photos TO service_role;
ALTER TABLE public.shop_product_before_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view before photos of live products" ON public.shop_product_before_photos
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.shop_products p WHERE p.id = product_id AND p.status IN ('available','reserved','sold')));

CREATE POLICY "Admins manage before photos" ON public.shop_product_before_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));