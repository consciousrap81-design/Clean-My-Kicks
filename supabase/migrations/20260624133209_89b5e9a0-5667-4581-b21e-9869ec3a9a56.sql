
-- 1. Allow authenticated/anon to read active services
CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
TO anon, authenticated
USING (active = true);

GRANT SELECT ON public.services TO anon, authenticated;

-- 2. Allow customers to read their own job photo storage objects
CREATE POLICY "Customers can read their own job photos in storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'job-photos'
  AND EXISTS (
    SELECT 1
    FROM public.job_photos jp
    JOIN public.jobs j ON j.id = jp.job_id
    WHERE jp.url LIKE '%' || storage.objects.name
      AND jp.customer_visible = true
      AND j.user_id = auth.uid()
  )
);

-- 3. Revoke EXECUTE on SECURITY DEFINER functions that should not be callable
-- by signed-in users (these are for edge functions / service_role only).
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_customer_user(text, uuid) FROM PUBLIC, anon, authenticated;
