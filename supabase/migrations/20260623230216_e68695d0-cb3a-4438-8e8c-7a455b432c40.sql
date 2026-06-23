
CREATE POLICY "Admins read job photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'job-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert job photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'job-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update job photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'job-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete job photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'job-photos' AND public.has_role(auth.uid(),'admin'));
