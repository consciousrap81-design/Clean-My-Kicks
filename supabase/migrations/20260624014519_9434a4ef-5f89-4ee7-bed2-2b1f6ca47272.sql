
-- Quote status enum
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired');

-- Quotes table
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  shoe_brand text,
  shoe_model text,
  service_recommended text,
  quote_amount numeric NOT NULL DEFAULT 0,
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  expires_at timestamptz,
  status public.quote_status NOT NULL DEFAULT 'draft',
  public_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  sent_at timestamptz,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  responded_at timestamptz,
  customer_response text,
  photos text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_request_id ON public.quotes(request_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_public_token ON public.quotes(public_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Admins can manage all quotes
CREATE POLICY "Admins manage quotes" ON public.quotes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_quotes
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add accepted_quote_id to booking_requests to gate approval
ALTER TABLE public.booking_requests
  ADD COLUMN accepted_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;
