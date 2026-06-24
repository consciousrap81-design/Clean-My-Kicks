
-- 1. Add 'customer' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';

-- 2. user_id columns to link records to auth users
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_user_id ON public.booking_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON public.customers (lower(email));
CREATE INDEX IF NOT EXISTS idx_quotes_email_lower ON public.quotes (lower(customer_email));
CREATE INDEX IF NOT EXISTS idx_booking_requests_email_lower ON public.booking_requests (lower(email));

-- 3. Quote deposit configuration
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS allow_deposit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'unpaid';

-- 4. Payments: extend with Stripe + kind/status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_kind') THEN
    CREATE TYPE public.payment_kind AS ENUM ('deposit','full','balance','manual');
  END IF;
END $$;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'succeeded',
  ADD COLUMN IF NOT EXISTS kind public.payment_kind NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd';

-- job_id was NOT NULL; relax so we can record quote payments before job exists
ALTER TABLE public.payments ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN paid_at SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_uniq ON public.payments(stripe_session_id) WHERE stripe_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments(quote_id);

-- 5. Customer-visible flag on photos
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS customer_visible boolean NOT NULL DEFAULT true;

-- 6. job_updates table for the customer timeline
CREATE TABLE IF NOT EXISTS public.job_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid,
  body text NOT NULL,
  customer_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_updates TO authenticated;
GRANT ALL ON public.job_updates TO service_role;
ALTER TABLE public.job_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage job_updates"
  ON public.job_updates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Customers read their visible job_updates"
  ON public.job_updates FOR SELECT TO authenticated
  USING (
    customer_visible = true
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_updates.job_id AND j.user_id = auth.uid())
  );

CREATE TRIGGER trg_job_updates_updated_at
  BEFORE UPDATE ON public.job_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Customer RLS on the existing tables (admin policies already exist)
CREATE POLICY "Customers read own customer row"
  ON public.customers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Customers read own quotes"
  ON public.quotes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Customers read own jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Customers read own requests"
  ON public.booking_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Customers read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Customers read own job photos"
  ON public.job_photos FOR SELECT TO authenticated
  USING (
    customer_visible = true
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_photos.job_id AND j.user_id = auth.uid())
  );

-- 8. Link helper: attach a user to all records that match by email
CREATE OR REPLACE FUNCTION public.link_customer_user(_email text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE e text := lower(_email);
BEGIN
  UPDATE public.customers SET user_id = _user_id WHERE lower(email) = e AND user_id IS NULL;
  UPDATE public.quotes SET user_id = _user_id WHERE lower(customer_email) = e AND user_id IS NULL;
  UPDATE public.booking_requests SET user_id = _user_id WHERE lower(email) = e AND user_id IS NULL;
  UPDATE public.jobs SET user_id = _user_id
    WHERE user_id IS NULL
      AND customer_id IN (SELECT id FROM public.customers WHERE lower(email) = e);
  UPDATE public.payments SET user_id = _user_id
    WHERE user_id IS NULL
      AND (
        customer_id IN (SELECT id FROM public.customers WHERE lower(email) = e)
        OR quote_id IN (SELECT id FROM public.quotes WHERE lower(customer_email) = e)
      );
END $$;

REVOKE ALL ON FUNCTION public.link_customer_user(text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_customer_user(text, uuid) TO service_role;
