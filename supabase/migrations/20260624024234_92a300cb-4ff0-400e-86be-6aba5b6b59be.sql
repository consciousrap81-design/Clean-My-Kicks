
-- Restrict request-photos bucket to admins only
DROP POLICY IF EXISTS "request_photos_authenticated_read" ON storage.objects;
CREATE POLICY "request_photos_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'request-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "request_photos_authenticated_delete" ON storage.objects;
CREATE POLICY "request_photos_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'request-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Set search_path on functions and revoke public EXECUTE on internal SECURITY DEFINER helpers
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
