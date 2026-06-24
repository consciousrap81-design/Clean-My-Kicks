-- Mail-in fulfillment + shipments + admin reminders

-- 1. booking_requests additions
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'drop_off' CHECK (fulfillment_method IN ('drop_off','mail_in')),
  ADD COLUMN IF NOT EXISTS ship_from_address jsonb,
  ADD COLUMN IF NOT EXISTS shipping_quote_cents integer;

-- 2. shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  carrier text,
  service text,
  tracking_number text,
  tracking_url text,
  label_url text,
  shippo_transaction_id text,
  rate_cents integer,
  status text NOT NULL DEFAULT 'created',
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shipments"
  ON public.shipments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS shipments_request_id_idx ON public.shipments(request_id);
CREATE INDEX IF NOT EXISTS shipments_tracking_idx ON public.shipments(tracking_number);

CREATE TRIGGER shipments_set_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. admin_reminders table
CREATE TABLE IF NOT EXISTS public.admin_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  body text,
  due_at timestamptz NOT NULL,
  repeat_days integer,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_reminders TO authenticated;
GRANT ALL ON public.admin_reminders TO service_role;

ALTER TABLE public.admin_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reminders"
  ON public.admin_reminders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_reminders_set_updated_at
  BEFORE UPDATE ON public.admin_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Seed international mail-in reminder (re-surfaces every 14 days)
INSERT INTO public.admin_reminders (key, title, body, due_at, repeat_days)
VALUES (
  'international_mail_in',
  'Revisit international mail-in shipping',
  'International mail-in was postponed at launch. Re-evaluate demand and add support if customers are asking for it.',
  now() + interval '14 days',
  14
)
ON CONFLICT (key) DO NOTHING;
