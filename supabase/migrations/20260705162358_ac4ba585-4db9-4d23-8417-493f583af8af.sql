DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.relname);
  END LOOP;
END$$;

-- Public storefront reads (RLS still enforces row visibility)
GRANT SELECT ON public.shop_products TO anon;
GRANT SELECT ON public.shop_product_photos TO anon;
GRANT SELECT ON public.shop_accessories TO anon;
GRANT SELECT ON public.shop_accessory_photos TO anon;
GRANT SELECT ON public.shop_accessory_variants TO anon;
GRANT SELECT ON public.shop_reviews TO anon;
GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.cleaning_guides TO anon;

-- Anonymous cart flow
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_carts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_cart_items TO anon;
GRANT SELECT, INSERT ON public.shop_product_views TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shop_abandoned_carts TO anon;
GRANT INSERT ON public.shop_reviews TO anon;
GRANT SELECT, INSERT ON public.booking_requests TO anon;
GRANT SELECT ON public.shop_promo_codes TO anon;

-- Ensure has_role function is callable
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;