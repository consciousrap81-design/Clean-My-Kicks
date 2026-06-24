ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;