ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS public_token text;
UPDATE public.booking_requests SET public_token = encode(gen_random_bytes(16),'hex') WHERE public_token IS NULL;
ALTER TABLE public.booking_requests ALTER COLUMN public_token SET NOT NULL, ALTER COLUMN public_token SET DEFAULT encode(gen_random_bytes(16),'hex');
CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_public_token_key ON public.booking_requests (public_token);