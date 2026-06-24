
-- 1) Scope anonymous cart access to the holder of the cart id (via x-cart-id header)
DROP POLICY IF EXISTS "Anon manage anonymous carts" ON public.shop_carts;
CREATE POLICY "Anon manage scoped cart"
  ON public.shop_carts
  FOR ALL
  TO anon
  USING (
    user_id IS NULL
    AND id = NULLIF(current_setting('request.headers', true)::json->>'x-cart-id', '')::uuid
  )
  WITH CHECK (
    user_id IS NULL
    AND id = NULLIF(current_setting('request.headers', true)::json->>'x-cart-id', '')::uuid
  );

DROP POLICY IF EXISTS "Anon manage anonymous cart items" ON public.shop_cart_items;
CREATE POLICY "Anon manage scoped cart items"
  ON public.shop_cart_items
  FOR ALL
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.shop_carts c
      WHERE c.id = shop_cart_items.cart_id
        AND c.user_id IS NULL
        AND c.id = NULLIF(current_setting('request.headers', true)::json->>'x-cart-id', '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shop_carts c
      WHERE c.id = shop_cart_items.cart_id
        AND c.user_id IS NULL
        AND c.id = NULLIF(current_setting('request.headers', true)::json->>'x-cart-id', '')::uuid
    )
  );

-- 2) Require the booking-request public token (not the row id) in the storage path
DROP POLICY IF EXISTS request_photos_scoped_insert ON storage.objects;
CREATE POLICY request_photos_scoped_insert
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'request-photos'
    AND name ~ '^[a-f0-9]{32}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|heic|heif)$'
    AND EXISTS (
      SELECT 1 FROM public.booking_requests br
      WHERE br.public_token = split_part(name, '/', 1)
        AND br.status IN ('awaiting_photos'::request_status, 'pending'::request_status)
    )
  );

-- 3) Lock down SECURITY DEFINER helper functions to backend only
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_customer_user(text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_customer_user(text, uuid) TO service_role;
