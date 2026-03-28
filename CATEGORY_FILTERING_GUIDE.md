# Backend Category Filtering Setup Guide

## Overview

The platform now supports **backend-powered category filtering** through Supabase. When users visit URLs like:
- `https://onestopshop24.vercel.app/#/shop?cat=Bags`
- `https://onestopshop24.vercel.app/#/shop?cat=Accessories`

They will see all products in that category fetched **from Supabase** (with local JSON fallback).

## How It Works

### 1. **Backend Query** (Supabase)
The filtering happens in `src/utils/supabase.js`:

```javascript
export async function getProductsCatalog(options = {}) {
  // If category is provided, it filters at the database level
  if (category) {
    query = query.eq('category', category)  // ← Backend filter
  }
}
```

### 2. **Frontend Implementation** (URL-Synced)
When users change the category dropdown in the shop page:
- Category is stored in the URL: `?cat=Bags`
- Shop page reads it: `parseShopQuery()` → `cat: 'Bags'`
- Passed to backend: `getProductsCatalog({ category: 'Bags' })`
- UI updates automatically without page reload

### 3. **Fallback System**
If Supabase is unavailable, the app falls back to `src/data/products.json` with the same filtering logic applied locally.

## Adding Dummy Products to Supabase

### Method 1: Using SQL Editor (Recommended)

1. **Go to your Supabase dashboard** → Select your project → SQL Editor
2. **Create new query** and copy-paste the entire contents of:
   ```
   SUPABASE_SEED_PRODUCTS.sql
   ```
3. **Click "Run"** to insert all 20 products
   - 10 products in **Bags** category
   - 10 products in **Accessories** category

### Method 2: Using Supabase UI (Manual)

1. Go to **Table Editor** in Supabase
2. Click on **products** table
3. Click **Insert** and add products one by one:

**Bags Products** (with varying stock levels):
- Classic Leather Tote (₹89, stock: 15)
- Premium Backpack (₹129.99, stock: 12)
- Crossbody Messenger Bag (₹95, stock: 20)
- Luxury Handbag (₹249.99, stock: 8)
- Minimalist Crossbody (₹65, stock: 25)
- Travel Duffel Bag (₹159, stock: 10)
- Leather Clutch (₹45, stock: 18)
- Canvas Weekend Bag (₹79, stock: 14)
- Designer Satchel (₹189.99, stock: 9)
- Woven Straw Tote (₹55, stock: 16)

**Accessories Products** (with varying stock levels):
- Silk Floral Scarf (₹35, stock: 22)
- Leather Wallet (₹25, stock: 30)
- Designer Sunglasses (₹145, stock: 11)
- Leather Belt (₹39.99, stock: 19)
- Cashmere Wrap (₹120, stock: 7)
- Wool Beanie (₹29.99, stock: 26)
- Cotton Gloves (₹19.99, stock: 28)
- Statement Necklace (₹85, stock: 13)
- Vintage Watch (₹199.99, stock: 6)
- Silk Tie (₹49.99, stock: 21)

## Column Requirements

When adding products, ensure these fields are populated:

| Column | Type | Required | Example |
|--------|------|----------|---------|
| `name` | Text | Yes | "Premium Backpack" |
| `category` | Text | Yes | "Bags" or "Accessories" |
| `price` | Numeric | Yes | 129.99 |
| `image` | Text | Yes | URL to product image |
| `description` | Text | No | "Durable and spacious..." |
| `stock` | Integer | No | 12 |
| `active` | Boolean | No | true |

## Testing the Implementation

### Test Case 1: View Bags Category
1. Navigate to: `https://yoursite.com/#/shop?cat=Bags`
2. **Expected**: See all Bags products (should show products like "Premium Backpack", "Leather Tote", etc.)
3. **Result count**: Should display "10 products found" (or whatever you've added)

### Test Case 2: View Accessories Category
1. Navigate to: `https://yoursite.com/#/shop?cat=Accessories`
2. **Expected**: See all Accessories products (scarf, wallet, sunglasses, etc.)
3. **Result count**: Should display "10 products found"

### Test Case 3: URL Persistence
1. Select category dropdown → choose "Bags"
2. Click Apply
3. **Expected**: URL changes to `?cat=Bags` and products update
4. Refresh the page
5. **Expected**: Same products and filters persist

### Test Case 4: Combined Filters
1. Navigate to: `https://yoursite.com/#/shop?cat=Bags&sort=price-asc`
2. **Expected**: Bags sorted by price (low to high)
3. Try: `?cat=Bags&min=50&max=150`
4. **Expected**: Bags between ₹50-₹150

## Backend Query Flow

```
User clicks category dropdown
        ↓
URL changes: ?cat=Bags
        ↓
Shop page detects hash change
        ↓
parseShopQuery() reads "Bags"
        ↓
getProductsCatalog({ category: 'Bags' })
        ↓
Supabase: SELECT * FROM products WHERE category = 'Bags'
        ↓
Products return to frontend
        ↓
UI renders filtered results
```

## Database Optimization Tips

For better performance with many products:

1. **Add index on category column** (in Supabase):
   ```sql
   CREATE INDEX products_category_idx ON products(category);
   ```

2. **Add index on price column** (for price range filtering):
   ```sql
   CREATE INDEX products_price_idx ON products(price);
   ```

3. **View current indexes**:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'products';
   ```

## Fallback Behavior

If Supabase is not configured or unavailable:
1. App uses `src/data/products.json` instead
2. All 20 dummy products are available locally
3. Category filtering works the same way on the frontend
4. Stock information defaults to `null` (infinite stock assumed)

## Next Steps

1. ✅ Add dummy products to Supabase
2. ✅ Test category filtering
3. Consider adding more categories (e.g., "Clothing", "Footwear", "Home Decor")
4. Add category-specific product images for better UX
5. Implement category descriptions/banners for discovery

## Troubleshooting

**Q: I see "No products match your filters" when selecting Bags**
- A: Check that products are inserted with `category: 'Bags'` (exact case match)
- Ensure `active: true` is set for the products
- Refresh browser cache (Ctrl+Shift+Delete)

**Q: URL changes but products don't update**
- A: Check browser console for errors
- Verify Supabase credentials in `.env` file
- Try clearing localStorage and sessionStorage

**Q: Stock shows as null even after adding data**
- A: Stock column can be empty; frontend treats null as unlimited
- If specific stock levels needed, manually edit products in Supabase

**Q: Can't access SQL Editor in Supabase**
- A: Must have SQL Editor role enabled (check project owner/admin status)
- Alternative: Use Table Editor to insert products manually
