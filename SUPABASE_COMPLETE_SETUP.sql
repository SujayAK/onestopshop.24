-- ============================================
-- COMPLETE SUPABASE DATABASE SETUP
-- Copy & Paste this entire file into Supabase SQL Editor
-- ============================================

-- Step 1: Create Categories Table
-- This table stores all product categories
-- Can be used for both Shop and Stock Clearance

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('Shop', 'Stock Clearance', 'Both')),
  icon TEXT,
  parent_id BIGINT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_parent_category FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_category_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_category_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_category_parent ON categories(parent_id);

-- ============================================
-- Step 2: Create Products Table (Main Shop)
-- This table stores all regular shop products
-- ============================================

CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category_id BIGINT NOT NULL,
  image_url TEXT,
  colors TEXT,
  size TEXT,
  stock INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_stock CHECK (stock >= 0)
);

-- Create indexes for faster queries and filtering
CREATE INDEX IF NOT EXISTS idx_product_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_product_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_product_price ON products(price);

-- ============================================
-- Step 3: Create Stock Clearance Products Table
-- This table stores all clearance/sale products
-- ============================================

CREATE TABLE IF NOT EXISTS stock_clearance_products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sr_no INTEGER,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category_id BIGINT NOT NULL,
  size TEXT,
  colors TEXT,
  stock INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clearance_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_stock CHECK (stock >= 0)
);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_clearance_category ON stock_clearance_products(category_id);
CREATE INDEX IF NOT EXISTS idx_clearance_active ON stock_clearance_products(active);
CREATE INDEX IF NOT EXISTS idx_clearance_price ON stock_clearance_products(price);

-- ============================================
-- Step 4: Insert Sample Categories
-- These categories will appear in website filters
-- ============================================

INSERT INTO categories (name, description, type, active) VALUES
('Bags', 'Premium quality bags and totes collection', 'Both', true),
('Accessories', 'Fashion accessories and jewelry', 'Shop', true),
('Tops', 'Trendy tops, blouses and t-shirts', 'Both', true),
('Bottom', 'Stylish bottoms, pants and skirts', 'Both', true),
('Dresses', 'Beautiful dresses for every occasion', 'Both', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Step 5: Enable Row Level Security + Public Read Policies
-- Without these SELECT policies, website calls with anon key
-- can return empty/permission errors even when data exists.
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_clearance_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_public_read ON categories;
CREATE POLICY categories_public_read
ON categories
FOR SELECT
TO anon, authenticated
USING (active = true);

DROP POLICY IF EXISTS products_public_read ON products;
CREATE POLICY products_public_read
ON products
FOR SELECT
TO anon, authenticated
USING (active = true);

DROP POLICY IF EXISTS stock_clearance_products_public_read ON stock_clearance_products;
CREATE POLICY stock_clearance_products_public_read
ON stock_clearance_products
FOR SELECT
TO anon, authenticated
USING (active = true);

-- Optional admin write policies (recommended: service role or dashboard only)
-- Keep commented if you only edit via Supabase Dashboard with owner role.
-- DROP POLICY IF EXISTS categories_authenticated_write ON categories;
-- CREATE POLICY categories_authenticated_write
-- ON categories
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- DROP POLICY IF EXISTS products_authenticated_write ON products;
-- CREATE POLICY products_authenticated_write
-- ON products
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- DROP POLICY IF EXISTS stock_clearance_products_authenticated_write ON stock_clearance_products;
-- CREATE POLICY stock_clearance_products_authenticated_write
-- ON stock_clearance_products
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- ============================================
-- Step 6: Optional Store Settings Table (avoids 404 for announcement bar)
-- ============================================

CREATE TABLE IF NOT EXISTS store_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_settings_public_read ON store_settings;
CREATE POLICY store_settings_public_read
ON store_settings
FOR SELECT
TO anon, authenticated
USING (active = true);

INSERT INTO store_settings (key, value, active)
VALUES ('announcement_bar_text', 'Free shipping on orders above Rs. 999', true)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- SETUP COMPLETE! 
-- ============================================
-- Your tables are ready!
-- 
-- What's Created:
-- ✅ categories table - For all product categories
-- ✅ products table - For main shop products
-- ✅ stock_clearance_products table - For sale items
-- ✅ 5 sample categories - (Bags, Accessories, Tops, Bottom, Dresses)
--
-- Next Steps:
-- 1. Go to Table Editor
-- 2. Select each table and verify it exists
-- 3. Add product images using ImgBB
-- 4. Start adding products!
--
-- Reference:
-- - Categories Table: For managing product groups
-- - Products Table: For regular shop items  
-- - Stock Clearance Table: For sale/clearance items
--
-- All changes in these tables will be reflected
-- on the website automatically!
-- ============================================
