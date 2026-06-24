
-- 1. Extend request_status enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'awaiting_photos';

-- 2. Storage policies on request-photos bucket
-- Anyone (anon or authenticated) may upload to request-photos. We rely on
-- application-level validation for size/type; the bucket is private so URLs
-- are only resolvable via signed URLs.
DROP POLICY IF EXISTS "request_photos_public_insert" ON storage.objects;
CREATE POLICY "request_photos_public_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'request-photos');

-- Admins (authenticated users) may read & delete request photos.
DROP POLICY IF EXISTS "request_photos_authenticated_read" ON storage.objects;
CREATE POLICY "request_photos_authenticated_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-photos');

DROP POLICY IF EXISTS "request_photos_authenticated_delete" ON storage.objects;
CREATE POLICY "request_photos_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'request-photos');
