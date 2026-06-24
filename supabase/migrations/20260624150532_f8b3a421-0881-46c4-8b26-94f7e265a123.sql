
CREATE TABLE public.shop_abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  reserved_session_id TEXT,
  recovery_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  customer_email TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  first_email_sent_at TIMESTAMPTZ,
  first_email_message_id TEXT,
  second_email_sent_at TIMESTAMPTZ,
  second_email_message_id TEXT,
  recovered_at TIMESTAMPTZ,
  last_recovery_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shop_abandoned_carts_status_created_idx ON public.shop_abandoned_carts (status, created_at);
CREATE INDEX shop_abandoned_carts_session_idx ON public.shop_abandoned_carts (stripe_session_id);
CREATE INDEX shop_abandoned_carts_product_idx ON public.shop_abandoned_carts (product_id);

GRANT SELECT ON public.shop_abandoned_carts TO authenticated;
GRANT ALL ON public.shop_abandoned_carts TO service_role;

ALTER TABLE public.shop_abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view abandoned carts"
ON public.shop_abandoned_carts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_shop_abandoned_carts
BEFORE UPDATE ON public.shop_abandoned_carts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
