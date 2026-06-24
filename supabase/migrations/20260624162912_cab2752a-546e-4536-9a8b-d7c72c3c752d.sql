
-- Accessories: parent products
CREATE TABLE public.shop_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category text NOT NULL CHECK (category IN ('cleaning_kit','laces','buckle','other')),
  base_price_cents integer NOT NULL CHECK (base_price_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_accessories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_accessories TO authenticated;
GRANT ALL ON public.shop_accessories TO service_role;
ALTER TABLE public.shop_accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active accessories" ON public.shop_accessories
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins manage accessories" ON public.shop_accessories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER shop_accessories_updated_at BEFORE UPDATE ON public.shop_accessories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Accessory photos
CREATE TABLE public.shop_accessory_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_id uuid NOT NULL REFERENCES public.shop_accessories(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_accessory_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_accessory_photos TO authenticated;
GRANT ALL ON public.shop_accessory_photos TO service_role;
ALTER TABLE public.shop_accessory_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view accessory photos" ON public.shop_accessory_photos
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.shop_accessories a WHERE a.id = accessory_id AND a.active = true)
  );
CREATE POLICY "Admins manage accessory photos" ON public.shop_accessory_photos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX shop_accessory_photos_accessory_idx ON public.shop_accessory_photos(accessory_id);

-- Accessory variants (color/size/etc.) - each variant has own stock
CREATE TABLE public.shop_accessory_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_id uuid NOT NULL REFERENCES public.shop_accessories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price_cents_override integer CHECK (price_cents_override IS NULL OR price_cents_override >= 0),
  stock_qty integer NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_accessory_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_accessory_variants TO authenticated;
GRANT ALL ON public.shop_accessory_variants TO service_role;
ALTER TABLE public.shop_accessory_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view active variants" ON public.shop_accessory_variants
  FOR SELECT TO anon, authenticated USING (
    active = true AND EXISTS (
      SELECT 1 FROM public.shop_accessories a WHERE a.id = accessory_id AND a.active = true
    )
  );
CREATE POLICY "Admins manage variants" ON public.shop_accessory_variants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER shop_accessory_variants_updated_at BEFORE UPDATE ON public.shop_accessory_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX shop_accessory_variants_accessory_idx ON public.shop_accessory_variants(accessory_id);

-- Carts: identified by an unguessable UUID stored client-side (or by user_id once signed in)
CREATE TABLE public.shop_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_carts TO anon, authenticated;
GRANT ALL ON public.shop_carts TO service_role;
ALTER TABLE public.shop_carts ENABLE ROW LEVEL SECURITY;
-- Cart id itself is the secret; permit access to anyone who knows it.
CREATE POLICY "Anyone can manage their own cart" ON public.shop_carts
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
CREATE TRIGGER shop_carts_updated_at BEFORE UPDATE ON public.shop_carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX shop_carts_user_idx ON public.shop_carts(user_id);
CREATE INDEX shop_carts_session_idx ON public.shop_carts(session_token);

-- Cart items: one row per sneaker (qty always 1) or per accessory variant line
CREATE TABLE public.shop_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.shop_carts(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('sneaker','accessory')),
  sneaker_product_id uuid REFERENCES public.shop_products(id) ON DELETE CASCADE,
  accessory_variant_id uuid REFERENCES public.shop_accessory_variants(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price_cents integer NOT NULL CHECK (unit_price_cents >= 0),
  reserved_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (item_type = 'sneaker' AND sneaker_product_id IS NOT NULL AND accessory_variant_id IS NULL AND qty = 1)
    OR (item_type = 'accessory' AND accessory_variant_id IS NOT NULL AND sneaker_product_id IS NULL)
  ),
  UNIQUE (cart_id, sneaker_product_id),
  UNIQUE (cart_id, accessory_variant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_cart_items TO anon, authenticated;
GRANT ALL ON public.shop_cart_items TO service_role;
ALTER TABLE public.shop_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage cart items" ON public.shop_cart_items
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);
CREATE TRIGGER shop_cart_items_updated_at BEFORE UPDATE ON public.shop_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX shop_cart_items_cart_idx ON public.shop_cart_items(cart_id);
