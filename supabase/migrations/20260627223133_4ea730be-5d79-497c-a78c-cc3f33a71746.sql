-- Restore table-level SELECT so storefront `select(*)` works again
GRANT SELECT ON public.shop_products TO anon, authenticated;

-- Then explicitly hide internal reservation/order linkage columns from anon callers.
-- (anon will get a column-permission error if they explicitly request these,
--  but `select(...)` lists used by the storefront never reference them.)
REVOKE SELECT (reserved_session_id, sold_order_id) ON public.shop_products FROM anon;

GRANT ALL ON public.shop_products TO service_role;