REVOKE SELECT ON public.shop_products FROM anon, authenticated;
GRANT SELECT (id, name, brand, model, size, condition, description, price, status, view_count, reserved_until, sold_at, sold_order_id, created_at, updated_at) ON public.shop_products TO anon, authenticated;

CREATE POLICY "Deny non-admin promo reads"
  ON public.shop_promo_codes
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'));