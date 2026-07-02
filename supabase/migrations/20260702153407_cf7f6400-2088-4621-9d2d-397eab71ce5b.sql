
DROP POLICY IF EXISTS "Public can view shop product photos" ON storage.objects;

CREATE POLICY "Public can view photos of live shop products"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'shop-products'
  AND EXISTS (
    SELECT 1
    FROM public.shop_product_photos ph
    JOIN public.shop_products p ON p.id = ph.product_id
    WHERE ph.storage_path = storage.objects.name
      AND p.status IN ('available','reserved','sold')
  )
);

CREATE POLICY "Admins view all shop product photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'shop-products'
  AND public.has_role(auth.uid(), 'admin')
);
