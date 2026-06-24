CREATE TABLE public.shop_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shop_order_events_order_id_created_at_idx
  ON public.shop_order_events(order_id, created_at DESC);

GRANT SELECT, INSERT ON public.shop_order_events TO authenticated;
GRANT ALL ON public.shop_order_events TO service_role;

ALTER TABLE public.shop_order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all order events"
  ON public.shop_order_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers view own order events"
  ON public.shop_order_events
  FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.shop_orders WHERE user_id = auth.uid())
  );