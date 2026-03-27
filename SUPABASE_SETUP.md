====================================================================
             SUPABASE SETUP FOR ONESTOPSHOP
====================================================================

This guide helps you set up Supabase as your backend for onestopshop.
Supabase is a free, open-source Firebase alternative with a visual database
management interface - perfect for non-technical users!

====================================================================
PART 1: CREATE SUPABASE PROJECT (5 minutes)
====================================================================

1. Go to https://supabase.com and sign up with GitHub, Google, or email
2. Click "New Project" button
3. Fill in the form:
   - Project Name: "onestopshop" (or any name you prefer)
   - Database Password: Create a strong password (save this!)
   - Region: Choose closest to your users
   - Pricing Plan: "Free" (sufficient for development)
4. Wait for project creation (2-3 minutes)
5. Once created, you'll see your dashboard

====================================================================
PART 2: GET YOUR API CREDENTIALS (2 minutes)
====================================================================

1. In your Supabase dashboard, go to "Settings" → "API"
2. Copy the following values:
   - Project URL (labeled as "URL")
   - Anon/Public API Key (labeled as "anon public")
3. Paste these into your .env file:

   .env file location: /path/to/onestopshop/.env

   Add these lines:
   VITE_SUPABASE_URL=<your-project-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>

4. Save the .env file

====================================================================
PART 3: CREATE DATABASE TABLES (15 minutes)
====================================================================

Go to "SQL Editor" in your Supabase dashboard and run this SQL script:

---

-- Users table (auto-created by Supabase Auth, we just need profiles)
CREATE TABLE IF NOT EXISTS user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0,
  category VARCHAR(100),
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews INT DEFAULT 0,
  sku VARCHAR(100) UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2),
  tax_amount DECIMAL(10, 2),
  shipping_cost DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2),
  coupon_code VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  shipping_address JSONB,
  billing_address JSONB,
  payment_method VARCHAR(100),
  payment_status VARCHAR(50) DEFAULT 'pending',
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature VARCHAR(255),
  tracking_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  discount_type VARCHAR(50),
  discount_value DECIMAL(10, 2),
  max_uses INT,
  used_count INT DEFAULT 0,
  min_order_amount DECIMAL(10, 2),
  active BOOLEAN DEFAULT TRUE,
  expiry_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupon redemptions table (track which users used which coupons)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media/file storage metadata
CREATE TABLE IF NOT EXISTS media (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  storage_path TEXT NOT NULL,
  url TEXT,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store settings (used for dynamic announcement bar text)
CREATE TABLE IF NOT EXISTS store_settings (
   id BIGSERIAL PRIMARY KEY,
   key VARCHAR(120) NOT NULL UNIQUE,
   value TEXT,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default announcement bar message (editable from Supabase table editor)
INSERT INTO store_settings (key, value)
VALUES ('announcement_bar_text', 'FREE SHIPPING ON ORDERS OVER $100 • NEW ARRIVALS JUST LANDED')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_store_settings_key ON store_settings(key);

---

Copy and paste this entire SQL script into the SQL Editor and click "Run".

====================================================================
PART 4: SET UP STORAGE BUCKETS (5 minutes)
====================================================================

Supabase Storage allows you to upload and serve images. Let's create buckets:

1. Go to "Storage" in your Supabase dashboard
2. Click "Create a new bucket"
3. Create these buckets:
   - Bucket name: "products"
   - Check "Public bucket" box
   - Click Create

4. Create another bucket:
   - Bucket name: "user-uploads"
   - Keep private (don't check "Public bucket")
   - Click Create

====================================================================
PART 5: ENABLE ROW LEVEL SECURITY (RLS) - OPTIONAL (10 minutes)
====================================================================

For production, enable Row Level Security. This restricts what data
users can access based on their authentication status.

1. Go to "Authentication" → "Policies"
2. For user_profiles table:
   - Click "Enable RLS" if not enabled
   - Add policy: Users can only view their own profile
   
3. For orders table:
   - Click "Enable RLS" if not enabled
   - Add policy: Users can only view their own orders

This is optional for development but recommended for production.

====================================================================
PART 6: CONFIGURE YOUR LOCAL .ENV FILE
====================================================================

Your .env file should now look like:

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_RAZORPAY_KEY_ID=rzp_test_1DP5mmOlF5G5ag
RAZORPAY_KEY_SECRET=WuHHb11zqqHLQgLaQHKVwddQ

VITE_API_BASE_URL=http://localhost:3000
VITE_CURRENCY=INR
VITE_TAX_RATE=0.1
VITE_SHIPPING_COST=0

====================================================================
PART 7: ADD TEST DATA (OPTIONAL - 10 minutes)
====================================================================

To test your integration, add some sample products:

1. Go to "SQL Editor" again
2. Run this script to add sample products:

---

INSERT INTO products (name, description, price, stock, category, image_url, rating) VALUES
('Casual Blue Jeans', 'Comfortable and stylish blue denim jeans perfect for everyday wear', 49.99, 50, 'Jeans', 'https://via.placeholder.com/300x400?text=Blue+Jeans', 4.5),
('White Sneakers', 'Classic white canvas sneakers - versatile and perfect for any outfit', 59.99, 35, 'Shoes', 'https://via.placeholder.com/300x400?text=White+Sneakers', 4.7),
('Summer Floral Dress', 'Light and breezy floral dress perfect for summer days', 45.99, 25, 'Dresses', 'https://via.placeholder.com/300x400?text=Floral+Dress', 4.3),
('Black Leather Belt', 'Premium quality black leather belt with metal buckle', 29.99, 100, 'Accessories', 'https://via.placeholder.com/300x400?text=Black+Belt', 4.6),
('Polo T-Shirt', 'Classic polo t-shirt available in multiple colors', 39.99, 60, 'T-Shirts', 'https://via.placeholder.com/300x400?text=Polo+Shirt', 4.4);

INSERT INTO coupons (code, description, discount_type, discount_value, max_uses, min_order_amount, active, expiry_date) VALUES
('WELCOME10', '10% off on first purchase', 'percentage', 10, 1000, 0, true, '2025-12-31'),
('SAVE50', 'Flat 50 rupees off on orders above 200', 'fixed', 50, 500, 200, true, '2025-12-31');

---

Run this script to populate your database with sample data.

====================================================================
PART 8: TEST YOUR SETUP
====================================================================

1. In your terminal, run:
   npm run dev

2. Open browser to: http://localhost:5173

3. Try to Sign Up with a new account:
   - Email: testuser@example.com
   - Password: Test@123456
   - First Name: Test
   - Last Name: User

4. If signup succeeds, you can:
   - Check "Authentication" in Supabase to see your new user
   - Check "user_profiles" table to see the profile created
   - Sign in with your new account

====================================================================
PART 9: MANAGE YOUR DATA (NO CODING REQUIRED!)
====================================================================

Supabase provides a visual interface to manage all your data:

ADD A NEW PRODUCT:
1. Go to Supabase dashboard
2. Click "Table Editor"
3. Click "products" table
4. Click "Insert row"
5. Fill in: name, description, price, stock, category, image_url
6. Click "Save"
7. Your product appears on the website automatically!

ADD A CATEGORY (if needed):
1. Sort products by category
2. Enter category names when adding products
3. Website auto-groups by category

MANAGE ORDERS:
1. Click "orders" table
2. View all orders with customer details
3. Click an order to see full details
4. Update status to "shipped", "delivered", etc.
5. Add tracking_number for customer updates

UPLOAD PRODUCT IMAGES:
1. Go to "Storage" section
2. Click "products" bucket
3. Click "Upload" and select images
4. Copy the file URL
5. Go to "products" table and paste URL in image_url column

VIEW CUSTOMERS:
1. Go to "Authentication" to see registered users
2. Click a user to see their details
3. Go to "user_profiles" to see additional info

TRACK PAYMENTS:
1. Go to "orders" table
2. Check payment_status: "pending", "completed", "failed"
3. View razorpay_payment_id and razorpay_order_id for reference

MANAGE ANNOUNCEMENT BAR TEXT (Backend Controlled):
1. Go to "Table Editor"
2. Click "store_settings" table
3. Find row where key = announcement_bar_text
4. Edit the value column with any message you want
5. Click Save
6. Refresh website and the new announcement appears automatically

Example values:
- FREE SHIPPING ON ORDERS OVER $100 • NEW ARRIVALS JUST LANDED
- FESTIVE SALE LIVE • EXTRA 15% OFF WITH CODE FESTIVE15
- EXPRESS DELIVERY AVAILABLE IN SELECT CITIES

====================================================================
PART 10: COMMON ISSUES & SOLUTIONS
====================================================================

ISSUE: "VITE_SUPABASE_URL is not defined"
SOLUTION: Check your .env file has correct URL and is saved

ISSUE: "Cannot read property 'data' of undefined"
SOLUTION: Make sure your Supabase tables are created using the SQL script

ISSUE: "401 Unauthorized" error
SOLUTION: Your ANON KEY might be wrong. Get a fresh one from Settings > API

ISSUE: "Column not found" error
SOLUTION: Make sure you ran the complete SQL script to create all tables

ISSUE: Authentication works but products don't load
SOLUTION: Check that products table has data. Add sample products from PART 7

ISSUE: File upload fails
SOLUTION: Make sure storage buckets are created and marked as public

====================================================================
PART 11: SECURITY BEST PRACTICES
====================================================================

1. NEVER commit .env file to git (already in .gitignore)
2. For production, enable Row Level Security (RLS) - see PART 5
3. Review "Authentication" → "Settings" for email confirmation options
4. Set up email templates for welcome/password reset
5. Use HTTPS only (Supabase provides this)
6. Rotate your API keys regularly
7. Create a separate anon key for frontend (already done)
8. Use a service role key only on backend (not in frontend)

====================================================================
PART 12: NEXT STEPS
====================================================================

After setup, you can:

1. Upload real product images
   - Go to Storage > products bucket
   - Upload your images
   - Copy URLs to products table

2. Connect Razorpay for payments
   - Already configured in your code
   - Payment success/failure updates orders in database

3. Set up Email Notifications
   - Go to Authentication > Email Templates
   - Customize welcome/confirmation emails
   - Users get emails on signup/payment

4. Create Admin Dashboard
   - Build a page to manage products/orders
   - Restrict to admin users only
   - Full database access through Supabase interface

5. Enable Real-time Updates
   - Subscribe to order changes
   - Notify customers on status updates
   - See inventory changes in real-time

====================================================================
HELPFUL LINKS
====================================================================

Supabase Documentation: https://supabase.com/docs
Supabase API Reference: https://supabase.com/docs/guides/api
SQL Tutorial: https://www.w3schools.com/sql/
How to Upload Files: https://supabase.com/docs/guides/storage
Authentication Guide: https://supabase.com/docs/guides/auth
Row Level Security: https://supabase.com/docs/guides/auth/row-level-security

====================================================================
QUESTIONS OR ISSUES?
====================================================================

1. Check Supabase Docs: https://supabase.com/docs
2. Visit Supabase Discord: https://discord.supabase.io
3. Check GitHub Issues: https://github.com/supabase/supabase/issues
4. Email Supabase Support: support@supabase.io

Good luck with your onestopshop project! 🚀

====================================================================
