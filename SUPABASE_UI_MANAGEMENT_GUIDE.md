# Supabase UI Management Guide - For Non-Technical Users

## Overview

**YES! It's completely possible.** Non-technical users can manage the entire shop (products, categories, stock clearance) using Supabase's visual interface - no coding required.

### How It Works:

```
Your Website ← → Supabase Database
                    ↑
              Non-Tech Team
          (Uses Supabase Dashboard UI)
```

1. **Non-tech team adds/edits data** in Supabase Dashboard
2. **Website automatically reads** from the database
3. **Changes appear instantly** on the website within seconds

---

## Database Structure (SQL Setup)

Run this SQL in Supabase Dashboard → SQL Editor to create the table structure:

### Step 1: Create Categories Table

```sql
-- Create categories table
CREATE TABLE categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('Shop', 'Stock Clearance', 'Both')),
  icon TEXT,
  parent_id BIGINT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_parent_category FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_category_type ON categories(type);
CREATE INDEX idx_category_active ON categories(active);
CREATE INDEX idx_category_parent ON categories(parent_id);
```

### Step 2: Create Products Table (Shop)

```sql
-- Create products table for main shop
CREATE TABLE products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category_id BIGINT NOT NULL,
  image_url TEXT,
  colors TEXT,
  size TEXT,
  stock INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_stock CHECK (stock >= 0)
);

CREATE INDEX idx_product_category ON products(category_id);
CREATE INDEX idx_product_active ON products(active);
CREATE INDEX idx_product_featured ON products(featured);
```

### Step 3: Create Stock Clearance Products Table

```sql
-- Create stock clearance products table
CREATE TABLE stock_clearance_products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sr_no INTEGER,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category_id BIGINT NOT NULL,
  size TEXT,
  colors TEXT,
  stock INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_clearance_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_stock CHECK (stock >= 0)
);

CREATE INDEX idx_clearance_category ON stock_clearance_products(category_id);
CREATE INDEX idx_clearance_active ON stock_clearance_products(active);
```

### Step 4: Insert Sample Categories

```sql
-- Insert categories for shop
INSERT INTO categories (name, description, type, active) VALUES
('Bags', 'Premium quality bags and totes', 'Both', true),
('Accessories', 'Fashion accessories collection', 'Shop', true),
('Tops', 'Trendy tops and blouses', 'Both', true),
('Bottom', 'Stylish bottoms and pants', 'Both', true),
('Dresses', 'Beautiful dresses collection', 'Both', true);
```

---

## Process for Non-Technical Users

### Phase 1: Initial Setup (Do Once)

1. **Create Supabase Account**
   - Go to https://supabase.com
   - Sign up with email
   - Create a new project

2. **Run SQL Setup**
   - Go to: Dashboard → SQL Editor
   - Click "New Query"
   - Paste all SQL code from above
   - Click "Run"
   - ✅ Tables created!

3. **Insert Sample Categories**
   - Paste category insert SQL
   - Click "Run"
   - ✅ Categories added!

---

### Phase 2: Daily Operations (Add/Edit/Delete)

#### **Adding a New Category**

1. **Go to Supabase Dashboard**
   - Open your project
   - Click "Table Editor" (left sidebar)
   - Select `categories` table

2. **Add Category**
   - Click "Insert row" (green button)
   - Fill in the form:
     - **name**: "Shoes" 
     - **description**: "Stylish footwear"
     - **type**: Choose from dropdown (Shop / Stock Clearance / Both)
     - **active**: Toggle ON
   - Click "Save"

3. **✅ Done!** Category appears in website filter immediately

#### **Adding a New Product to Shop**

1. **Click Table Editor → `products` table**

2. **Click "Insert row"**
   - **name**: "Summer Dress Blue"
   - **description**: "Beautiful summer dress in blue"
   - **price**: "1299"
   - **category_id**: Click field → Select "Dresses" from dropdown
   - **image_url**: Paste URL from ImgBB (see below)
   - **colors**: "blue, navy"
   - **size**: "M, L, XL"
   - **stock**: "5"
   - **active**: Turn ON
   - **featured**: Turn ON (to show on homepage)

3. **Click Save**
   - ✅ Product appears on website immediately!

#### **Adding Product to Stock Clearance Sale**

1. **Click Table Editor → `stock_clearance_products` table**

2. **Click "Insert row"** (same fields as shop products)
   - Fill in all details
   - **stock**: Set number available
   - **active**: Turn ON

3. **Save**
   - ✅ Shows in stock clearance page!

#### **Editing a Product**

1. **Find the product** in table
   - Click on any row to open editor
   - Or double-click individual cell to edit inline

2. **Make changes**
   - Update price, stock, description, etc.
   - Changes save automatically

3. **✅ Website updates instantly!**

#### **Deleting a Product**

1. **Find product in table**
2. **Right-click row** → Delete
3. **Confirm deletion**
4. **✅ Removed from website**

---

## Image Upload (For Non-Tech Team)

### Where to Get Image URLs:

**Use ImgBB (Free, Easy)**

1. Go to https://imgbb.com/upload
2. Drag & drop your product images
3. Click "Upload"
4. Right-click image → "Copy image URL"
5. Paste URL in `image_url` field in Supabase

**Example URL:**
```
https://i.imgbb.com/abc123def456.jpg
```

---

## Dashboard Layout (Visual Guide)

### Supabase Dashboard

```
┌─ SQL Editor
│  └─ Run setup queries here
├─ Table Editor
│  ├─ categories
│  ├─ products
│  └─ stock_clearance_products
├─ Authentication
├─ Realtime
└─ Settings
```

### Table Editor View

```
┌────────────────────────────────────────┐
│ Insert row │ Refresh │ Upload | Delete │
├────────────────────────────────────────┤
│ ID │ Name │ Price │ Category │ Stock │
├────────────────────────────────────────┤
│ 1  │ Bag  │ 999   │ Bags     │ 5     │
│ 2  │ Shoe │ 1299  │ Shoes    │ 3     │
└────────────────────────────────────────┘
```

---

## Column Reference

### Categories Table

| Column | Type | Example | Required? | Notes |
|--------|------|---------|-----------|-------|
| id | Number | Auto | Auto | Auto-generated |
| name | Text | "Dresses" | ✅ Yes | Must be unique |
| description | Text | "Beautiful dresses" | No | Optional |
| type | Dropdown | "Both" | ✅ Yes | Shop / Stock Clearance / Both |
| icon | Text | "👗" | No | Optional emoji or icon |
| parent_id | Dropdown | (empty) | No | For subcategories |
| active | Toggle | ON | ✅ Yes | Show/hide in website |
| created_at | Date | Auto | Auto | Auto-generated |

### Products Table (Shop)

| Column | Type | Example | Required? | Notes |
|--------|------|---------|-----------|-------|
| id | Number | Auto | Auto | Auto-generated |
| name | Text | "Summer Dress" | ✅ Yes | Product name |
| description | Text | "Blue summer dress" | No | Optional |
| price | Number | 1299 | ✅ Yes | In Rupees |
| category_id | Dropdown | "Dresses" | ✅ Yes | Link to category |
| image_url | Text | https://... | ✅ Yes | Link from ImgBB |
| colors | Text | "blue, navy" | No | Comma-separated |
| size | Text | "M, L, XL" | No | Comma-separated |
| stock | Number | 5 | ✅ Yes | Quantity available |
| active | Toggle | ON | ✅ Yes | Show on website |
| featured | Toggle | ON | No | Show on homepage |

### Stock Clearance Products Table

| Column | Type | Example | Required? | Notes |
|--------|------|---------|-----------|-------|
| id | Number | Auto | Auto | Auto-generated |
| sr_no | Number | 1 | No | Serial number |
| name | Text | "Clearance Dress" | ✅ Yes | Product name |
| price | Number | 599 | ✅ Yes | Clearance price |
| category_id | Dropdown | "Dresses" | ✅ Yes | Link to category |
| size | Text | "L, XL" | No | Comma-separated |
| colors | Text | "pink" | No | Comma-separated |
| stock | Number | 2 | ✅ Yes | Quantity |
| description | Text | "Clearance item" | No | Optional |
| image_url | Text | https://... | ✅ Yes | Image link |
| active | Toggle | ON | ✅ Yes | Show on website |

---

## Step-by-Step Workflow

### To Add a Dresses Product to Stock Clearance:

```
1. Open Supabase Dashboard
2. Go to Table Editor
3. Select "stock_clearance_products" table
4. Click "Insert row"
5. Fill in:
   - name: "Houndstooth Dress"
   - price: 599
   - category_id: "Dresses" (click dropdown)
   - image_url: Paste ImgBB URL
   - colors: "pink"
   - size: "L"
   - stock: 1
   - active: ON
6. Click "Save"
7. ✅ Instantly appears on website!
```

---

## Real-Time Updates

**Website is connected to Supabase in real-time:**

```
Add Product → Supabase Database → Website Updates (instantly)
                                    ↓
                            Filters & categories update
                            Product shows in listings
                            Price filters include new price
```

**Changes appear in:**
- Product grids (shop & stock clearance)
- Category filters
- Price range sliders
- Search results

---

## Adding New Columns

### If You Want to Add More Fields

**Example: Add "Rating" column to products**

1. **Go to SQL Editor**
2. **Run this:**
```sql
ALTER TABLE products 
ADD COLUMN rating NUMERIC(2,1) DEFAULT 0;

ALTER TABLE products 
ADD COLUMN rating_count INTEGER DEFAULT 0;
```

3. **Go back to Table Editor**
4. **Refresh** - New columns appear!
5. **Edit products** to add ratings

**Go to website code** (if needed):
- Update [src/pages/shop.js](src/pages/shop.js)
- Add rating display:
```javascript
<p>⭐ ${product.rating} (${product.rating_count} reviews)</p>
```

---

## Common Tasks

### Add "Sale" Category

```
1. Table Editor → categories
2. Insert row
3. name: "Sale"
4. type: "Both"
5. Save
6. ✅ Done!
```

### Move Product to Stock Clearance

```
1. Table Editor → products
2. Find product
3. Edit → Change "active" to OFF
4. Table Editor → stock_clearance_products
5. Insert row with same product details
6. Save
7. ✅ Moved!
```

### Bulk Upload Multiple Products

**Use CSV Import:**

1. **Create CSV file** with columns:
```
name,price,category_id,image_url,stock,active
Dress 1,899,5,https://...,3,true
Dress 2,1099,5,https://...,2,true
```

2. **Go to Table Editor → products**
3. **Click "Upload" button**
4. **Select CSV file**
5. **Map columns** (make sure they match)
6. **Click Import**
7. **✅ All products added at once!**

---

## Permissions & Security

### For Your Team:

**Setup User Access:**

1. Go to Supabase Dashboard → Authentication
2. Click "Invite user"
3. Enter team member email
4. They get email invite
5. They log in and can edit data
6. ✅ No access to code/settings

**Restrictions:**
- ✅ Can add/edit/delete products
- ✅ Can manage categories
- ✅ Can see real-time updates
- ❌ Cannot delete tables
- ❌ Cannot access database backups
- ❌ Cannot see source code

---

## Troubleshooting

### Product not showing on website?

**Check:**
1. Is `active` toggle ON? → Turn ON
2. Is `category_id` filled? → Select a category
3. Is `image_url` valid? → Test URL in browser
4. Did you save? → Click Save button

✅ **Solution:** Usually missing one of above

### Category not showing in filters?

**Check:**
1. Is category `active` ON? → Turn ON
2. Go to website, refresh page (Ctrl+F5)
3. Check console for errors (F12)

✅ **Solution:** Refresh website

### Changes not appearing on website?

**Try:**
1. Refresh website (Ctrl+F5)
2. Wait 5 seconds
3. Refresh again
4. Clear browser cache

✅ **Solution:** Website auto-syncs within 5 seconds

### Price filter showing wrong range?

**The slider uses:**
- Min: 0 (fixed)
- Max: 100,000 (hardcoded)

**To change max price:**
- Contact tech team
- Update website code (price slider max)

---

## What Non-Tech Team Can Do

✅ Add new categories
✅ Add new products
✅ Edit product details
✅ Update stock levels
✅ Change prices
✅ Activate/deactivate items
✅ Manage colors and sizes
✅ Toggle featured products
✅ Delete outdated items
✅ Bulk upload via CSV

## What Requires Tech Team

❌ Add new website features
❌ Change slider max price
❌ Add new columns (needs SQL)
❌ Change website layout
❌ Fix bugs

---

## Quick Reference

### Must-Follow Rules

| Rule | Why | Example |
|------|-----|---------|
| Always fill `category_id` | Links product to category | Choose "Dresses" |
| Always fill `image_url` | Products need images | Use ImgBB URL |
| Always set `active` ON | Otherwise product won't show | Toggle ON |
| Use comma for multiple values | System reads as list | "blue, navy, black" |
| Set `stock` to 0 for out of stock | Shows "Out of stock" badge | Type "0" |

---

## Support

**For Non-Tech Team:**

### Common Questions:

**Q: I accidentally deleted a product. Can I get it back?**
A: Go to Supabase → Backups. Contact your admin for restoration.

**Q: The website doesn't show my new product.**
A: 1. Check `active` is ON
   2. Refresh website
   3. Wait 10 seconds
   4. Refresh again

**Q: Can I delete a category?**
A: Only if no products use it. Products will fail to delete otherwise (protected by foreign key).

**Q: How do I add a subcategory?**
A: Set `parent_id` to the parent category ID. (Advanced - ask tech team)

---

## Next Steps

1. **Supabase Setup** → Run SQL code in SQL Editor
2. **Insert Categories** → Use Supabase UI
3. **Add First Product** → Test it works
4. **Train Team** → Share this guide
5. **Go Live!** → Add all products via Supabase UI

---

## Summary

**Your non-tech team can now:**

✅ Manage entire product catalog
✅ Add/edit/delete categories
✅ Add/edit/delete products
✅ Manage stock levels
✅ Update prices instantly
✅ All changes reflect on website in real-time

**No coding needed!** Just use Supabase Dashboard UI.

**Workflow:** Supabase UI → Database → Website (automatic sync)

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Dashboard:** https://app.supabase.com
- **ImgBB Upload:** https://imgbb.com/upload
- **CSV Format Guide:** https://en.wikipedia.org/wiki/Comma-separated_values

**Questions?** Ask your tech team!
