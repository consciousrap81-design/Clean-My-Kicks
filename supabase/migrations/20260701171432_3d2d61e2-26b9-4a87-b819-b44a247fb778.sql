
-- 1) shop_products: explicitly revoke sensitive columns from public roles (belt-and-suspenders on top of existing column grants)
REVOKE SELECT (reserved_session_id, sold_order_id) ON public.shop_products FROM anon, authenticated;

-- 2) shop_abandoned_carts: explicit RESTRICTIVE deny for non-admin writes
DROP POLICY IF EXISTS "Deny non-admin writes on abandoned carts" ON public.shop_abandoned_carts;
CREATE POLICY "Deny non-admin writes on abandoned carts"
ON public.shop_abandoned_carts
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) shop_promo_redemptions: explicit RESTRICTIVE deny for non-admin writes
DROP POLICY IF EXISTS "Deny non-admin writes on promo redemptions" ON public.shop_promo_redemptions;
CREATE POLICY "Deny non-admin writes on promo redemptions"
ON public.shop_promo_redemptions
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
