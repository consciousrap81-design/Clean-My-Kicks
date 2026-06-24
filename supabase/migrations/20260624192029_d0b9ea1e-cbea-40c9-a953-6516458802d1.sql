CREATE TABLE public.shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  status text,
  status_detail text,
  location text,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipment_events_shipment_id_occurred_at_idx
  ON public.shipment_events (shipment_id, occurred_at DESC);

GRANT SELECT ON public.shipment_events TO authenticated;
GRANT ALL ON public.shipment_events TO service_role;

ALTER TABLE public.shipment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shipment events"
  ON public.shipment_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));