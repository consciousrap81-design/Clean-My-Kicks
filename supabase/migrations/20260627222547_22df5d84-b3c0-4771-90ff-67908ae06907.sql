-- Restrict public column access on shop_products so internal reservation/order linkage isn't exposed
REVOKE SELECT ON public.shop_products FROM anon, authenticated;

GRANT SELECT (
  id, name, brand, model, size, condition, description, price, status,
  view_count, reserved_until, sold_at, created_at, updated_at
) ON public.shop_products TO anon, authenticated;

GRANT ALL ON public.shop_products TO service_role;