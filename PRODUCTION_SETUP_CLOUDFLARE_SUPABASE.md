# Production Setup Guide (Dynadot + Cloudflare + Pages + Supabase + Razorpay)

This is the final step-by-step guide for this architecture:

- Domain registrar: Dynadot
- DNS/CDN/WAF: Cloudflare
- Frontend hosting: Cloudflare Pages
- Backend/API/Auth/DB: Supabase
- Payment: Razorpay with verified webhook endpoint
- Monitoring: Cloudflare Analytics + Supabase Dashboard

---

## 1. Prerequisites

1. Dynadot domain purchased (onestopshop24.in).
2. Cloudflare account created.
3. GitHub repo connected and up to date.
4. Supabase project created.
5. Razorpay account with test and live keys.

---

## 2. Move Domain DNS from Dynadot to Cloudflare

## 2.1 Add domain in Cloudflare

1. Open Cloudflare Dashboard.
2. Click Add a domain.
3. Enter onestopshop24.in.
4. Choose the plan you want (start with Free).
5. Continue to DNS review.

## 2.2 Update nameservers in Dynadot

1. In Cloudflare, copy the 2 nameservers shown.
2. Open Dynadot domain settings.
3. Set Nameservers to Custom.
4. Paste Cloudflare nameservers.
5. Save.
6. Wait for activation (usually minutes, can be longer).

Result:
- Dynadot remains registrar only.
- Cloudflare becomes DNS authority + CDN + WAF.

---

## 3. Deploy Frontend on Cloudflare Pages

## 3.1 Create Pages project

1. Cloudflare Dashboard -> Workers & Pages.
2. Create application -> Pages -> Connect to Git.
3. Select your GitHub repository.
4. Set:
- Framework preset: Vite
- Build command: npm run build
- Build output directory: dist
5. Start deployment.

## 3.2 Configure custom domains in Pages

1. Open the Pages project.
2. Go to Custom domains.
3. Add:
- www.onestopshop24.in (primary)
- onestopshop24.in (redirect to www)
4. Accept DNS records suggested by Cloudflare.

## 3.3 Enforce HTTPS and security defaults

In Cloudflare:
1. SSL/TLS -> set Full (or Full strict if cert chain is ready).
2. Edge Certificates -> Always Use HTTPS = On.
3. SSL/TLS Recommender warnings -> resolve if any.

---

## 4. Set Production Environment Variables in Cloudflare Pages

In Pages project -> Settings -> Environment variables -> Production, add:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_RAZORPAY_KEY_ID
- VITE_STORE_NAME
- VITE_STORE_EMAIL
- VITE_SUPPORT_PHONE
- VITE_CURRENCY

Important:
- Local .env changes do not update production automatically.
- After changes, trigger a new deployment.

---

## 5. Supabase Production Setup

## 5.1 Auth URL configuration

Supabase -> Authentication -> URL Configuration:

1. Site URL:
- https://www.onestopshop24.in

2. Additional redirect URLs:
- https://www.onestopshop24.in/*
- https://onestopshop24.in/*
- (Optional preview URLs if needed)

## 5.2 Run required SQL migrations

Run in Supabase SQL Editor (in this order):

1. Store settings schema (announcement support):
- SUPABASE_STORE_SETTINGS_SCHEMA.sql

2. Inventory taxonomy + subcategory support:
- SUPABASE_INVENTORY_SCHEMA.sql

3. Any inventory reservation RPC SQL used by your app:
- reserve_inventory
- release_inventory

## 5.3 Security checks

1. Ensure RLS is enabled on user/order sensitive tables.
2. Keep service role key secret (never in frontend).
3. Frontend should only use anon key.

---

## 6. Razorpay Production Setup

## 6.1 Move to live key

1. Razorpay Dashboard -> API Keys.
2. Use live key for production Pages env:
- VITE_RAZORPAY_KEY_ID

## 6.2 Domain and callback settings

1. Add production domain in Razorpay allowed origins/settings:
- https://www.onestopshop24.in
2. Update return/callback URLs to production domain.

## 6.3 Enable verified webhook endpoint (required)

Use a server-side endpoint for signature verification.
Recommended for this stack: Supabase Edge Function.

Webhook flow:
1. Razorpay sends event to webhook URL.
2. Edge Function verifies X-Razorpay-Signature using webhook secret.
3. Only verified events update order/payment status in database.

Minimum events to handle:
- payment.captured
- payment.failed
- order.paid

Never trust only frontend success callback for final payment truth.

---

## 7. Add Cloudflare Security and Traffic Controls

In Cloudflare for your zone:

1. Security -> WAF:
- Enable managed rules.

2. Security -> Bots:
- Enable bot fight mode (as needed).

3. Security -> DDoS:
- Keep default protection enabled.

4. Rules -> Rate Limiting:
- Add limits for sensitive endpoints (login, payment endpoints, webhook path).

5. Caching:
- Keep static assets cached aggressively.
- Do not cache dynamic auth/payment API responses.

---

## 8. Monitoring and Alerts

## 8.1 Cloudflare monitoring

1. Use Web Analytics for traffic, performance, countries, top URLs.
2. Watch cache hit ratio and bandwidth.
3. Review security events (blocked/challenged traffic).

## 8.2 Supabase monitoring

1. Watch database usage and query performance.
2. Track auth events and failed logins.
3. Monitor table growth for orders/products/users.
4. Monitor edge function invocations (if webhook function used).

---

## 9. Go-Live Validation Checklist

Run these tests after deploy:

1. Domain and SSL
- https://onestopshop24.in redirects to https://www.onestopshop24.in
- SSL lock appears on both

2. Catalog and inventory
- Shop page loads
- Category/subcategory grid loads
- Product filtering by category and subcategory works

3. Auth
- Signup and login work
- Redirect URLs are correct

4. Cart and checkout
- Add to cart works
- Checkout flow works
- Order created in Supabase

5. Payment
- Razorpay popup works on production domain
- Payment success updates order status
- Payment failure updates order status
- Webhook verification updates status correctly

6. Announcement/inventory backend control
- Update announcement in store_settings and verify UI updates
- Update taxonomy/product rows and verify shop sections

---

## 10. Scalability and Bandwidth Guidance

1. Main bandwidth driver is images, not app bundle.
2. Use optimized image sizes and modern formats where possible.
3. Keep static assets on CDN cache.
4. Add DB indexes for high-cardinality filters:
- products(category)
- products(subcategory)
- products(category, subcategory)

---

## 11. Rollback Plan (Important)

If release has issues:

1. Roll back to previous successful Cloudflare Pages deployment.
2. Keep DNS unchanged.
3. Disable risky new rules temporarily (WAF/rate rules if misconfigured).
4. Re-test critical paths (login, checkout, payment webhook).

---

## 12. Quick Step Summary

1. Move DNS authority to Cloudflare nameservers.
2. Deploy Vite app to Cloudflare Pages.
3. Add custom domains and enforce HTTPS.
4. Set production env vars in Pages.
5. Configure Supabase auth URLs and run required SQL.
6. Configure Razorpay live key and webhook verification endpoint.
7. Enable WAF/rate limits and monitoring.
8. Run full go-live checklist.
