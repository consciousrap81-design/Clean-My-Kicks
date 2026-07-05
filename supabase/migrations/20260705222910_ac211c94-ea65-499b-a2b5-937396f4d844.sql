ALTER TABLE public.shop_accessory_photos ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Backfill: mark the lowest sort_order photo per accessory as cover
WITH firsts AS (
  SELECT DISTINCT ON (accessory_id) id
  FROM public.shop_accessory_photos
  ORDER BY accessory_id, sort_order ASC, created_at ASC
)
UPDATE public.shop_accessory_photos p
SET is_primary = true
FROM firsts f
WHERE p.id = f.id
  AND NOT EXISTS (
    SELECT 1 FROM public.shop_accessory_photos p2
    WHERE p2.accessory_id = p.accessory_id AND p2.is_primary = true
  );