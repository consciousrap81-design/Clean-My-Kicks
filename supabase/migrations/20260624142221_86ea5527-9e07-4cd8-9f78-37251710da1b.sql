
CREATE POLICY "Public can view shop product photos" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'shop-products');

CREATE POLICY "Admins upload shop product photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shop-products' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update shop product photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'shop-products' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete shop product photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'shop-products' AND public.has_role(auth.uid(), 'admin'));
