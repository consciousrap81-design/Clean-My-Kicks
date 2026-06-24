CREATE POLICY "Anyone can submit booking requests"
ON public.booking_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND quoted_price = 0
  AND converted_job_id IS NULL
  AND admin_notes IS NULL
  AND source = 'Website'
);

GRANT INSERT ON public.booking_requests TO anon;