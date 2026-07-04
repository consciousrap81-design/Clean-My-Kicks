ALTER TABLE public.shop_products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'restored' CHECK (category IN ('restored','new'));
CREATE INDEX IF NOT EXISTS shop_products_category_idx ON public.shop_products(category);
UPDATE public.shop_products SET category = 'new' WHERE id = '828359fe-5fb2-42bd-af09-e7f5beda886e';