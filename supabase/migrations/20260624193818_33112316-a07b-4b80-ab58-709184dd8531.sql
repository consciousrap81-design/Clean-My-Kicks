-- Lock down SECURITY DEFINER helper functions so only service_role (edge functions) can call them.
-- These wrappers are intended for server-side use only; authenticated end-users must not invoke them directly.

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_customer_user(text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_customer_user(text, uuid) TO service_role;

-- Note: public.has_role(uuid, app_role) remains executable by authenticated because it is
-- referenced from RLS policies that evaluate under the calling user. The function already
-- contains an internal guard that prevents users from checking roles other than their own
-- (unless they are admins), so leaving EXECUTE in place is safe and required.