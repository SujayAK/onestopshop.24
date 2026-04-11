# Cloudflare D1 + R2 Migration Guide for OneStop

This project currently uses Supabase in `src/utils/supabase.js` for:
- auth
- product catalog and inventory reads
- wishlist/compare
- order lifecycle
- coupon validation
- realtime inventory sync

## Recommended migration approach

Do this in phases to avoid checkout/auth breakage.

### Phase 1 (Now): Keep Supabase, move media + CDN first
- Keep app logic as-is for auth/orders/catalog APIs.
- Move product images to Cloudflare R2.
- Serve images through your proxied domain and Cloudflare image resizing (`/cdn-cgi/image/...`).
- Use new env vars in this app:
  - `VITE_IMAGE_SERVICE=cloudflare`
  - `VITE_CLOUDFLARE_DELIVERY_DOMAIN=https://your-domain.com`
  - `VITE_R2_PUBLIC_BASE_URL=https://pub-<id>.r2.dev`
  - `VITE_IMAGE_QUALITY=78`

### Phase 2: Add Cloudflare Worker API
Create Worker endpoints that match current frontend behavior:
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/clearance`
- `GET /api/taxonomy`
- `POST /api/orders`
- `POST /api/inventory/reserve`
- `POST /api/inventory/release`
- `POST /api/wishlist/toggle`
- `POST /api/compare/toggle`

Frontend then switches from Supabase client calls to Worker REST calls.

### Phase 3: Remove Supabase package/client
After all endpoints are switched and tested:
- remove imports from `src/utils/supabase.js`
- remove `@supabase/supabase-js` from `package.json`
- remove old Supabase env vars

## D1 schema baseline

Use D1 for transactional data (catalog, inventory, orders, coupon usage).

Core tables:
- `products`
- `categories`
- `inventory`
- `orders`
- `order_items`
- `wishlist_items`
- `compare_items`
- `coupons`
- `coupon_redemptions`

Notes:
- Store `image_url` in `products` as public R2 URL.
- Keep `stock` in `inventory` and update with atomic SQL transactions.

## Google Album -> R2 media pipeline

Do not hotlink `photos.app.goo.gl` share links directly in production.

Preferred workflow:
1. Export originals from Google Photos (Takeout or album download).
2. Batch convert to WebP and AVIF locally.
3. Generate 4:5 master crops for listing cards.
4. Upload variants to R2 with predictable keys.

Example key structure:
- `products/<product-slug>/main-1200.webp`
- `products/<product-slug>/main-800.webp`
- `products/<product-slug>/main-480.webp`

## Image dimensions (recommended)

For your current UI:
- Listing cards (Shop + Stock Clearance): ratio `4:5`
- Product detail hero: ratio `4:5`

Target widths:
- mobile card: 320 or 480 px
- tablet card: 720 px
- desktop card: 960 px
- detail page: 1200 px

Compression targets:
- WebP quality: 75 to 82
- AVIF quality: 45 to 55 (optional secondary format)

## Cloudflare setup checklist

1. Add domain to Cloudflare.
2. Update nameservers at registrar (wait for propagation).
3. In DNS, keep storefront records proxied (orange cloud).
4. Create R2 bucket (`onestop-media`) and public access strategy:
   - Option A: Public bucket with custom domain
   - Option B: Private bucket + Worker signed delivery
5. Bind R2 bucket to Worker (`MEDIA_BUCKET`).
6. Create D1 database (`onestop-db`) and bind to Worker (`DB`).
7. Deploy Worker routes:
   - `api.your-domain.com/*` for API
   - optional `img.your-domain.com/*` for media control
8. Enable cache rules:
   - cache images aggressively (`Cache-Control: public, max-age=31536000, immutable`)
   - bypass cache for order/auth write endpoints
9. Enable Brotli and HTTP/3 in Cloudflare dashboard.
10. Enable Auto Minify (HTML/CSS/JS) only after UI regression check.
11. Configure WAF + bot protection for `/api/*`.
12. Add rate limits for write endpoints (`/api/orders`, `/api/auth/*`).
13. Set Worker secrets for payment keys and JWT secrets.
14. Configure custom error pages and origin health checks.

## DNS propagation note

While propagation is pending:
- continue developing using `*.workers.dev`
- verify Worker APIs and R2 URLs before switching production DNS
- once active, change frontend env to final domain and run a production build

## Validation before go-live

1. Browse shop and stock-clearance pages on mobile and desktop.
2. Confirm image payloads are WebP/AVIF and responsive widths.
3. Test cart -> checkout -> payment success/failure paths.
4. Test inventory concurrency (same SKU ordered from two sessions).
5. Verify cache headers and Cloudflare analytics (cache hit ratio, bandwidth).
6. Run Lighthouse on key pages and compare before/after.
