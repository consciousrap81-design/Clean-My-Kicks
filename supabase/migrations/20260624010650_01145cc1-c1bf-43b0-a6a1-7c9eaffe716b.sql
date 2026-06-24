
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'declined');

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  email text,
  phone text,
  service_requested text,
  shoe_brand text,
  shoe_model text,
  shoe_size text,
  drop_off_method text,
  notes text,
  photos text[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'Website',
  status public.request_status NOT NULL DEFAULT 'pending',
  quoted_price numeric NOT NULL DEFAULT 0,
  admin_notes text,
  converted_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage booking requests"
  ON public.booking_requests
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.booking_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
