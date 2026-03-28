-- Inventory taxonomy + product subcategory support
-- Run this in Supabase SQL editor

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS subcategory text;

CREATE TABLE IF NOT EXISTS public.inventory_taxonomy (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category text NOT NULL,
  subcategory text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, subcategory)
);

ALTER TABLE public.inventory_taxonomy ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory_taxonomy'
      AND policyname = 'Allow public read taxonomy'
  ) THEN
    CREATE POLICY "Allow public read taxonomy"
      ON public.inventory_taxonomy
      FOR SELECT
      USING (true);
  END IF;
END $$;

INSERT INTO public.inventory_taxonomy (category, subcategory, sort_order, active)
VALUES
  ('Bags', 'Shoulder Bags', 1, true),
  ('Bags', 'Tote Bags', 2, true),
  ('Bags', 'Sling Bags', 3, true),
  ('Bags', 'Ethnic Bags', 4, true),
  ('Bags', 'Duffle Bags', 5, true),
  ('Bags', 'Wallets', 6, true),
  ('Bags', 'Tablet Bags', 7, true),
  ('Accessories', 'Hair Bows', 1, true),
  ('Accessories', 'Nails', 2, true),
  ('Accessories', 'Earrings', 3, true),
  ('Accessories', 'Bracelets', 4, true),
  ('Accessories', 'Necklace', 5, true),
  ('Accessories', 'Bag Charms', 6, true),
  ('Accessories', 'Sunglasses', 7, true),
  ('Accessories', 'Hair Claw Clips', 8, true),
  ('Accessories', 'Scarfs', 9, true),
  ('Accessories', 'Phone Covers', 10, true),
  ('Accessories', 'Travel Pouch', 11, true)
ON CONFLICT (category, subcategory)
DO UPDATE
SET
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = now();

CREATE INDEX IF NOT EXISTS products_category_subcategory_idx
ON public.products (category, subcategory);

CREATE INDEX IF NOT EXISTS inventory_taxonomy_category_sort_idx
ON public.inventory_taxonomy (category, sort_order);
