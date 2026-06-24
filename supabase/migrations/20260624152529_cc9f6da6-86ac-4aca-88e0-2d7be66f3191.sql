
CREATE POLICY "Anyone reads photos of approved reviews"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'shop-review-photos'
  AND EXISTS (
    SELECT 1 FROM public.shop_reviews
    WHERE shop_reviews.status = 'approved'
      AND shop_reviews.photo_path = storage.objects.name
  )
);
