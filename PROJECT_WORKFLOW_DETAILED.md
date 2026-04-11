# OneStop Cloudflare Project Workflow (Detailed Implementation Guide)

This document explains exactly how this project runs now, with implementation-level detail across frontend, API, database, storage, auth, checkout, and metrics.

It is written to match the current code in:
- src/utils/cloudflare.js
- cloudflare/worker.js
- cloudflare/schema.sql
- cloudflare/wrangler.toml
- src/main.js
- src/pages/checkout.js
- src/utils/razorpay.js
- src/utils/image-optimization.js

---

## 1. Runtime Model: Two Modes in One Codebase

The frontend data layer is centralized in `src/utils/cloudflare.js` and works in **two modes**:

1. Remote API mode (production-intended)
- Trigger: `VITE_CLOUDFLARE_API_BASE_URL` is set.
- Behavior: frontend functions call Cloudflare Worker REST endpoints.
- Source of truth: D1 + R2 + Worker logic.

2. Local fallback mode (dev safety net)
- Trigger: `VITE_CLOUDFLARE_API_BASE_URL` is empty.
- Behavior: same frontend functions use localStorage/sessionStorage and seed product JSON.
- Source of truth: browser storage + `src/data/products.json`.

### Why this matters
- You can keep building UI even before Worker deployment.
- Real metrics/user counts only become meaningful in Remote API mode.

---

## 2. Environment Variables and Their Exact Effects

### Frontend environment variables

`VITE_CLOUDFLARE_API_BASE_URL`
- Used by `cloudflare.js` to build API URLs.
- If set, every data operation uses Worker HTTP calls.
- If not set, local fallback logic is used.

`VITE_CLOUDFLARE_IMAGE_BASE_URL`
- Used by `cloudflare.js` in `getImageDeliveryUrl(...)`.
- Generates delivery URL: `base?src=<encoded>&w=<width>&format=webp`.

`VITE_CLOUDFLARE_DEV_MODE`
- Parsed in `cloudflare.js` into `cloudflareConfig.devMode`.
- Currently informational in code; fallback behavior is still driven primarily by API base URL presence.

`VITE_RAZORPAY_KEY_ID`
- Read by `src/utils/razorpay.js` constructor.
- Current checkout is dummy modal-based; key is not used for live gateway yet.

`VITE_IMAGE_SERVICE`, `VITE_CLOUDFLARE_DELIVERY_DOMAIN`, `VITE_R2_PUBLIC_BASE_URL`, `VITE_IMAGE_QUALITY`
- Used by `src/utils/image-optimization.js`.
- Controls cloudflare /cdn-cgi/image URL generation and responsive optimization.

### Worker-side config (wrangler)

In `cloudflare/wrangler.toml`:
- `account_id`: Cloudflare account.
- `[[d1_databases]] binding = "DB"`: injects D1 instance into Worker as `env.DB`.
- `[[r2_buckets]] binding = "MEDIA_BUCKET"`: injects bucket as `env.MEDIA_BUCKET`.
- `[vars] APP_ORIGIN`, `R2_PUBLIC_URL`: worker runtime vars.

---

## 3. Frontend Boot and Routing Flow

Entry point is `src/main.js`.

### What happens at startup
1. CSS loads (`main.css`, `shop-cloudflare.css`).
2. Core page modules are imported.
3. Cloudflare helper functions are imported (`getAnnouncementBarMessage`, `getInventoryByProductIds`, `subscribeToInventoryUpdates`, `getCurrentUser`).
4. Seed product JSON is loaded and normalized into in-memory product map.

### Authentication sync on app boot
- `syncStoredUserFromAuth()` calls `getCurrentUser()` from cloudflare helper.
- In API mode: checks `/api/auth/me` session cookie.
- In fallback mode: reads browser session storage.

### Route rendering
The hash-based router renders:
- `#/` home
- `#/shop`
- `#/stock-clearance`
- `#/product/:id`
- `#/cart`
- `#/checkout`
- `#/payment-success`
- `#/payment-failed`
- `#/login`
- `#/signup`
- `#/profile`

---

## 4. Data Layer Contract (cloudflare.js) and What Each Function Does

The file `src/utils/cloudflare.js` is your single frontend backend adapter.

### Auth functions
- `signUp(email, password, userData)`
- `signIn(email, password)`
- `signOut()`
- `getCurrentUser()`
- `getSession()`
- `updateUserProfile(userId, profileData)`

API mode endpoints:
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/me`

Fallback mode:
- Uses local users list in localStorage, includes demo user.

### Catalog and product functions
- `getProducts(...)`
- `getProductsCatalog(options)`
- `getProductsCatalogAdvanced(options)`
- `getStockClearanceProducts(options)`
- `getStockClearanceCategories()`
- `getProduct(id)`
- `getTaxonomyTree()`
- `getInventoryTaxonomy()`

API mode endpoints:
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/clearance`
- `GET /api/products/clearance/categories`
- `GET /api/taxonomy`

### User interaction lists
- `getUserWishlist()`
- `toggleWishlistProductSync(productId)`
- `getUserCompare()`
- `toggleCompareProductSync(productId)`

API mode endpoints:
- `GET /api/wishlist`
- `POST /api/wishlist/toggle`
- `GET /api/compare`
- `POST /api/compare/toggle`

### Inventory + checkout support
- `getInventoryByProductIds(ids)`
- `reserveInventory(items)`
- `releaseInventory(items)`

API mode endpoints:
- `GET /api/inventory?ids=...`
- `POST /api/inventory/reserve`
- `POST /api/inventory/release`

### Orders and coupon operations
- `createOrder(userId, items, totalAmount, shippingAddress)`
- `getOrders(userId)`
- `updateOrder(orderId, updates)`
- `validateCoupon(code, amount)`
- `redeemCoupon(code, userId)`

API mode endpoints:
- `GET /api/orders?userId=...`
- `POST /api/orders`
- `PUT /api/orders/:id`
- `POST /api/coupons/validate`
- `POST /api/coupons/redeem`

### Announcement bar
- `getAnnouncementBarMessage()` -> `GET /api/announcement`
- `updateAnnouncementBarMessage(message)` -> `PUT /api/announcement`

### Sync hooks
- `subscribeToInventoryUpdates(callback)`
- `subscribeCatalogRealtime(callback)`

Current behavior in API mode:
- polls inventory every 30 seconds (not true websocket realtime).

---

## 5. Worker API Internal Mechanics (cloudflare/worker.js)

### Request lifecycle
1. CORS preflight: OPTIONS returns allow headers.
2. Path normalized (trailing slash removed).
3. Route switch executes handler.
4. Handler reads JSON, queries D1, and returns JSON response.

### Global helper functions and purpose
- `json(data, init)`: standardized JSON response writer.
- `corsHeaders(origin)`: CORS policy.
- `readJson(request)`: safe body parser.
- `cookieMap(request)`: parse cookie header.
- `sha256(value)`: password hash function for auth.

### Session model
- Session cookie key: `session`.
- `sessions` table stores token and user_id.
- `getSessionUser(...)` loads session from cookie, then user from D1.

### Product filtering logic
`applyProductFilters(...)` supports query params:
- category
- subcategory
- search (name/description LIKE)
- minPrice
- maxPrice
- onlyActive
- clearance
- sort (newest, price-asc, price-desc, name-asc, name-desc)
- limit, offset

### Implemented endpoints
- `GET /health`
- `GET/PUT /api/announcement`
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/me`
- `GET/POST /api/products`
- `GET /api/products/:id`
- `GET /api/products/clearance`
- `GET /api/products/clearance/categories`
- `GET /api/taxonomy`
- `GET /api/inventory`
- `POST /api/inventory/reserve`
- `POST /api/inventory/release`
- `GET/POST /api/orders`
- `PUT /api/orders/:id`
- `POST /api/coupons/validate`
- `POST /api/coupons/redeem`
- `GET /api/wishlist`
- `POST /api/wishlist/toggle`
- `GET /api/compare`
- `POST /api/compare/toggle`

### Important constraints in current Worker
1. Password hashing is SHA-256 without salt rounds or KDF hardening.
2. Compare list max = 4 products enforced in handler.
3. Reserve inventory checks stock then updates batch; no explicit SQL transaction block around read+write.
4. Orders are currently queryable by `userId` parameter without session ownership validation in handler.

---

## 6. D1 Data Model and Table-by-Table Purpose

Defined in `cloudflare/schema.sql`.

### products
- Core catalog rows.
- Category and subcategory are plain text fields.
- `taxonomy_id` can link into taxonomy tree.

### taxonomy
- Category hierarchy.
- `parent_id`, `depth`, `sort_order` organize tree.

### inventory
- Separate stock table by `product_id`.
- Used by reserve/release endpoints.

### users
- Auth user records.
- `user_json` stores metadata.

### sessions
- Login sessions by token.
- Token is used as cookie value.

### orders
- Checkout orders with serialized `items_json` and `shipping_json`.
- Payment identifiers stored for post-payment reconciliation.

### wishlist_items / compare_items
- User-product mapping tables.

### coupons / coupon_redemptions
- Coupon definitions and usage records.

### announcements
- Top bar message history, latest row used as current message.

---

## 7. Checkout and Payment Flow (Exact Sequence)

Main logic in `src/pages/checkout.js` plus `src/utils/razorpay.js`.

### Sequence from button click
1. Validate checkout form fields.
2. Verify user exists in sessionStorage.
3. Build shipping payload and totals.
4. Pre-check live inventory with `getInventoryByProductIds(...)`.
5. Block if cart quantity exceeds available stock.
6. Reserve inventory with `reserveInventory(...)`.
7. Create order with `createOrder(...)`.
8. Persist order context to sessionStorage and localStorage (`currentOrder`).
9. Open dummy Razorpay modal.

### Dummy payment outcomes
Success button:
- Generates payment IDs.
- Stores `lastPayment` in localStorage.
- Navigates to `#/payment-success`.

Failure button:
- Stores `lastPaymentError` in localStorage.
- Navigates to `#/payment-failed`.

Dismiss/Cancel:
- Treated as failed flow.

### Post-payment pages
`payment-success` page:
- Calls `updateOrder(...)` with confirmed/completed status and payment IDs.

`payment-failed` page:
- Calls `releaseInventory(...)`.
- Calls `updateOrder(...)` with failed status.

---

## 8. Product Image Delivery Pipeline (Current and Recommended)

Image behavior spans:
- `src/utils/image-optimization.js`
- `src/utils/cloudflare.js`
- page renderers (home/shop/product/stock-clearance)

### Current frontend behavior
1. Product image source from `image_url` or `image`.
2. `getProductImageAttrs(...)` returns:
- optimized `src`
- responsive `srcset`
- computed `sizes`
- SVG gradient placeholder
3. `initLazyLoading()` attaches IntersectionObserver.
4. Image loads when near viewport (`rootMargin: 50px`).

### Cloudflare optimization route logic
- If `VITE_IMAGE_SERVICE=cloudflare` and delivery domain exists:
  `https://<delivery-domain>/cdn-cgi/image/format=auto,quality=<q>,fit=cover,width=<w>/<source-url>`

### Google image URL handling
- For `googleusercontent.com` and `ggpht.com`, width param is appended.

### Recommended production image asset pattern in R2
Object keys:
- `products/<slug>/main-1200.webp`
- `products/<slug>/main-800.webp`
- `products/<slug>/main-480.webp`

Product DB `image_url` should point to stable R2 public/custom URL.

---

## 9. How To Add First Category and First Product (Operational Steps)

Use these exact SQL examples in D1 SQL console.

### Create category in taxonomy
```sql
INSERT INTO taxonomy (id, name, slug, parent_id, depth, sort_order, active)
VALUES ('cat_bags', 'Bags', 'bags', NULL, 1, 1, 1);
```

Optional subcategory:
```sql
INSERT INTO taxonomy (id, name, slug, parent_id, depth, sort_order, active)
VALUES ('sub_tote_bags', 'Tote Bags', 'tote-bags', 'cat_bags', 2, 1, 1);
```

### Insert first product row
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

### Insert matching inventory row
```sql
INSERT INTO inventory (product_id, stock)
VALUES ('prod_bag_001', 10);
```

### Upload product image to R2
1. Upload image object to bucket path like:
- `products/classic-tote-bag/main-1200.webp`
2. Get public/custom URL.
3. Update product image_url:
```sql
UPDATE products
SET image_url = 'https://media.your-domain.com/products/classic-tote-bag/main-1200.webp'
WHERE id = 'prod_bag_001';
```

### Verify product appears
- Open `#/shop`.
- Confirm card renders with image.
- Confirm `#/product/prod_bag_001` equivalent route by product id type used in app (numeric preferred in current frontend parsers).

Note: Current frontend often parses IDs using `Number(...)`. Keep IDs numeric in production to avoid type mismatch.

---

## 10. Auth and Session Behavior in Detail

### Sign-up
1. Frontend sends email/password/userData to `/api/auth/sign-up`.
2. Worker hashes password (`sha256`).
3. Worker inserts into `users`.
4. Worker creates session token in `sessions`.
5. Worker sets `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax`.

### Sign-in
1. Frontend posts credentials.
2. Worker hashes supplied password and compares in D1.
3. New session token is created and cookie is set.

### Authenticated reads
- Wishlist/compare endpoints call `getSessionUser(...)`.
- If no valid session cookie, returns 401.

### Sign-out
- Worker removes session token and expires cookie.

---

## 11. Metrics, Observability, and Business Reporting

### A. Logged-in users (active sessions)
D1 SQL:
```sql
SELECT COUNT(*) AS active_sessions FROM sessions;
```

Recent sessions:
```sql
SELECT user_id, created_at FROM sessions ORDER BY created_at DESC LIMIT 100;
```

### B. Total users
```sql
SELECT COUNT(*) AS total_users FROM users;
```

### C. Traffic and API metrics
Cloudflare Dashboard -> Workers and Pages -> your Worker -> Analytics/Observability.
Track:
- requests
- status code breakdown
- error rate
- latency p50/p95
- top routes

### D. Website analytics
Cloudflare Web Analytics:
- unique visitors
- page views
- countries/devices
- bandwidth trends

### E. Database and storage usage
D1 dashboard:
- query volume
- storage size

R2 dashboard:
- object count
- stored GB
- operation classes and egress

---

## 12. Security and Correctness Hardening Checklist

1. Replace SHA-256 auth with strong password hashing (Argon2id or bcrypt with cost factor).
2. Enforce order ownership in `/api/orders` read/update operations.
3. Add transaction-safe reserve/release logic (single atomic operation).
4. Add server-side schema validation for all POST/PUT payloads.
5. Add rate limits for auth, inventory reserve, and order creation routes.
6. Add structured logs and alerting for 5xx spikes.
7. Ensure CORS allowlist uses exact frontend origin in production.

---

## 13. Deployment Procedure (Exact Sequence)

1. Configure placeholders in `cloudflare/wrangler.toml`.
2. Create D1 and R2 resources in Cloudflare.
3. Bind resources in wrangler config.
4. Apply schema from `cloudflare/schema.sql`.
5. Deploy Worker from `cloudflare/worker.js`.
6. Set frontend env values:
- `VITE_CLOUDFLARE_API_BASE_URL`
- `VITE_CLOUDFLARE_IMAGE_BASE_URL`
- image optimization vars if using Cloudflare image route
7. Build and deploy frontend.
8. Verify health endpoint and first catalog fetch.
9. Run one full checkout success and one failure test.
10. Validate orders and inventory changes in D1.

---

## 14. Troubleshooting Matrix (By Symptom)

### Symptom: Product not visible on shop page
Check:
1. `products.active = 1`
2. query filters (category/subcategory/search)
3. worker route `/api/products` response content
4. ID type compatibility (numeric expected in many frontend paths)

### Symptom: Image not loading
Check:
1. `products.image_url` value opens directly in browser
2. R2 object path and public access
3. `VITE_CLOUDFLARE_IMAGE_BASE_URL` correctness
4. any /cdn-cgi/image URL rewrite issues

### Symptom: Login works locally but not in deployed env
Check:
1. API base URL set correctly
2. session cookie flags and domain
3. HTTPS usage (Secure cookie requires HTTPS)
4. CORS origin config

### Symptom: Checkout reserve fails
Check:
1. `inventory` rows exist for all cart products
2. stock values are sufficient
3. payload item IDs are numeric and match DB values

### Symptom: Metrics look zero
Check:
1. app running in fallback mode (no API base URL)
2. Worker route is not actually receiving requests
3. dashboard environment (prod vs preview) selected correctly

---

## 15. Current Known Behavior Notes (Important)

1. Dummy payment flow is intentional and active.
2. Polling-based inventory sync is used instead of true realtime stream.
3. Some parts of frontend parse IDs numerically, so numeric product IDs are safest.
4. Local fallback can hide backend issues during development unless API mode is enforced.

---

## 16. Recommended Next Implementation Milestones

1. Convert all product and taxonomy IDs to a single consistent type policy (numeric or stable string).
2. Add full auth hardening (password hashing + session expiry + token rotation).
3. Add admin-only product/category management endpoints.
4. Add migration scripts for seed data load into D1.
5. Replace dummy Razorpay flow with verified server-side signature flow.

---

Document version: 2026-04-09
Project: OneStop (Cloudflare D1 + R2 + Worker + Vite frontend)
