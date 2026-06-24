
-- ============= shop_products =============
CREATE TABLE public.shop_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  size TEXT,
  condition TEXT,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('draft','available','reserved','sold','archived')),
  view_count INTEGER NOT NULL DEFAULT 0,
  reserved_until TIMESTAMPTZ,
  reserved_session_id TEXT,
  sold_at TIMESTAMPTZ,
  sold_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;
GRANT ALL ON public.shop_products TO service_role;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- Public can read non-draft/non-archived products
CREATE POLICY "Public can view live products" ON public.shop_products
  FOR SELECT TO anon, authenticated
  USING (status IN ('available','reserved','sold'));

CREATE POLICY "Admins manage products" ON public.shop_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shop_products_updated_at
  BEFORE UPDATE ON public.shop_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= shop_product_photos =============
CREATE TABLE public.shop_product_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shop_product_photos_product_idx ON public.shop_product_photos(product_id, sort_order);
GRANT SELECT ON public.shop_product_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_product_photos TO authenticated;
GRANT ALL ON public.shop_product_photos TO service_role;
ALTER TABLE public.shop_product_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view photos of live products" ON public.shop_product_photos
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.shop_products p WHERE p.id = product_id AND p.status IN ('available','reserved','sold')));

CREATE POLICY "Admins manage photos" ON public.shop_product_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= shop_orders =============
CREATE TABLE public.shop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.shop_products(id) ON DELETE SET NULL,
  product_snapshot JSONB NOT NULL,
  user_id UUID,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  shipping_address JSONB,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','fulfilled','cancelled','refunded')),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  tracking_number TEXT,
  tracking_carrier TEXT,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shop_orders_email_idx ON public.shop_orders(lower(customer_email));
CREATE INDEX shop_orders_user_idx ON public.shop_orders(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_orders TO authenticated;
GRANT ALL ON public.shop_orders TO service_role;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all orders" ON public.shop_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers view own orders" ON public.shop_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER shop_orders_updated_at
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= shop_product_views =============
CREATE TABLE public.shop_product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX shop_product_views_pid_idx ON public.shop_product_views(product_id, created_at DESC);
CREATE INDEX shop_product_views_dedupe_idx ON public.shop_product_views(product_id, session_id, created_at DESC);
GRANT SELECT, INSERT ON public.shop_product_views TO authenticated;
GRANT ALL ON public.shop_product_views TO service_role;
ALTER TABLE public.shop_product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read views" ON public.shop_product_views
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============= Realtime =============
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_products;
