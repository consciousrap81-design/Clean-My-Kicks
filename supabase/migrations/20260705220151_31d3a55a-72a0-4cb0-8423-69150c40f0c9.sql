
CREATE TABLE public.shop_product_category_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  from_category TEXT,
  to_category TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_cat_history_product ON public.shop_product_category_history(product_id, created_at DESC);

GRANT SELECT, INSERT ON public.shop_product_category_history TO authenticated;
GRANT ALL ON public.shop_product_category_history TO service_role;

ALTER TABLE public.shop_product_category_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view category history"
  ON public.shop_product_category_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert category history"
  ON public.shop_product_category_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND changed_by = auth.uid());

-- Trigger to auto-record category changes (covers direct DB updates too)
CREATE OR REPLACE FUNCTION public.log_shop_product_category_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NEW.category IS DISTINCT FROM OLD.category THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    INSERT INTO public.shop_product_category_history
      (product_id, from_category, to_category, changed_by, changed_by_email)
    VALUES (NEW.id, OLD.category, NEW.category, auth.uid(), v_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_shop_product_category ON public.shop_products;
CREATE TRIGGER trg_log_shop_product_category
  AFTER UPDATE OF category ON public.shop_products
  FOR EACH ROW
  EXECUTE FUNCTION public.log_shop_product_category_change();
