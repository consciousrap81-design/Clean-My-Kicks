
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.shop_review_status AS ENUM ('pending', 'approved', 'rejected', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reviews table
CREATE TABLE public.shop_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  reviewer_name TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  photo_path TEXT,
  status public.shop_review_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shop_reviews_title_len CHECK (title IS NULL OR char_length(title) <= 120),
  CONSTRAINT shop_reviews_body_len CHECK (char_length(body) BETWEEN 1 AND 4000),
  CONSTRAINT shop_reviews_unique_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX shop_reviews_product_status_idx ON public.shop_reviews (product_id, status);
CREATE INDEX shop_reviews_user_idx ON public.shop_reviews (user_id);
CREATE INDEX shop_reviews_status_created_idx ON public.shop_reviews (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.shop_reviews TO authenticated;
GRANT SELECT ON public.shop_reviews TO anon;
GRANT ALL ON public.shop_reviews TO service_role;

ALTER TABLE public.shop_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.shop_reviews FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Users can view their own reviews (any status)
CREATE POLICY "Users can view own reviews"
ON public.shop_reviews FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins see everything
CREATE POLICY "Admins can view all reviews"
ON public.shop_reviews FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users insert their own row (eligibility enforced in edge function)
CREATE POLICY "Users can submit own reviews"
ON public.shop_reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Users can edit their own reviews while still pending
CREATE POLICY "Users can edit own pending reviews"
ON public.shop_reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending')
WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can update any review (for moderation)
CREATE POLICY "Admins can update reviews"
ON public.shop_reviews FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_updated_at_shop_reviews
BEFORE UPDATE ON public.shop_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Track when the review-request email was sent (one-shot per order)
ALTER TABLE public.shop_orders
ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;

-- ============ Storage RLS for shop-review-photos =============
-- Customers can upload/manage their own photos under "<auth.uid()>/..."
CREATE POLICY "Users upload own review photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-review-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users read own review photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'shop-review-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users update own review photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-review-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own review photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-review-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins read all review photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'shop-review-photos'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins delete review photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-review-photos'
  AND public.has_role(auth.uid(), 'admin')
);
