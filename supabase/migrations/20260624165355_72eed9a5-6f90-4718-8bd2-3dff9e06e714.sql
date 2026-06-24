
-- 1) Promo codes
CREATE TABLE public.shop_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  amount integer NOT NULL CHECK (amount > 0),
  min_subtotal_cents integer NOT NULL DEFAULT 0,
  max_redemptions integer,
  redemption_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  applies_to text NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','accessories','sneakers')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_promo_codes TO authenticated;
GRANT ALL ON public.shop_promo_codes TO service_role;

ALTER TABLE public.shop_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo codes"
ON public.shop_promo_codes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shop_promo_codes_set_updated_at
BEFORE UPDATE ON public.shop_promo_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shop_promo_codes_code_active_idx ON public.shop_promo_codes (code) WHERE active;

-- 2) Promo redemptions
CREATE TABLE public.shop_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.shop_promo_codes(id) ON DELETE CASCADE,
  cart_id uuid,
  order_id uuid,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.shop_promo_redemptions TO service_role;
GRANT SELECT ON public.shop_promo_redemptions TO authenticated;

ALTER TABLE public.shop_promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view redemptions"
ON public.shop_promo_redemptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX shop_promo_redemptions_promo_idx ON public.shop_promo_redemptions(promo_id);
CREATE INDEX shop_promo_redemptions_order_idx ON public.shop_promo_redemptions(order_id);

-- 3) Cart promo column
ALTER TABLE public.shop_carts
  ADD COLUMN IF NOT EXISTS applied_promo_code text;

-- 4) Order discount columns
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_code text;

-- 5) Realtime for accessory stock
ALTER TABLE public.shop_accessory_variants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_accessory_variants;
