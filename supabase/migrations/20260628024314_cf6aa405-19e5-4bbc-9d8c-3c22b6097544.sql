
-- Revoke broad table privileges; column-level grants take over for public reads.
REVOKE ALL ON public.shop_products FROM anon;
REVOKE ALL ON public.shop_products FROM authenticated;

-- Public-safe columns only (excludes reserved_session_id and sold_order_id).
GRANT SELECT (
  id, name, brand, model, size, condition, description, price,
  status, view_count, reserved_until, sold_at, created_at, updated_at
) ON public.shop_products TO anon, authenticated;

-- Writes are still gated by the existing "Admins manage products" RLS policy.
GRANT INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;

GRANT ALL ON public.shop_products TO service_role;

-- Helper: per-session reservation status. Returns whether each product id is
-- currently held by the supplied session, without exposing the underlying id.
CREATE OR REPLACE FUNCTION public.shop_products_reservation_for_session(
  p_ids uuid[],
  p_session text
)
RETURNS TABLE(id uuid, status text, reserved_until timestamptz, reserved_by_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id,
    sp.status,
    sp.reserved_until,
    (sp.reserved_session_id IS NOT NULL
      AND p_session IS NOT NULL
      AND sp.reserved_session_id = p_session) AS reserved_by_me
  FROM public.shop_products sp
  WHERE sp.id = ANY(p_ids);
$$;

REVOKE ALL ON FUNCTION public.shop_products_reservation_for_session(uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_products_reservation_for_session(uuid[], text) TO anon, authenticated, service_role;
