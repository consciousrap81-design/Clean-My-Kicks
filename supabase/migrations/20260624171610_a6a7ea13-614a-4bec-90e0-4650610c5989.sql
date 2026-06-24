
-- 1. Tighten shop_carts policies
DROP POLICY IF EXISTS "Anyone can manage their own cart" ON public.shop_carts;

CREATE POLICY "Users manage own cart"
ON public.shop_carts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon manage anonymous carts"
ON public.shop_carts
FOR ALL
TO anon
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);

-- 2. Tighten shop_cart_items policies via parent cart ownership
DROP POLICY IF EXISTS "Anyone can manage cart items" ON public.shop_cart_items;

CREATE POLICY "Users manage own cart items"
ON public.shop_cart_items
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.shop_carts c WHERE c.id = shop_cart_items.cart_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.shop_carts c WHERE c.id = shop_cart_items.cart_id AND c.user_id = auth.uid()));

CREATE POLICY "Anon manage anonymous cart items"
ON public.shop_cart_items
FOR ALL
TO anon
USING (EXISTS (SELECT 1 FROM public.shop_carts c WHERE c.id = shop_cart_items.cart_id AND c.user_id IS NULL))
WITH CHECK (EXISTS (SELECT 1 FROM public.shop_carts c WHERE c.id = shop_cart_items.cart_id AND c.user_id IS NULL));

-- 3. shop_product_views: allow inserts only for existing/available products (server still uses service role)
CREATE POLICY "Public can insert product views"
ON public.shop_product_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shop_products p
    WHERE p.id = shop_product_views.product_id
      AND p.status = 'available'
  )
);

-- 4. Replace permissive request-photos upload policy with one tied to a real booking request
DROP POLICY IF EXISTS request_photos_public_insert ON storage.objects;

CREATE POLICY request_photos_scoped_insert
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'request-photos'
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|heic|heif)$'
  AND EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id::text = split_part(name, '/', 1)
      AND br.status IN ('awaiting_photos', 'pending')
  )
);

-- 5. Harden has_role: only allow checks for self (or callers who are already admin), and remove anon/public exec
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow callers to check their own roles, unless they are themselves an admin.
  IF _user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
