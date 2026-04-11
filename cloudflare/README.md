# Cloudflare Setup

This folder contains the Worker, D1 schema, and Wrangler config for OneStop.

## Files
- `worker.js`: API contract for products, auth, inventory, orders, wishlist, compare, coupons, and announcements.
- `schema.sql`: D1 tables.
- `wrangler.toml`: Deployment template with placeholder IDs.

## Placeholder values to replace
- `YOUR_CLOUDFLARE_ACCOUNT_ID`
- `YOUR_D1_DATABASE_ID`
- `https://your-domain.com`
- `https://media.your-domain.com`

## Secrets to keep out of git
Use `wrangler secret put` for anything sensitive:
- `RAZORPAY_KEY_ID` or any future live payment key
- `RAZORPAY_KEY_SECRET`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Deploy flow
1. Create the D1 database.
2. Apply `schema.sql` to D1.
3. Create the R2 bucket.
4. Deploy the Worker with Wrangler.
5. Point the frontend `VITE_CLOUDFLARE_API_BASE_URL` at the Worker route.
6. Point `VITE_CLOUDFLARE_IMAGE_BASE_URL` at your R2/public image domain or image proxy route.
7. Rebuild the frontend with `npm run build`.
