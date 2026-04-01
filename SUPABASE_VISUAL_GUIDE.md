# Supabase UI Visual Guide - Step-by-Step

## Complete Process for Non-Technical Users

---

## Setup Phase (Do Once)

### 1️⃣ Create Supabase Account

```
Visit: https://supabase.com
Click: "Get Started"
Sign up with email
Create project
```

### 2️⃣ Run Database Setup (Copy-Paste SQL)

**Location to find SQL Editor:**
```
Dashboard → Left Sidebar → "SQL Editor" → "New Query"
```

**What to do:**
1. Open `SUPABASE_COMPLETE_SETUP.sql` file
2. Copy ALL the code
3. Paste into Supabase SQL Editor
4. Click "Run" (blue button)
5. Wait for completion ✅

**You should see:**
```
✓ Created table "categories"
✓ Created table "products"  
✓ Created table "stock_clearance_products"
✓ Inserted 5 categories
```

### 3️⃣ Verify Tables Were Created

**Location:**
```
Dashboard → Left Sidebar → "Table Editor"
```

**You should see three tables:**
- ✅ categories
- ✅ products
- ✅ stock_clearance_products

---

## Daily Operations Phase

### How to Add a New Category

#### Screenshots Flow:

```
┌─────────────────────────────────────┐
│ Supabase Dashboard                  │
├─────────────────────────────────────┤
│ SQL Editor                          │
│ Table Editor ← YOU ARE HERE          │
│   ├─ categories ← CLICK THIS         │
│   ├─ products                       │
│   └─ stock_clearance_products       │
└─────────────────────────────────────┘
```

#### Step 1: Click Table Editor

```
Left Sidebar → "Table Editor"
```

#### Step 2: Select Categories

```
Click "categories" table
You'll see existing categories (Bags, Accessories, etc.)
```

#### Step 3: Insert New Row

```
Top of table → Click green "Insert row" button
A form will appear
```

#### Step 4: Fill the Form

```
┌─────────────────────────────────────┐
│ Insert New Category                 │
├─────────────────────────────────────┤
│ name         | [Shoes            ]  │
│ description  | [Stylish shoes... ]  │
│ type         | [▼ Both          ]  │ ← Click dropdown
│ icon         | [👞              ]  │ (optional)
│ parent_id    | [empty           ]  │
│ active       | [✓ Toggle ON     ]  │
├─────────────────────────────────────┤
│ [Cancel]  [Save]                   │
└─────────────────────────────────────┘
```

#### Step 5: Click Save

```
Click "Save" button
✅ Category appears immediately!
```

#### Result on Website:
```
Shop Page → Filter Sidebar
├─ All Categories (default)
├─ Bags
├─ Accessories
├─ Tops
├─ Bottom
├─ Dresses
└─ Shoes ← YOUR NEW CATEGORY!
```

---

### How to Add a New Product to Shop

#### Step 1: Click Products Table

```
Table Editor → Click "products"
```

#### Step 2: Click Insert Row

```
Top button → "Insert row"
_Note: Button color may vary_
```

#### Step 3: Fill Product Details

```
┌──────────────────────────────────────┐
│ Insert New Product                   │
├──────────────────────────────────────┤
│ name         | [Summer Dress Blue  ] │
│ description  | [Beautiful summer...] │
│ price        | [1299              ] │
│ category_id  | [▼ Dresses        ] │ ← Click dropdown
│ image_url    | [https://i.imgbb...] │ ← ImgBB URL
│ colors       | [blue, navy        ] │
│ size         | [M, L, XL          ] │
│ stock        | [5                 ] │
│ active       | [✓ ON             ] │
│ featured     | [☐ OFF (optional)]  │
├──────────────────────────────────────┤
│ [Cancel]  [Save]                    │
└──────────────────────────────────────┘
```

#### Step 4: Save

✅ **Product appears on website instantly!**

---

### How to Add Product Image URL

#### Image Upload Process:

```
1. Go to: https://imgbb.com/upload

2. Upload Screen:
   ┌─────────────────────────────────┐
   │ Drag images here or click       │
   └─────────────────────────────────┘
   
3. Drag your product image
   → Size auto-adjusts
   → Shows in preview

4. Click "Upload"
   → Image uploads
   → Shows "Link:" 

5. Copy URL:
   ┌────────────────────────────────────┐
   │ https://i.imgbb.com/abc123def4.jpg │
   └────────────────────────────────────┘
   Right-click → Copy

6. Paste into Supabase:
   image_url field → Paste URL → Save
```

---

### How to Edit Existing Product

#### Option 1: Edit by Clicking Cell

```
1. Table Editor → products
2. Find the product row
3. Click any cell you want to edit
4. Type new value
5. Auto saves ✅
```

#### Option 2: Edit Full Row

```
1. Table Editor → products
2. Click on row  
3. Expand/Edit form opens
4. Change any fields
5. Click Save or auto-saves
```

---

### How to Delete a Product

```
1. Table Editor → products
2. Find product row
3. Right-click row
4. Select "Delete"
5. Confirm deletion
6. Product removed from website ✅
```

---

### How to Change Product Stock

```
1. Table Editor → products
2. Find product
3. Click "stock" cell
4. Type new number
5. Auto saves ✅

Example:
   Old: [5]
   New: [2]  ← Customer bought 3
   
Website shows: "Only 2 left" ✅
```

### How to Make Product Out of Stock

```
1. Click product's "stock" cell
2. Change to: [0]
3. Auto saves
4. Website shows: "Out of stock" ✅
```

---

### How to Show Product on Homepage

```
1. Table Editor → products
2. Find product
3. Click "featured" toggle
4. Turn ON ✓
5. Auto saves ✅
6. Homepage shows product in "Featured" section
```

---

### How to Hide Product from Website

```
1. Table Editor → products
2. Find product
3. Click "active" toggle
4. Turn OFF ☐
5. Auto saves ✅
6. Product disappears from website instantly
```

---

### How to Add Product to Stock Clearance Sale

```
1. Take product details from your Excel
2. Table Editor → stock_clearance_products
3. Click "Insert row"
4. Fill same details as shop product
5. But set lower "price" for clearance
6. Save
7. Shows in stock clearance page ✅

Example:
   Original Price: 1299
   Sale Price: 599  ← Great discount!
```

---

## Common Workflows

### Workflow 1: Upload 10 New Dresses

```
Day 1:
└─ Prepare 10 dress images
   └─ Upload to ImgBB
   └─ Get 10 URLs

Day 2:
└─ Table Editor → products
└─ Insert row (10 times)
└─ Fill name, price, category, URL, etc.
└─ Save each
└─ All 10 appear on website ✅

Time: ~30 minutes for beginner
```

### Workflow 2: End of Season Clearance

```
Day 1:
└─ Go to products table
└─ Find 5 old dresses
└─ Edit each:
   └─ Set active = OFF (hide from shop)
   
Day 2:
└─ Go to stock_clearance_products
└─ Insert 5 rows with old dress details
└─ Set lower clearance prices
└─ Save
└─ Clearance page shows 5 dresses ✅
```

### Workflow 3: Update All Prices

```
Table Editor → products
For each product:
  ├─ Click price cell
  ├─ Type new price
  ├─ Saves auto
└─ All website prices update ✅

Time: 1 minute per product
```

---

## Table Reference Card

### Categories Table Fields

```
name          = Unique category name (Bags, Dresses)
description   = What category is about (optional)
type          = Shop / Stock Clearance / Both
icon          = Emoji or icon (optional, just for reference)
parent_id     = Parent category (leave empty for main)
active        = ON = Shows / OFF = Hidden
```

### Products Table Fields

```
name          = Product name
description   = Details about product
price         = Cost in Rupees
category_id   = Which category (picking from list)
image_url     = Link from ImgBB (MUST have)
colors        = Available colors (blue, navy)
size          = Available sizes (M, L, XL)
stock         = Quantity in inventory
active        = ON = Shows / OFF = Hides
featured      = ON = Homepage / OFF = Regular
```

### Stock Clearance Products Table Fields

```
Same as products table, except:
├─ Usually lower prices
├─ For clearance/sale items
└─ Shows in /stock-clearance page
```

---

## Quick Fixes

### Problem: Product not showing on website

**Checklist:**
- [ ] Did you set `active` = ON?
- [ ] Did you pick a `category_id`?
- [ ] Did you fill `image_url`?
- [ ] Did you click "Save"?
- [ ] Did you refresh website?

**Fix:** Turn on any OFF, refresh website.

### Problem: Image not loading

**Checklist:**
- [ ] Is URL from ImgBB?
- [ ] Does URL start with `https://`?
- [ ] Can you open URL in browser?

**Fix:** Test URL directly in browser first.

### Problem: Category doesn't show in filters

**Fix:**
1. Make sure category `active` = ON
2. Refresh website (Ctrl+F5)
3. Wait 5 seconds

### Problem: Price not updating on website

**Fix:**
1. Edit price in products table
2. Refresh website (Ctrl+F5)
3. Wait 5 seconds
4. Should update ✅

---

## Rules to Follow

✅ **DO THIS:**

```
✓ Always fill "category_id" - Product needs a category
✓ Always fill "image_url" - Website needs images
✓ Always set "active" ON - Or product won't show
✓ Use commas for lists - "blue, navy, black"
✓ Set stock to 0 for out of stock
✓ Click Save button (if form pops up)
```

❌ **DON'T DO THIS:**

```
✗ Leave category_id empty
✗ Use broken image URLs
✗ Forget to turn ON "active"
✗ Use special characters: @#$%^
✗ Leave required fields blank
```

---

## When to Contact Tech Team

✅ **You can handle:**
- Adding products
- Editing products
- Deleting products
- Changing prices
- Updating stock
- Managing categories

❌ **Contact tech team for:**
- Website doesn't update
- Can't log in
- Database down
- Website feature changes
- New columns needed

---

## Pro Tips

💡 **Tip 1: Organize Images**
```
Keep product images in folders:
└─ OneDrive/2024-Products
   ├─ Bags
   ├─ Dresses
   └─ Accessories
   
Before uploading to ImgBB
```

💡 **Tip 2: Use CSV for Bulk Upload**
```
If adding 50+ products:
1. Create Excel file
2. Export as CSV
3. Go to Table Editor
4. Click "Upload"
5. Select CSV
6. Import all at once ✅

Much faster than one-by-one!
```

💡 **Tip 3: Note the URL**
```
Bookmark Supabase dashboard:
Add to favorites: app.supabase.com

Saves time when adding products
```

💡 **Tip 4: Keep Stock Updated**
```
Each time you sell 5 items:
1. Go to Table Editor
2. Find product
3. Reduce stock by 5
4. Website auto-updates

Customers see "Only 2 left!" ✅
```

---

## You're Ready!

**You've learned how to:**

✅ Add categories
✅ Add products  
✅ Edit products
✅ Delete products
✅ Update stock levels
✅ Add images
✅ Manage everything on website

**First step:** Ask your tech team for Supabase login access.

**Then:** Practice adding one product!

---

**Questions?** Contact your tech team support.

**Happy managing!** 🎉
