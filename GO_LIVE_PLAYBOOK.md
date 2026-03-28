# OneStopShop24 Go-Live Playbook (Commercial + Cost-Effective)

This document gives a minimum-cost, production-ready setup for a commercial website using:
- Domain: Dynadot
- Hosting: Cloudflare Pages (recommended) or Vercel Pro (fallback)
- Backend/Auth/Data: Supabase
- Payments: Razorpay

It also explains the complete runtime flow: visitor -> product data -> cart -> payment -> order status.

---

## 1) Day-1 Architecture (Low Cost + Commercial Safe)

Use this stack to avoid unnecessary spend:
- Frontend hosting: Cloudflare Pages
- Domain registrar/DNS: Dynadot
- Database/Auth/API: Supabase (free tier to start)
- Payments: Razorpay (test -> live)
- Email support: existing Gmail first (domain mailbox later)

Why this is cost-efficient:
- No separate backend server cost
- No paid SSL certificate (Cloudflare auto SSL)
- No paid CDN (Cloudflare includes global edge CDN)
- No extra ops tooling needed initially

---

## 2) Domain Setup (Dynadot -> Cloudflare Pages)

Domain purchased: `www.onestopshop24.in`

### 2.1 Add domains in Cloudflare Pages
1. Open Cloudflare Dashboard -> Workers & Pages -> your Pages project -> Custom domains.
2. Add both domains:
   - `onestopshop24.in`
   - `www.onestopshop24.in`
3. Set primary domain as `www.onestopshop24.in`.
4. Enable redirect from apex to www:
   - `onestopshop24.in` -> `www.onestopshop24.in`

### 2.2 Configure DNS in Dynadot
Use the DNS records shown by Cloudflare after attaching custom domains.

Typical pattern:

| Type | Host | Value |
|---|---|---|
| CNAME | www | <cloudflare-pages-target> |
| CNAME or ALIAS/ANAME | @ | <cloudflare-pages-target> |

Actions:
1. Remove conflicting A/CNAME records for `@` and `www`.
2. Save DNS changes.
3. Wait for propagation (often minutes, can take up to 24h).
4. In Cloudflare Pages custom domains page, click Refresh/Verify.

### 2.3 SSL
- Cloudflare issues SSL automatically after DNS verification.
- No manual SSL purchase required.

---

## 3) Hosting and Environment Variables (Cloudflare Pages)

### 3.1 Deploy on Cloudflare Pages
1. Connect your GitHub repository to Cloudflare Pages.
2. Build settings:
  - Framework preset: Vite
  - Build command: `npm run build`
  - Build output directory: `dist`
3. Enable automatic deploys on `master` branch.

### 3.2 Production env vars (must set in Cloudflare Pages)
Set these in Cloudflare Pages -> Settings -> Environment variables (Production):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_STORE_NAME`
- `VITE_STORE_EMAIL`
- `VITE_SUPPORT_PHONE`
- `VITE_CURRENCY`

Important:
- Any `.env` change in local machine does not auto-change cloud production.
- Update Cloudflare env vars and redeploy.

### 3.3 Redeploy
- Trigger a fresh production deployment after domain/env updates.

---

## 4) Supabase Setup (Auth + Data + Security)

### 4.1 URL configuration
In Supabase -> Authentication -> URL Configuration:
1. Site URL: `https://www.onestopshop24.in`
2. Additional Redirect URLs:
   - `https://www.onestopshop24.in/*`
   - `https://onestopshop24.in/*`
  - Cloudflare preview URL pattern if used

### 4.2 Required tables/functions already used by app
Ensure these are present and working:
- `products`
- `orders`
- `users`/profiles as per current setup
- `store_settings` for announcement bar
- RPCs (if using inventory lock flow):
  - `reserve_inventory`
  - `release_inventory`

### 4.3 Security checks
- Enable RLS for all user data tables.
- Keep only anon key in frontend (`VITE_SUPABASE_ANON_KEY`).
- Never expose service role key in client.

### 4.4 Seed and content updates
- Products can be inserted/updated in Supabase Table Editor.
- Announcement text can be updated in `store_settings`:
  - key: `announcement_bar_text`

---

## 5) Razorpay Setup (Payments)

### 5.1 Keys
- Use test key in development.
- Use live key only in production environment.
- Set in Cloudflare env var: `VITE_RAZORPAY_KEY_ID`.

### 5.2 Website/domain settings in Razorpay
- Add `https://www.onestopshop24.in` in allowed origins/website app settings.
- Update callback/redirect URLs to production domain.

### 5.3 Webhook (recommended for reliability)
Implement server-side webhook verification for final payment truth:
- Endpoint should verify Razorpay signature.
- Update order state only after verification.

If webhook not yet implemented:
- Keep client flow, but treat it as interim.
- Add webhook as priority in next phase.

---

## 6) End-to-End System Flow

## 6.1 Browse and discovery flow
1. User opens `https://www.onestopshop24.in`.
2. Cloudflare Pages serves static SPA assets via CDN.
3. App loads and reads settings/env values baked at build.
4. Product listing fetches from Supabase (`products`).
5. Category filters (`#/shop?cat=Bags`) are parsed from URL.
6. Supabase query applies category/search/sort filters.
7. Results rendered in UI.

## 6.2 Announcement flow
1. Navbar renders with default fallback message.
2. App calls Supabase `store_settings` key `announcement_bar_text`.
3. If found, backend message replaces default in UI.
4. Admin can modify message in Supabase without code change.

## 6.3 Checkout and payment flow
1. User adds items to cart.
2. On checkout, app validates stock from Supabase.
3. App optionally reserves inventory via `reserve_inventory` RPC.
4. Order record is created (pending state).
5. Razorpay modal opens with amount/order metadata.
6. Payment outcome:
   - Success: update order to success/paid, show success page.
   - Failure/dismiss: update order failed, call `release_inventory`.
7. User sees final status page.

## 6.4 Order tracking flow
1. Profile page fetches user orders from Supabase.
2. Timeline UI maps order status to milestones:
   - pending -> confirmed -> shipped -> delivered
   - failed/cancelled path when applicable

---

## 7) Go-Live Checklist (Do in This Order)

1. Domain connected and verified in Cloudflare Pages.
2. SSL active for both apex and www.
3. Redirect apex -> www working.
4. Production env vars configured in Cloudflare Pages.
5. Supabase Site URL/Redirect URLs updated.
6. Razorpay production settings/domain updated.
7. Redeploy production.
8. Functional QA:
   - Home/shop/category filters
   - Login/signup
   - Cart/checkout
   - Payment success/failure
   - Profile order timeline
   - Announcement bar fetch
9. Mobile + desktop smoke test.
10. Backup plan noted (rollback to previous deployment on Cloudflare Pages).

---

## 8) Cost Control Plan

### Phase A (Now)
- Use free/lowest plans wherever possible.
- No dedicated backend server.
- Gmail support email stays for now.
- Only buy what blocks revenue.

### Phase B (After stable sales)
- Add domain mailbox if support volume rises.
- Add webhook + monitoring improvements.
- Add analytics (free first, paid later if needed).

### Phase C (Scale)
- Optimize bundle/code-splitting.
- Consider paid tiers only when usage crosses free limits.

---

## 9) Common Mistakes to Avoid

- Editing local `.env` and expecting Vercel prod to change automatically.
- Editing local `.env` and expecting cloud production to change automatically.
- Leaving conflicting DNS records at Dynadot.
- Forgetting Supabase redirect URLs for new domain.
- Using Razorpay test key in production.
- Exposing sensitive server keys in frontend.

---

## 10) Quick Commands/References

- Verify live domain:
  - `https://www.onestopshop24.in`
- Check apex redirect:
  - `https://onestopshop24.in`
- Cloudflare dashboard:
  - Workers & Pages -> Project -> Custom domains / Environment variables
- Supabase dashboard:
  - Authentication -> URL Configuration
  - Table Editor / SQL Editor
- Razorpay dashboard:
  - API Keys, Webhook, Website/App settings

---

## 11) Minimum Viable "Production Ready" Definition

You are production-ready when all are true:
- Domain + SSL + redirects are correct.
- Supabase auth redirects point to production domain.
- Payments run end-to-end on production domain.
- Orders and inventory states remain consistent on success/failure.
- Contact/store info comes from env/backend where required.

If any one of these is missing, fix it before traffic campaigns.

---

## 12) Fallback Option (If You Prefer No Migration)

If you want zero migration effort, use Vercel Pro instead of Cloudflare Pages:
- Keep existing Vercel deployment.
- Upgrade to Pro for commercial/business usage.
- Keep same domain, Supabase, Razorpay steps.

Choose this if you value speed and continuity over marginal cost savings.
