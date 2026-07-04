CREATE POLICY "Public can view active accessory photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'shop-products'
  AND EXISTS (
    SELECT 1 FROM public.shop_accessory_photos sap
    JOIN public.shop_accessories sa ON sa.id = sap.accessory_id
    WHERE sap.storage_path = storage.objects.name
      AND sa.active = true
  )
);

CREATE POLICY "Admins view all accessory photos in shop-products"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'shop-products'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);