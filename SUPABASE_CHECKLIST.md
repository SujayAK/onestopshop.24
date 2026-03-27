====================================================================
         SUPABASE SETUP CHECKLIST - GET STARTED NOW
====================================================================

Follow this checklist to get your onestopshop Supabase backend 
working in under 1 hour.

====================================================================
PRE-SETUP (What was done for you)
====================================================================

✅ Installed @supabase/supabase-js package
✅ Created src/utils/supabase.js with all functions
✅ Integrated login/signup pages with Supabase Auth
✅ Integrated checkout page with order creation
✅ Integrated payment success/failure with order status
✅ Set up environment variable configuration
✅ Created comprehensive documentation

====================================================================
YOUR SETUP TASKS (DO THIS FIRST)
====================================================================

TASK 1: CREATE SUPABASE ACCOUNT (5 minutes)
---
☐ Visit https://supabase.com
☐ Sign up with Google, GitHub, or email
☐ Verify your email address
☐ Create a new project:
  ☐ Project name: "onestopshop"
  ☐ Database password: [Create strong password]
  ☐ Region: [Choose closest to you]
  ☐ Pricing: Free
☐ Wait for project creation email

TASK 2: GET YOUR API CREDENTIALS (2 minutes)
---
☐ Log in to Supabase dashboard
☐ Click your project
☐ Go to Settings > API
☐ Copy the URL (full supabase.co link)
☐ Copy the anon public key
☐ Save these two values temporarily

TASK 3: UPDATE YOUR .env FILE (1 minute)
---
☐ Open the .env file in your project root
☐ Find "VITE_SUPABASE_URL=" line
☐ Paste your URL there
☐ Find "VITE_SUPABASE_ANON_KEY=" line
☐ Paste your anon key there
☐ Save the file

Example .env after:
  VITE_SUPABASE_URL=https://xxxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

TASK 4: CREATE DATABASE TABLES (10 minutes)
---
☐ In Supabase dashboard, click "SQL Editor"
☐ Click "New Query"
☐ Open SUPABASE_SETUP.md and find the SQL script
☐ Copy the entire SQL script (all the CREATE TABLE statements)
☐ Paste it into the SQL Editor
☐ Click "Run" button
☐ Wait for success message

TASK 5: CREATE STORAGE BUCKETS (5 minutes)
---
☐ In Supabase dashboard, click "Storage"
☐ Click "Create a new bucket"
☐ Create "products" bucket:
  ☐ Name: products
  ☐ Check "Public bucket"
  ☐ Click Create

☐ Create "user-uploads" bucket:
  ☐ Name: user-uploads
  ☐ Do NOT check "Public bucket"
  ☐ Click Create

====================================================================
TESTING YOUR SETUP (DO THIS NEXT)
====================================================================

TASK 6: START THE DEVELOPMENT SERVER (2 minutes)
---
☐ Open terminal/command prompt in your project
☐ Run: npm run dev
☐ Wait for "Local: http://localhost:5173"
☐ Open http://localhost:5173 in your browser

TASK 7: TEST SIGNUP (3 minutes)
---
☐ Click the user icon (top right) or go to #/login
☐ Click "Create Account" button
☐ Fill in:
  ☐ First Name: Test
  ☐ Last Name: User
  ☐ Email: test@example.com
  ☐ Password: Test@123456
  ☐ Confirm: Test@123456
  ☐ Check Terms checkbox
☐ Click "Create Account"
☐ Should be redirected to home page

TEST VERIFICATION:
☐ Go to Supabase dashboard > Authentication
☐ You should see "test@example.com" in the users list
☐ Go to "user_profiles" table
☐ You should see "Test User" profile there

TASK 8: TEST SIGNIN (2 minutes)
---
☐ Sign out or go to #/login
☐ Click "Sign In"
☐ Enter:
  ☐ Email: test@example.com
  ☐ Password: Test@123456
☐ Click "Sign In"
☐ Should be logged in and on home page

TASK 9: TEST ORDER CREATION (5 minutes)
---
☐ Make sure you're signed in
☐ Go to #/shop or "Shop" link
☐ Click on a product
☐ Click "View Available Products"
☐ Add a product to cart (if no products, skip to TASK 10)
☐ Go to Cart (#/cart)
☐ Click "Proceed to Checkout"
☐ Fill in checkout form:
  ☐ Full Name: Test Customer
  ☐ Email: test@example.com
  ☐ Phone: +91 9876543210
  ☐ Address: 123 Test Street
  ☐ City: Test City
  ☐ Postal: 12345
  ☐ Check Terms checkbox
☐ Click "Proceed to Payment"
☐ Order should be created

TEST VERIFICATION:
☐ Go to Supabase > Table Editor > orders
☐ You should see your order with status "pending"
☐ Order should be linked to your user

TASK 10: ADD SAMPLE PRODUCTS (5 minutes)
---
First time setting up? Add sample products:

☐ Go to Supabase dashboard
☐ Go to Table Editor > products table
☐ Click "Insert row"
☐ Fill in:
  ☐ name: Casual Blue Jeans
  ☐ price: 49.99
  ☐ stock: 50
  ☐ category: Jeans
  ☐ description: Comfortable blue denim
  ☐ image_url: https://via.placeholder.com/300x400?text=Jeans
☐ Click Save

☐ Repeat for more products:
  ☐ White Sneakers (59.99, Shoes)
  ☐ Summer Dress (45.99, Dresses)
  ☐ Black Belt (29.99, Accessories)

After adding products:
☐ Refresh your website
☐ Go to #/shop
☐ Products should appear!

====================================================================
COMMON ISSUES & FIXES (TROUBLESHOOTING)
====================================================================

ISSUE: "VITE_SUPABASE_URL is not defined"
---
☐ Check .env file has the right values
☐ Make sure there are NO spaces around the =
☐ Save the file
☐ Restart dev server (Ctrl+C, then npm run dev)

ISSUE: "Cannot read property 'data' of undefined"
---
☐ Make sure you ran the SQL script to create tables
☐ Check the SQL ran without errors in Supabase
☐ Go to Table Editor to verify tables exist

ISSUE: Signup button does nothing
---
☐ Open browser console (F12 > Console tab)
☐ Look for red error messages
☐ Check browser console for specific error
☐ Verify .env variables are set

ISSUE: "Email already exists" error
---
☐ This is normal - means email is registered
☐ Use a different email address

ISSUE: Products don't show on shop page
---
☐ Go to Supabase > products table
☐ Add sample products (TASK 10)
☐ Refresh the website

ISSUE: Order not being created
---
☐ Make sure you're logged in
☐ Check browser console (F12) for errors
☐ Verify shipping address is filled in
☐ Try adding a product to cart first

ISSUE: "401 Unauthorized"
---
☐ Your ANON KEY is wrong
☐ Get a fresh key from Settings > API
☐ Copy the exact "anon public" key
☐ Update .env and restart

====================================================================
ADVANCED: ADDING REAL DATA
====================================================================

ADD REAL PRODUCTS:
---
Option 1: Import CSV
☐ Create spreadsheet with:
  - name, price, stock, category, image_url, description
☐ Export as CSV
☐ Go to Supabase > products > Import data
☐ Upload CSV

Option 2: Batch insert SQL
☐ Go to SQL Editor
☐ Run queries like:
   INSERT INTO products (name, price, stock, category)
   VALUES ('Product Name', 99.99, 100, 'Category');

UPLOAD PRODUCT IMAGES:
---
☐ Go to Storage > products bucket
☐ Click Upload
☐ Select images from your computer
☐ After upload, click the filename
☐ Copy the Public URL
☐ Go to products table
☐ Update image_url column with the URL

CREATE DISCOUNT COUPONS:
---
☐ Go to coupons table
☐ Click Insert row
☐ Fill in:
  ☐ code: WELCOME10 (must be unique)
  ☐ description: 10% off first purchase
  ☐ discount_type: percentage
  ☐ discount_value: 10
  ☐ max_uses: 100
  ☐ active: true
  ☐ expiry_date: 2025-12-31
☐ Click Save

====================================================================
NEXT: PAYMENT TESTING
====================================================================

Your Razorpay integration is ready to use!

To test payments:
---
☐ Get test API keys from https://dashboard.razorpay.com
☐ Update VITE_RAZORPAY_KEY_ID in .env
☐ Place an order through checkout
☐ Use Razorpay test card: 4111 1111 1111 1111
☐ Use any future expiry date, any CVV
☐ Order should be created in database

====================================================================
GOING LIVE CHECKLIST
====================================================================

Before going to production:

☐ Enable Row Level Security (RLS) on tables
  (See SUPABASE_SETUP.md for details)

☐ Replace placeholder images with real product images
  1. Upload images to Storage > products bucket
  2. Get public URLs
  3. Update products table

☐ Set up email notifications
  1. Go to Authentication > Email Templates
  2. Customize welcome/order confirmation emails
  3. Enable email verification

☐ Switch to production Razorpay keys
  1. Get production keys from Razorpay dashboard
  2. Update VITE_RAZORPAY_KEY_ID

☐ Set environment variables on hosting
  (Vercel, Heroku, AWS, etc.)

☐ Test complete flow in production

====================================================================
HELPFUL DOCUMENTATION
====================================================================

In your project folder:
- SUPABASE_SETUP.md - Detailed 12-part setup guide
- SUPABASE_QUICK_START.md - Quick reference guide
- SUPABASE_INTEGRATION.md - Technical overview

Online:
- Supabase Docs: https://supabase.com/docs
- Supabase Auth Guide: https://supabase.com/docs/guides/auth
- Supabase Database: https://supabase.com/docs/guides/database

====================================================================
SUPPORT
====================================================================

If you get stuck:

1. Check browser console (F12) for error messages
2. Review SUPABASE_QUICK_START.md troubleshooting
3. Check Supabase dashboard for issues
4. Visit Supabase Discord: https://discord.supabase.io
5. Read Supabase docs: https://supabase.com/docs

====================================================================
YOU'RE ALL SET!
====================================================================

✅ Backend: Supabase (PostgreSQL)
✅ Authentication: Supabase Auth
✅ Payment: Razorpay
✅ Frontend: Fully integrated

Your ecommerce platform is ready to:
- Accept user registrations
- Process orders
- Store customer data
- Handle payments
- Manage inventory

Happy selling! 🎉

====================================================================
