# Stock Clearance Sale - Complete Setup Guide

## ✨ What's Been Implemented

A fully functional stock clearance sale page with professional UI and advanced filtering:

### 1. **Stock Clearance Page** (`src/pages/stock-clearance.js`)
- **Category Filter** - Choose between Tops, Bottoms, Dresses (auto-loaded from database)
- **Price Range Filter** - Set minimum and maximum price
- **Sort Options** - Newest, Price (Low→High), Price (High→Low), Name (A→Z)
- **Product Cards** displaying:
  - Product image
  - Category badge (pink accent)
  - Product name
  - Price
  - Color swatches (if available)
  - Size information
  - Stock status with color coding
  - Wishlist & Compare buttons
  - Add to Cart & View Details buttons

### 2. **Hero Slider Click Navigation** (`src/pages/home.js`)
- Click "STOCK CLEARANCE SALE" text on home page slider
- Automatically redirects to the stock clearance page
- Clickable text with pointer cursor

### 3. **Backend Functions** (`src/utils/supabase.js`)
- `getStockClearanceCategories()` - Fetches available categories
- `getStockClearanceProducts()` - Fetches products with filtering

### 4. **Routing** (`src/main.js`)
- Route: `#/stock-clearance`

---

## 📊 Supabase Table Schema

Create a new table called `stock_clearance_products`:

```sql
CREATE TABLE stock_clearance_products (
  id bigint PRIMARY KEY DEFAULT gen_random_bigint(),
  category text NOT NULL,        -- "Tops", "Bottoms", "Dresses"
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL,
  image_url text,                -- Full URL to image
  image text,                    -- Alternative image field
  colors text,                   -- "grey" or "grey, red and white"
  sizes text,                    -- "S, M, L, XL" or "Bust: 50 cm"
  size text,                     -- Single size alternative
  stock integer DEFAULT 0,       -- Quantity available
  active boolean DEFAULT true,   -- Enable/disable product
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

---

## 📋 CSV Upload Format

Map your Excel columns to the table:

| Your Column | Database Column | Example |
|---|---|---|
| Sr No. | (skip) | - |
| Image | image_url | https://example.com/cozy.jpg |
| Name | name | cozy checks |
| Price | price | 400 |
| Colors | colors | grey |
| Quantity | stock | 1 |
| Size | sizes | Bust: 50 cms |
| left | stock | 1 |
| (add column) | category | Tops |

---

## 🚀 Quick Setup Steps

### Step 1: Prepare Your CSV
Add a `category` column to your Excel file:

```
category,name,price,image_url,colors,sizes,stock
Tops,cozy checks,400,https://example.com/cozy.jpg,grey,Bust: 50 cm,1
Tops,candy stripes,500,https://example.com/candy.jpg,red and white,Free size,1
Bottoms,sample bottom,600,https://example.com/bottom.jpg,black,M,1
Dresses,sample dress,900,https://example.com/dress.jpg,black,M (Bust 96cm),1
```

### Step 2: Create Table in Supabase
1. Go to SQL Editor
2. Paste the schema above
3. Execute the query

### Step 3: Upload CSV
1. Go to Table Editor
2. Click `stock_clearance_products` table
3. Click Insert > Insert from CSV
4. Select your file
5. Map columns correctly
6. Upload

### Step 4: Test
- Visit home page
- Click "STOCK CLEARANCE SALE" slider
- Verify products load with filters working

---

## 🎨 UI Features

✅ **Stylish Layout** - Sidebar filters + product grid (same as shop page)
✅ **Gradient Header** - Pink and purple gradient title
✅ **Category Buttons** - Radio buttons for easy selection
✅ **Price Range** - Min/Max input fields
✅ **Sort Dropdown** - 4 sorting options
✅ **Reset Button** - Clear all filters
✅ **Product Cards** - Image, colors, size, stock status
✅ **Action Buttons** - Wishlist, Compare, Add to Cart, View Details
✅ **Responsive Grid** - Auto-adjusts to screen size
✅ **Loading States** - Spinner while loading products
✅ **Empty States** - Message when no products found

---

## 📱 How Users Access

**Method 1: Home Page Slider (Recommended)**
- User sees "STOCK CLEARANCE SALE" in hero slider
- Clicks the text
- Automatically navigates to sale page

**Method 2: Direct URL**
- User can type `#/stock-clearance` in address bar

---

## 🛠️ Features Available

| Feature | Status |
|---|---|
| Filter by Category | ✅ |
| Filter by Price Range | ✅ |
| Sort Products | ✅ |
| Reset Filters | ✅ |
| Add to Wishlist | ✅ |
| Add to Compare | ✅ |
| Add to Cart | ✅ |
| View Product Details | ✅ |
| Display Size Info | ✅ |
| Display Colors | ✅ |
| Stock Status | ✅ |
| Responsive Design | ✅ |

---

## 🎯 Data Entry Tips

### Categories
Use exactly these names:
- `Tops`
- `Bottoms`
- `Dresses`

### Colors Format
Both work:
- Simple: `grey` or `red and white`
- Multiple: `grey, red, black, blue`

### Sizes Format
Examples:
- `Bust: 50 cm`
- `Free size`
- `S, M, L, XL`
- `One Size`
- `L (shoulder: 40 cm)`

### Image URLs
- Must be publicly accessible
- Full URL starting with `https://`
- Example: `https://example.com/images/cozy.jpg`

---

## 🐛 Troubleshooting

### Products not showing?
- ✓ Check table name is `stock_clearance_products`
- ✓ Verify all products have `active = true`
- ✓ Check image URLs are valid
- ✓ Ensure `price` is numeric (not text)

### Categories not loading?
- ✓ Verify `category` column has values
- ✓ Check products have `active = true`
- ✓ Refresh page after uploading data

### Filters not working?
- ✓ Check browser console for errors
- ✓ Verify Supabase credentials in `.env`
- ✓ Ensure database permissions are correct

### Click handler not working?
- ✓ Clear browser cache
- ✓ Check home page hero slider loads

---

## 📝 Files Changed

| File | Change |
|---|---|
| `src/pages/stock-clearance.js` | ✨ Created |
| `src/pages/home.js` | Modified - Added click handler |
| `src/main.js` | Modified - Added import & route |
| `src/utils/supabase.js` | Modified - Added 2 functions |

---

## 🔍 Example CSV Content

```csv
category,name,price,image_url,colors,sizes,stock,description,active
Tops,Cozy Checks,400,https://cdn.example.com/cozy-checks.jpg,grey,Bust: 50 cm,1,Comfortable checkered pattern,true
Tops,Candy Stripes,500,https://cdn.example.com/candy-stripes.jpg,red and white,Free size,1,Fresh striped design,true
Bottoms,Classic Black Pants,800,https://cdn.example.com/black-pants.jpg,black,S M L XL,3,Elegant black trousers,true
Dresses,Summer Floral,1200,https://cdn.example.com/floral-dress.jpg,multicolor,M L XL,2,Beautiful floral print,true
```

---

## ✨ Style Consistency

Uses same styling as your Shop page:
- `shop-grid` class for product grid
- `shop-product-card` for each item
- `shop-sidebar` for filters
- `btn` classes for buttons
- Consistent color scheme

---

Ready to go! Upload your CSV and test the feature 🎉
