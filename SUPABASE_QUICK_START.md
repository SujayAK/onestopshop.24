====================================================================
           SUPABASE INTEGRATION QUICK START GUIDE
====================================================================

Your onestopshop project is now fully integrated with Supabase! 
This guide will help you get up and running in 30 minutes.

====================================================================
STEP 1: CREATE SUPABASE ACCOUNT & PROJECT (5 minutes)
====================================================================

1. Visit https://supabase.com
2. Click "Sign Up" and choose your preferred login method
3. Verify your email
4. Click "New Project"
5. Fill in:
   - Project Name: onestopshop (or any name)
   - Database Password: Create a strong password (save it!)
   - Region: Choose closest to your users
   - Pricing: Free
6. Wait 2-5 minutes for project creation (you'll get an email when ready)

====================================================================
STEP 2: COPY YOUR API CREDENTIALS (2 minutes)
====================================================================

Once your project is created:

1. Click your project to open dashboard
2. Go to Settings (gear icon) > API
3. You'll see:
   - "URL" (copy this whole line)
   - Under "Project API Keys", find "anon public" key
   
4. Copy these two values:
   - VITE_SUPABASE_URL=<the URL you copied>
   - VITE_SUPABASE_ANON_KEY=<the anon key you copied>

====================================================================
STEP 3: ADD CREDENTIALS TO YOUR PROJECT (1 minute)
====================================================================

1. Open the .env file in your project folder
2. Add the two lines you copied:

.env file:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cC...

3. Save the file

====================================================================
STEP 4: CREATE DATABASE TABLES (10 minutes)
====================================================================

In your Supabase dashboard:

1. Click "SQL Editor" in the left menu
2. Click "New Query"
3. Copy and paste the SQL script below:
4. Click "Run"

---

-- User profiles
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

-- Products
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

-- Orders
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

-- Coupons
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

-- Coupon redemptions
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media storage metadata
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

-- Create indexes
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_coupons_code ON coupons(code);

---

====================================================================
STEP 5: CREATE STORAGE BUCKETS (5 minutes)
====================================================================

These store your product images and uploaded files:

1. In Supabase dashboard, click "Storage"
2. Click "Create a new bucket"
3. Create "products" bucket:
   - Name it: products
   - Check "Public bucket" box
   - Click Create

4. Create "user-uploads" bucket:
   - Name it: user-uploads
   - Do NOT check "Public bucket" box
   - Click Create

====================================================================
STEP 6: TEST YOUR INTEGRATION (5 minutes)
====================================================================

In your terminal, run:

npm run dev

Then go to http://localhost:5173

Try to:
1. Create a new account - click the user icon, then "Create Account"
   - Use any email (e.g., test@example.com)
   - Use password: Test@123456
   
2. If signup works:
   - Go to Supabase dashboard > Authentication
   - You should see your new user!

3. Sign in with that account
4. Go to shop, add items to cart
5. Go to checkout and place an order
   - Check Supabase > Tables > orders
   - You should see your order!

====================================================================
STEP 7: ADD PRODUCT DATA (5 minutes)
====================================================================

Option A: Add via Supabase UI (Easiest)

1. In Supabase, go to "Table Editor"
2. Click "products" table
3. Click "Insert row"
4. Fill in:
   - name: "Blue Jeans"
   - price: 49.99
   - stock: 50
   - category: "Jeans"
   - image_url: https://via.placeholder.com/300x400?text=Blue+Jeans
5. Click Save

Option B: Add Sample Data (Quick)

Run this SQL in SQL Editor:

---

INSERT INTO products (name, description, price, stock, category, image_url, rating) VALUES
('Casual Blue Jeans', 'Comfortable blue denim', 49.99, 50, 'Jeans', 'https://via.placeholder.com/300x400?text=Jeans', 4.5),
('White Sneakers', 'Classic white canvas', 59.99, 35, 'Shoes', 'https://via.placeholder.com/300x400?text=Sneakers', 4.7),
('Summer Dress', 'Light floral dress', 45.99, 25, 'Dresses', 'https://via.placeholder.com/300x400?text=Dress', 4.3);

INSERT INTO coupons (code, description, discount_type, discount_value, max_uses, active, expiry_date) VALUES
('WELCOME10', '10% off first purchase', 'percentage', 10, 1000, true, '2025-12-31'),
('SAVE50', '₹50 off on orders above 200', 'fixed', 50, 500, true, '2025-12-31');

---

====================================================================
CURRENT INTEGRATION FEATURES
====================================================================

✅ Sign Up - Creates new user in Supabase Auth
✅ Sign In - Authenticates with Supabase
✅ User Profiles - Stores user info in user_profiles table
✅ Products - Fetches from products table
✅ Orders - Saves orders to database when checkout completes
✅ Coupons - Validates coupon codes
✅ Payment Status - Updates order status after payment success/failure

====================================================================
WHAT'S CONNECTED
====================================================================

Login/Signup Pages:
- Signs up users with Supabase Auth
- Creates user_profiles entry automatically
- Stores user data in sessionStorage

Checkout Page:
- Creates order record in Supabase before payment
- Links order to logged-in user
- Stores shipping address

Payment Success Page:
- Updates order status to "confirmed"
- Updates payment_status to "completed"
- Stores Razorpay payment IDs

Payment Failed Page:
- Updates order status to "failed"
- Updates payment_status to "failed"

===================================================================
TROUBLESHOOTING
====================================================================

Q: "VITE_SUPABASE_URL is undefined"
A: Check your .env file has the right values. Save the file and restart dev server.

Q: "Cannot read property 'data' of undefined"
A: Make sure you ran the SQL script to create all tables

Q: Signup button does nothing
A: Check browser console (F12). You'll see error messages there.

Q: "Email already exists" error
A: The email is already registered. Use a different email or sign in.

Q: Products don't show up
A: Add sample products. Go to Supabase > products table > Insert row

Q: Order not saving
A: Make sure you're logged in before checkout. Check browser console for errors.

====================================================================
NEXT STEPS
====================================================================

1. Add real product images
   - Go to Storage > products bucket
   - Upload your images
   - Copy URL to products table image_url field

2. Connect Razorpay (already configured)
   - Order status auto-updates on payment success/fail
   - Continue using existing Razorpay setup

3. Customize authentication
   - Go to Authentication > Settings
   - Enable email verification
   - Add custom email templates

4. Create admin dashboard
   - Build a new page to manage products/orders
   - Use Supabase queries to display data
   - Add delete/edit/create functions

5. Enable real-time features
   - Listen for order changes
   - Send notifications to customers
   - Update inventory in real-time

====================================================================
USEFUL SUPABASE FEATURES YOU CAN USE
====================================================================

Manage Products:
1. Go to Table Editor
2. Click products table
3. Add/Edit/Delete as needed

Manage Orders:
1. Go to Table Editor
2. Click orders table
3. Update status: pending → confirmed → shipped → delivered

View Customers:
1. Go to Authentication
2. See all registered users
3. Click a user to see details

Upload Images:
1. Go to Storage > products bucket
2. Click Upload
3. Select images
4. Copy URL to use in products table

Send Emails:
1. Go to Authentication > Email Templates
2. Customize welcome/confirmation emails
3. Users get emails automatically

====================================================================
FILE CHANGES MADE
====================================================================

Modified Files:
- .env - Added VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- src/utils/supabase.js - Created Supabase client and functions
- src/pages/login.js - Integrated Supabase authentication
- src/pages/signup.js - Integrated Supabase user creation
- src/pages/checkout.js - Saves orders to Supabase
- src/pages/payment-success.js - Updates order status on success
- src/pages/payment-failed.js - Updates order status on failure
- src/main.js - Added payment failure page initialization
- package.json - Added @supabase/supabase-js dependency

====================================================================
SECURITY NOTES
====================================================================

✅ .env file is in .gitignore (not committed to git)
✅ Anonymous key is used in frontend (restricted access)
✅ Admin/service role key should only be used in backend
✅ Row Level Security (RLS) can be enabled for production
✅ All passwords are hashed by Supabase

====================================================================
PRODUCTION CHECKLIST
====================================================================

Before going live:
- [ ] Enable Row Level Security (RLS) on tables
- [ ] Replace placeholder images with real product images
- [ ] Test payment gateway with real Razorpay account
- [ ] Set up email verification for user accounts
- [ ] Configure email templates for order notifications
- [ ] Set up environment variables on hosting platform
- [ ] Enable HTTPS (required for secure cookies)
- [ ] Backup database regularly
- [ ] Monitor error logs
- [ ] Set up monitoring/alerts for failed orders

====================================================================
SUPPORT & RESOURCES
====================================================================

Supabase Docs: https://supabase.com/docs
API Reference: https://supabase.com/docs/guides/api
Auth Guide: https://supabase.com/docs/guides/auth
Database Guide: https://supabase.com/docs/guides/database
Storage Guide: https://supabase.com/docs/guides/storage
Discord: https://discord.supabase.io

====================================================================

Good luck! Your store is now ready to accept real customers! 🎉

====================================================================
