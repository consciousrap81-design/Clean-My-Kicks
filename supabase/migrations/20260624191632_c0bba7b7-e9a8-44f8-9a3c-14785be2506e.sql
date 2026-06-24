ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS tracking_status_detail text,
  ADD COLUMN IF NOT EXISTS eta timestamptz;