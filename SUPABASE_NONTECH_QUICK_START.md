# Quick Start - For Non-Technical Team

## 🎯 Your Goal: Manage Products Without Coding

**You will use:** Supabase Dashboard (visual interface, no coding)

---

## How It Works (Simple Explanation)

```
You (Non-Tech)
    ↓
Supabase Dashboard (Visual UI)
    ↓
Database (Behind the scenes)
    ↓
Website (Automatically updates)
```

**Result:** Your changes appear on website instantly! ✅

---

## Step 1: Admin Sets Up (One Time)

Your tech team will:
1. Create Supabase account
2. Run SQL code (database setup)
3. Give you access

Then they'll say: **"You're ready to go!"**

---

## Step 2: You Manage Products (Daily)

### Access Supabase Dashboard

1. Go to: https://app.supabase.com
2. Log in with your email
3. Select project
4. Click **"Table Editor"** (left sidebar)

**You'll see:**
- ✅ categories (product groups)
- ✅ products (shop items)
- ✅ stock_clearance_products (sale items)

---

## Common Tasks

### ➕ Add New Category

```
1. Click "categories" table
2. Click "Insert row" (green button)
3. Fill in:
   → name: "Shoes"
   → description: "Shoe collection"
   → type: "Both" (Shop & Sale)
   → active: ON
4. Click "Save"

✅ Done! Category appears on website.
```

### ➕ Add New Product to Shop

```
1. Click "products" table
2. Click "Insert row"
3. Fill in:
   → name: "Blue Summer Dress"
   → description: "Beautiful blue dress"
   → price: 1299
   → category_id: Select "Dresses"
   → image_url: Paste ImgBB link
   → colors: "blue"
   → size: "M, L, XL"
   → stock: 5
   → active: ON
4. Click "Save"

✅ Shows on website immediately!
```

### ➕ Add New Product to Stock Clearance Sale

```
1. Click "stock_clearance_products" table
2. Click "Insert row"
3. Fill in same details as above
4. Set lower `price` (it's a "sale")
5. Click "Save"

✅ Shows in stock clearance page!
```

### ✏️ Edit Existing Product

```
1. Find product in table
2. Click on any cell to edit
3. Change value (price, stock, etc.)
4. Saves automatically

✅ Website updates instantly!
```

### ❌ Delete Product

```
1. Find product in table
2. Right-click row
3. Click "Delete"
4. Confirm

✅ Removed from website.
```

### 🔄 Change Stock Level

```
1. Find product in table
2. Click "stock" cell
3. Type new number
4. Saves automatically

✅ Website shows updated quantity!
```

### 🖼️ Add Image to Product

**Where to get image URL:**

1. Go to https://imgbb.com/upload
2. Upload your product image
3. Right-click image → Copy URL
4. In Supabase, fill `image_url` field with URL

**Example URL:**
```
https://i.imgbb.com/abc123def.jpg
```

---

## 🎨 Quick Reference - What Each Column Means

### Categories Table

```
name          = Category name (Bags, Dresses, Shoes)
description   = What the category is about
type          = "Shop" / "Stock Clearance" / "Both"
active        = ON = Show on website
              = OFF = Hide from website
```

### Products Table

```
name          = Product name (Houndstooth Dress)
description   = Product details
price         = Cost in Rupees (999)
category_id   = Which category (pick from dropdown)
image_url     = Picture link from ImgBB
colors        = Available colors (blue, navy)
size          = Available sizes (M, L, XL)
stock         = How many in inventory (5)
active        = ON = Show
              = OFF = Hide
featured      = ON = Show on homepage
```

---

## 📱 Basic Operations

### Turn Product ON/OFF

```
1. Find product row
2. Click "active" toggle
3. Toggle ON = Show on website
4. Toggle OFF = Hide from website
5. Auto saves ✅
```

### Increase Stock

```
1. Click "stock" cell
2. Type new number (10)
3. Auto saves ✅
```

### Change Price

```
1. Click "price" cell
2. Type new price (1299)
3. Auto saves ✅
```

### Add to Featured (Homepage)

```
1. Click "featured" toggle
2. Turn ON
3. Auto saves ✅
4. Shows on homepage!
```

---

## 🆘 Troubleshooting

### Product not showing on website?

**Check this:**
- [ ] Is `active` toggle ON?
- [ ] Did you pick a `category_id`?
- [ ] Is `image_url` filled in?
- [ ] Did you click "Save"?

**Fix:** Turn ON any that are OFF, then refresh website.

### Can't find `category_id` dropdown?

**Solution:** 
- Click on the cell
- Dropdown will appear
- Select category from list

### Want to move product from Shop to Sale?

**Solution:**
1. Edit product in "products" table → set `active` OFF
2. Go to "stock_clearance_products" table
3. Add new row with same details
4. Set lower price
5. Save

---

## ⚠️ Things to Remember

✅ **DO:**
- Always pick a category
- Always add an image URL
- Always turn ON "active" toggle
- Use commas for multiple values (blue, navy, black)
- Set stock to 0 if out of stock

❌ **DON'T:**
- Leave `category_id` empty
- Use invalid image URLs
- Forget to turn ON "active"
- Use special characters in names

---

## 📖 Examples

### Add "Houndstooth Dress" (From Your Excel)

```
name: houndstooth
price: 899
category_id: Dresses
size: L (shoulder)
colors: pink
stock: 1
image_url: https://i.imgbb.com/YOUR_IMAGE.jpg
active: ON
```

**Result:** Shows on website ✅

### Add "VCAY Dress" to Sale

```
name: VCAY dress
price: 900
category_id: Dresses
size: M (Bust 96cm)
colors: black
stock: 1
image_url: https://i.imgbb.com/YOUR_IMAGE.jpg
active: ON
```

**Result:** Shows in stock clearance ✅

---

## 🚀 You're Ready!

**What you can do now:**

✅ Add categories
✅ Add products
✅ Edit products
✅ Delete products
✅ Update stock
✅ Change prices
✅ Add images
✅ Turn products ON/OFF

**Everything shows on website instantly!**

---

## Need Help?

**Contact your tech team for:**
- Setup questions
- Database problems
- Website feature requests
- Training

**You're good for:** 
- Adding/editing any product
- Managing categories
- Updating stock levels

---

## Next Steps

1. **Ask your tech team to give you access**
2. **Log in to Supabase**
3. **Try adding one product**
4. **Check website** - It should appear!
5. **You're done!** Start managing your catalog

**Welcome to non-technical content management!** 🎉
