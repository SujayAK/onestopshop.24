# Stock Clearance Sale - Setup Guide

## What I've Implemented

I've successfully set up a complete stock clearance sale feature with the following:

### 1. **New Page Created** (`src/pages/stock-clearance.js`)
- Dedicated stock clearance products page
- Product filtering by price range
- Sorting options (newest, price asc/desc, name asc)
- Wishlist and compare functionality
- Responsive product grid display

### 2. **Hero Slider Integration** (`src/pages/home.js`)
- When users click on "STOCK CLEARANCE SALE" in the home page slider
- They are automatically redirected to `#/stock-clearance` page
- Made the slide text clickable with cursor pointer

### 3. **Routing** (`src/main.js`)
- Added import for the new stock clearance page
- Added route handler for `#/stock-clearance` URL

### 4. **Supabase Integration** (`src/utils/supabase.js`)
- Added `getStockClearanceProducts()` function
- Supports filtering by price range and sorting
- Handles active/inactive products

---

## Next Steps: Supabase Setup

You need to create a new table in Supabase called `stock_clearance_products`. Here's what you need to do:

### Step 1: Create the Table in Supabase

In your Supabase dashboard, create a new table with the following columns:

```sql
CREATE TABLE stock_clearance_products (
  id bigint PRIMARY KEY DEFAULT gen_random_bigint(),
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL,
  image_url text,
  image text,
  colors text, -- Can store as JSON string or array
  stock integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Step 2: Upload CSV Data

You can upload your CSV file directly to Supabase. The CSV should have these columns:
- `name` - Product name
- `price` - Product price
- `image` or `image_url` - Image URL
- `colors` - Color(s) (can be comma-separated or JSON)
- `stock` - Quantity available
- `description` - Product description (optional)
- `active` - true/false (default: true)

### Column Mapping from Your Excel File:

| Excel Column | Supabase Column |
|---|---|
| Name | name |
| Price | price |
| Colors | colors |
| Quantity | stock |
| Image | image_url or image |
| size | (optional - add custom column if needed) |
| left | stock |

### Step 3: Data Format for Colors Column

You can store colors in multiple formats:

**Option 1: Simple comma-separated**
```
pink,dusty pink,black
```

**Option 2: JSON array (recommended)**
```json
[
  {"name": "pink", "hex": "#FFC0CB"},
  {"name": "dusty pink", "hex": "#D8A0A0"},
  {"name": "black", "hex": "#000000"}
]
```

The app will automatically parse both formats.

---

## Testing the Feature

1. **Start the app** - Run your development server
2. **Navigate to home** - Go to the home page
3. **Click the slider** - Click on "STOCK CLEARANCE SALE" text in the hero slider
4. **View products** - You should be redirected to `/stock-clearance` page
5. **Test filters** - Use the price range and sort options
6. **Add to cart** - Test adding stock clearance products to cart

---

## How Users Will Access It

Users can access the stock clearance page in two ways:

### Method 1: Click Hero Slider (Recommended)
- Click on "STOCK CLEARANCE SALE" text in the home page hero slider
- Automatically navigates to the sale page

### Method 2: Direct URL
- Users can manually navigate to `#/stock-clearance`

---

## Customization Options

### Styling
The page uses the same styling as the shop page (uses `shop-*` CSS classes). 

### Features Available
- ✅ Filter by price range
- ✅ Sort by newest, price, name
- ✅ Add to wishlist
- ✅ Add to compare
- ✅ Add to cart
- ✅ View product details

### To Add More Filters

If you want to add more filters in the future (like colors, sizes), you can modify the `initStockClearancePage()` function in `stock-clearance.js` similar to how `shop.js` handles taxonomy filters.

---

## Database Schema Example (for reference):

```sql
-- If you want to add more columns for size and other attributes
ALTER TABLE stock_clearance_products ADD COLUMN sizes text; -- JSON array or comma-separated
ALTER TABLE stock_clearance_products ADD COLUMN category text;
ALTER TABLE stock_clearance_products ADD COLUMN on_sale boolean DEFAULT true;
ALTER TABLE stock_clearance_products ADD COLUMN discount_percentage integer;
ALTER TABLE stock_clearance_products ADD COLUMN original_price decimal(10, 2);
```

---

## Troubleshooting

### Issue: Products not showing
- Check if your Supabase table name is exactly `stock_clearance_products`
- Verify products have `active = true`
- Check browser console for errors

### Issue: Click not working on slider
- The click handler is on the `h1#hero-slide-text` element
- Make sure it has `cursor: pointer` CSS

### Issue: Images not loading
- Verify the image URLs are publicly accessible
- Check the `image_url` column has valid URLs

---

## Files Modified/Created:

1. ✅ **Created**: `src/pages/stock-clearance.js` - New stock clearance page
2. ✅ **Modified**: `src/pages/home.js` - Added click handler for hero slide
3. ✅ **Modified**: `src/main.js` - Added import and routing
4. ✅ **Modified**: `src/utils/supabase.js` - Added `getStockClearanceProducts()` function

Ready to upload your CSV file to Supabase! 🚀
