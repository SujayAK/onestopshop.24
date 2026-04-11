# First-Time Cloudflare Setup, Deployment, and Product Entry Guide

This guide is written for someone doing this for the first time.
It covers the full path from project setup to:
- running the app locally
- deploying the backend
- creating your first category
- creating your first product
- uploading the first product image
- testing login and session sign-in
- checking users, traffic, and usage metrics

This guide matches the current Cloudflare-based project structure.

---

## 1. What You Are Setting Up

Your app now works with these parts:

- Frontend: Vite app in `src/`
- API backend: Cloudflare Worker in `cloudflare/worker.js`
- Database: Cloudflare D1 using `cloudflare/schema.sql`
- Image storage: Cloudflare R2 bucket
- Auth sessions: stored in D1 `users` and `sessions` tables
- Payments: dummy Razorpay simulator for testing checkout flow

The frontend reads data through `src/utils/cloudflare.js`.

---

## 2. Before You Start

You need these accounts and access:

- Cloudflare account
- Cloudflare dashboard access to Workers, D1, and R2
- Your code opened in VS Code
- A terminal in the project folder

You also need to know your domain status:

- If DNS propagation is still pending, use the `workers.dev` URL first
- Do not wait for domain propagation to finish before testing the app

---

## 3. Open the Project in VS Code

1. Open VS Code.
2. Open the folder `c:\Users\Admin\WebstormProjects\onestop`.
3. In the file explorer, confirm you can see:
- `src/`
- `cloudflare/`
- `package.json`

4. Open `cloudflare/wrangler.toml`.
5. Keep this file open while you configure Cloudflare.

---

## 4. Install Project Dependencies Locally

Do this once in the terminal.

1. Open the VS Code terminal.
2. Make sure you are inside the project root folder.
3. Run the install command:

```bash
npm install
```

4. Wait until installation completes without errors.

If the terminal shows missing package errors later, this is the first thing to rerun.

---

## 5. Set Up Cloudflare Resources

You need two backend resources:

- D1 database for structured data
- R2 bucket for product images

### 5.1 Create the D1 database

1. Open the Cloudflare dashboard.
2. Go to **Workers & Pages**.
3. Find **D1** in the sidebar or products list.
4. Click **Create database**.
5. Name it:
   - `onestop-db`
6. Save it.
7. Copy the database ID or keep the dashboard open for the next step.

### 5.2 Create the R2 bucket

1. In the Cloudflare dashboard, go to **R2**.
2. Click **Create bucket**.
3. Name it:
   - `onestop-media`
4. Save it.
5. If you plan to serve images publicly, configure a public access strategy or a public/custom delivery domain.

### 5.3 Why these two are separate

- D1 stores rows like products, users, orders, sessions, and taxonomy
- R2 stores the actual image files
- The database stores the image URL, not the image binary itself

---

## 6. Configure Wrangler

Open `cloudflare/wrangler.toml`.

You will replace placeholder values:

- `YOUR_CLOUDFLARE_ACCOUNT_ID`
- `YOUR_D1_DATABASE_ID`
- `https://your-domain.com`
- `https://media.your-domain.com`

### What each field means

- `account_id`: your Cloudflare account identifier
- `database_id`: the D1 database binding target
- `APP_ORIGIN`: the final website origin that the Worker should accept
- `R2_PUBLIC_URL`: the public media base URL for images

### Important

If you do not have your final custom domain yet, you can still deploy using the temporary `workers.dev` hostname.

For development purpose only:
- use the `workers.dev` hostname first
- do not wait for DNS propagation to finish before testing
- keep the final custom domain for production later

---

## 7. Apply the D1 Database Schema

This creates the tables the app expects.

### Option A: Use Cloudflare dashboard SQL editor

1. Open Cloudflare dashboard.
2. Go to **D1**.
3. Open your database `onestop-db`.
4. Click **Execute SQL** or **Console**.
5. Open `cloudflare/schema.sql`.
6. Copy the full SQL content.
7. Paste it into the SQL editor.
8. Click **Run**.

### Option B: Use Wrangler

If you prefer command line later, you can apply SQL with Wrangler, but dashboard SQL is easier for a first-time setup.

### What the schema creates

It creates these tables:
- `products`
- `taxonomy`
- `inventory`
- `users`
- `sessions`
- `orders`
- `wishlist_items`
- `compare_items`
- `coupons`
- `coupon_redemptions`
- `announcements`

---

## 8. Deploy the Cloudflare Worker

This Worker is the API backend.

### 8.1 What the Worker does

It serves endpoints for:
- product lists
- product detail
- category taxonomy
- inventory read/update
- order creation
- sign-up, sign-in, sign-out, me
- wishlist and compare lists
- coupons
- announcement bar

### 8.2 Deploy from VS Code terminal

1. Make sure Wrangler is installed or available via `npx`.
2. From the project root, run:

```bash
npx wrangler deploy --config cloudflare/wrangler.toml
```

3. Wait for deployment to finish.
4. Copy the deployed Worker URL.

### 8.3 First health check

Open the Worker URL in a browser and test:

- `https://your-worker-url/health`

If you are using the temporary Cloudflare Worker URL, it will usually look like:

- `https://onestop-storefront.<your-subdomain>.workers.dev/health`

Expected result:
- JSON response with success true and status ok

If that endpoint fails, fix deployment before moving on.

---

## 9. Connect the Frontend to the Worker

The frontend reads Cloudflare API settings from environment variables.

### 9.1 Add frontend env values

Create or update your `.env` file in the project root with values like:

```env
VITE_CLOUDFLARE_API_BASE_URL=https://onestop-storefront.<your-subdomain>.workers.dev
VITE_CLOUDFLARE_IMAGE_BASE_URL=https://media.your-domain.com
VITE_CLOUDFLARE_DEV_MODE=true
```

For development purpose, point `VITE_CLOUDFLARE_API_BASE_URL` to the `workers.dev` URL first.
When your DNS is active and the custom domain is ready, replace it with the final domain and restart `npm run dev`.

If you are using a custom delivery domain or image proxy, use that URL instead of the placeholder.

### 9.2 Why these values matter

- `VITE_CLOUDFLARE_API_BASE_URL` tells the browser where to fetch products, users, orders, and auth
- `VITE_CLOUDFLARE_IMAGE_BASE_URL` tells the browser how to turn image source URLs into public delivery URLs

### 9.3 Restart the dev server after editing env files

Any time you change `.env`, restart the frontend dev server.

---

## 10. Run the Frontend Locally

### 10.1 Start local development server

From the project root:

```bash
npm run dev
```

### 10.2 Open the local app

1. Watch the terminal for the local URL.
2. Usually it will be something like:
   - `http://localhost:5173`
3. Open that URL in the browser.

### 10.3 What you should see

- the home page
- navbar
- announcement bar
- product sections using seed data or Worker data

If the app opens but no products load, check API base URL and Worker availability.

---

## 11. Create Your First Category

A category lives in the `taxonomy` table.

### 11.1 Go to the D1 SQL console

1. Open Cloudflare dashboard.
2. Go to **D1**.
3. Open your database.
4. Click **Execute SQL**.

### 11.2 Insert a top-level category

Paste this SQL:

```sql
INSERT INTO taxonomy (id, name, slug, parent_id, depth, sort_order, active)
VALUES ('cat_bags', 'Bags', 'bags', NULL, 1, 1, 1);
```

### 11.3 What this means

- `id`: internal identifier
- `name`: visible label on the website
- `slug`: URL-friendly version of the name
- `parent_id`: empty for a top-level category
- `depth`: 1 means top-level
- `sort_order`: ordering priority in menus or lists
- `active`: 1 means visible

### 11.4 Add a subcategory if you want

Example:

```sql
INSERT INTO taxonomy (id, name, slug, parent_id, depth, sort_order, active)
VALUES ('sub_tote_bags', 'Tote Bags', 'tote-bags', 'cat_bags', 2, 1, 1);
```

### 11.5 Verify the category exists

Run:

```sql
SELECT * FROM taxonomy ORDER BY depth, sort_order, name;
```

You should see the category row you inserted.

---

## 12. Create Your First Product

A product lives in the `products` table.

### 12.1 Insert the product row

Paste this SQL:

```sql
INSERT INTO products (
  id, name, category, subcategory, price, image_url, description, stock, active, discount, taxonomy_id
) VALUES (
  'prod_bag_001',
  'Classic Tote Bag',
  'Bags',
  'Tote Bags',
  1299,
  '',
  'Premium tote bag for daily use',
  10,
  1,
  0,
  'sub_tote_bags'
);
```

### 12.2 Insert inventory for the same product

Paste this SQL:

```sql
INSERT INTO inventory (product_id, stock)
VALUES ('prod_bag_001', 10);
```

### 12.3 Why inventory is separate

- `products.stock` is the product-level field
- `inventory.stock` is what the Worker uses for live reserve/release operations
- Keep them aligned when you manually add items

### 12.4 Verify the product exists

Run:

```sql
SELECT * FROM products ORDER BY created_at DESC;
```

And:

```sql
SELECT * FROM inventory ORDER BY updated_at DESC;
```

---

## 13. Upload the First Product Image

This is the part where first-time users often get stuck, so follow it carefully.

### 13.0 If your images are in ZIP format (important)

The website cannot load a `.zip` file directly. You must extract it first.

1. On Windows, go to your ZIP file.
2. Right click -> **Extract All...**
3. Choose a folder, for example:
   - `C:\Users\Admin\Pictures\onestop-products-extracted`
4. Open the extracted folder and verify the files are image files (`.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`).
5. If extracted images are very large, convert/compress before upload (recommended).

### 13.1 Prepare the image

Your image source should be:
- a clean product photo
- preferably exported from Google Photos/Google Album at high quality
- cropped to a 4:5 product ratio if possible

### 13.2 Convert to WebP before upload

Use a WebP version because the site is optimized for modern image delivery.

Recommended naming:
- `main-1200.webp`
- `main-800.webp`
- `main-480.webp`

If ZIP contains only JPG/PNG and you want quick first test:
- You can upload JPG/PNG first.
- Later replace with WebP while keeping same object path if possible.

### 13.3 Upload to R2

1. Open Cloudflare dashboard.
2. Go to **R2**.
3. Open bucket `onestop-media`.
4. Click **Upload**.
5. Upload your WebP file.
6. Put it in a clean path such as:
   - `products/classic-tote-bag/main-1200.webp`

If you have many extracted files:
- Upload one product folder at a time to avoid path mistakes.
- Keep file names simple (lowercase, hyphen, no spaces).

### 13.4 Make the file publicly reachable

You need a URL that your browser can load.

Depending on your setup, this could be:
- public R2 URL
- custom media domain
- Worker media proxy URL

### 13.5 Update the product row with the image URL

Run:

```sql
UPDATE products
SET image_url = 'https://media.your-domain.com/products/classic-tote-bag/main-1200.webp'
WHERE id = 'prod_bag_001';
```

### 13.6 Verify the image URL in browser

Open the exact image URL in a browser tab.

If it does not load:
- check the bucket object path
- check public access / domain mapping
- check the URL copied into `image_url`

---

## 14. Test the Product on the Website

1. Open the app.
2. Go to the **Shop** page.
3. Look for the category and product card.
4. Open the product detail page.
5. Confirm the product image loads.
6. Test on mobile width and desktop width.

### What should happen

- the category should appear in lists and filters
- the product card should show image, name, price
- the product detail view should use the same product row

If nothing appears, inspect the browser console and verify your Worker is serving products.

---

## 15. How Login and Sign-In Sessions Work

This app stores logged-in users through the Cloudflare auth flow.

### 15.1 Sign-up flow

1. User goes to `#/signup`.
2. User fills first name, last name, email, password.
3. Frontend calls `signUp(...)` in `src/utils/cloudflare.js`.
4. If API mode is enabled, the Worker receives `POST /api/auth/sign-up`.
5. Worker hashes the password.
6. Worker inserts the new user into `users`.
7. Worker creates a session token in `sessions`.
8. Browser receives a session cookie.
9. Frontend stores user in sessionStorage.

### 15.2 Sign-in flow

1. User goes to `#/login`.
2. User enters email and password.
3. Frontend calls `signIn(...)`.
4. Worker checks credentials against D1.
5. If valid, a new session token is created.
6. Session cookie is set in the browser.
7. Frontend stores session user in sessionStorage.

Demo credentials for first-time testing (backend mode):
- Email: `demo@onestopshop.com`
- Password: `Demo@123`

The backend now auto-provisions this demo user if it does not exist yet.

### 15.3 Sign-out flow

1. User clicks sign out.
2. Frontend calls `signOut()`.
3. Worker deletes session token from D1.
4. Browser cookie is cleared.
5. sessionStorage user is removed.

### 15.4 How to verify a user is logged in

Use D1 SQL:

```sql
SELECT COUNT(*) AS active_sessions FROM sessions;
```

To see active session rows:

```sql
SELECT user_id, created_at FROM sessions ORDER BY created_at DESC;
```

To see registered users:

```sql
SELECT COUNT(*) AS total_users FROM users;
```

### 15.5 Where the browser stores login state

- `sessionStorage.user` keeps the current user in the browser
- D1 `sessions` keeps the server-side session token
- This means the app uses both browser state and database-backed session state

---

## 16. How Checkout, Inventory, and Dummy Payment Work

### 16.1 Checkout entry point

Open `#/checkout` from the cart.

### 16.2 What happens when user clicks Proceed to Payment

1. Form validation checks required fields.
2. User session is verified.
3. Live inventory is fetched.
4. Checkout blocks if stock is too low.
5. Inventory is reserved.
6. Order is created in D1.
7. Dummy Razorpay modal opens.

### 16.3 Dummy Razorpay modal

The modal in `src/utils/razorpay.js` offers:
- success
- failure
- cancel

These choices simulate payment results so you can test the order lifecycle before using a real gateway.

### 16.4 Success path

1. Payment success stores `lastPayment`.
2. App navigates to `#/payment-success`.
3. Order status is updated to confirmed/completed.

### 16.5 Failure path

1. Payment failure stores `lastPaymentError`.
2. App navigates to `#/payment-failed`.
3. Inventory is released.
4. Order status is updated to failed.

---

## 17. Where to See Users, Traffic, and Metrics

### 17.1 Logged-in users

The current active login sessions are in D1.

Run:

```sql
SELECT COUNT(*) AS active_sessions FROM sessions;
```

Where to click in Cloudflare:
1. Dashboard -> **Workers & Pages** -> **D1**.
2. Open database `onestop-db`.
3. Click **Console** or **Query**.
4. Paste SQL and click **Run**.

### 17.2 Total registered users

Run:

```sql
SELECT COUNT(*) AS total_users FROM users;
```

### 17.3 Website traffic and API traffic

Go to Cloudflare dashboard:

1. Open **Workers & Pages**.
2. Select your Worker.
3. Open **Analytics** or **Observability**.

You will see:
- requests
- traffic volume
- errors
- latency
- top endpoints

Detailed click path:
1. Dashboard -> **Workers & Pages**.
2. Click your Worker service (from `wrangler.toml`, name is `onestop-storefront`).
3. Open **Metrics** / **Analytics** tab.
4. For logs, open **Observability** / **Logs** tab.

### 17.4 D1 usage

Go to:
- **D1**
- your database

You can see:
- query activity
- storage usage
- performance information

To inspect rows directly:
1. Open D1 database.
2. Run SQL like:
```sql
SELECT * FROM users ORDER BY created_at DESC;
SELECT * FROM sessions ORDER BY created_at DESC;
SELECT * FROM products ORDER BY created_at DESC;
SELECT * FROM orders ORDER BY created_at DESC;
```

### 17.5 R2 usage

Go to:
- **R2**
- your bucket

You can see:
- object count
- storage size
- requests/operations
- bandwidth or egress usage

To view uploaded product images in Cloudflare:
1. Dashboard -> **R2**.
2. Open bucket `onestop-media`.
3. Browse folder path (`products/...`).
4. Click object to view details and copy URL/path.

### 17.6 Security events and limits

Go to Cloudflare security areas and check:
- WAF events
- bot traffic
- rate limit blocks
- blocked requests

Worker deployment status check:
1. In VS Code terminal, you already ran deploy successfully.
2. Open Worker URL shown in deploy output.
3. Visit `/health` endpoint and confirm success.

---

## 18. How to Run the App Day to Day

### Start local development

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Deploy the Worker

```bash
npx wrangler deploy --config cloudflare/wrangler.toml
```

### Restart after env changes

If you change `.env`, always restart the dev server.

---

## 19. What to Check If Something Does Not Work

### If products do not load
- confirm `VITE_CLOUDFLARE_API_BASE_URL` is set
- confirm Worker is deployed
- confirm `/health` returns success
- confirm the products table has rows

### If login does not work
- confirm `users` table has the user
- confirm `sessions` table gets a row
- confirm cookies are allowed in browser
- confirm HTTPS is enabled in production

Also check API URL correctness:
- `VITE_CLOUDFLARE_API_BASE_URL` should be Worker base URL (with or without `/api` both supported).
- After changing `.env`, restart `npm run dev`.

### If images do not load
- confirm `image_url` is a real public URL
- confirm the R2 file exists
- confirm the media domain is correct
- confirm the image URL loads directly in browser

### If checkout fails
- confirm inventory rows exist
- confirm stock is enough
- confirm the cart item IDs match product IDs
- confirm the Worker API base URL is correct

---

## 20. First-Time Success Sequence

If you want the safest first-time path, do it in this exact order:

1. Install dependencies with `npm install`
2. Create D1 database
3. Create R2 bucket
4. Fill placeholders in `cloudflare/wrangler.toml`
5. Apply `cloudflare/schema.sql`
6. Deploy Worker
7. Set frontend env variables
8. Run `npm run dev`
9. Insert first taxonomy row
10. Insert first product row
11. Upload first image to R2
12. Update `image_url`
13. Open the app and verify the product appears
14. Sign up a test user
15. Sign in with that user
16. Check `sessions` table for active login
17. Test checkout with the dummy payment flow
18. Verify order row and inventory updates
19. Check Cloudflare analytics for traffic and usage

---

## 21. Practical Rule to Remember

- D1 stores the record
- R2 stores the image
- Worker connects both
- Frontend displays both
- sessions table tells you who is logged in
- Cloudflare analytics tells you traffic and usage

---

Document date: 2026-04-09
