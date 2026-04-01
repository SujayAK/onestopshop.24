# Stock Clearance Sale - Efficient Image Upload Strategy

## Problem
Supabase free version has limited storage (1GB) and bandwidth. Uploading thousands of product images directly to Supabase Storage will quickly consume your free tier quota and incur charges.

## Solution: Use External CDN Instead of Supabase Storage

### Option 1: **Recommended - Use ImgBB (Free, No Credit Card)**
- **Pros:** Free tier, no credit card required, bulk upload support, fast CDN
- **Cons:** 32MB file size limit per upload, 25MB max per image
- **Best for:** 100-500 products

#### Steps:
1. Go to [ImgBB.com](https://imgbb.com)
2. Create a free account (no credit card needed)
3. Get your API key from [Settings > API](https://api.imgbb.com)
4. Bulk upload images:
   ```bash
   # Using curl to batch upload
   for image in *.jpg; do
     curl -X POST https://api.imgbb.com/1/upload \
       -F "image=@$image" \
       -F "key=YOUR_API_KEY" \
       -d "expiration=0"
   done
   ```
5. ImgBB returns image URLs - save these in your CSV

---

### Option 2: **Imgur (Free, Fast Upload)**
- **Pros:** Instant uploads, very fast CDN, no expiration
- **Cons:** No API for bulk upload (manual process for free tier)
- **Best for:** Quick individual uploads

#### Steps:
1. Go to [Imgur.com](https://imgur.com)
2. Create account (optional, but recommended)
3. Drag & drop images to upload
4. Copy image URLs to your CSV

---

### Option 3: **Cloudinary (Free with 25 GB/month bandwidth)**
- **Pros:** 25GB free storage, 25GB/month bandwidth, image optimization, no expiration
- **Best for:** Large product catalogs (500+)

#### Steps:
1. Sign up at [Cloudinary.com](https://cloudinary.com/users/register/free)
2. Create a new folder/project
3. Use Cloudinary Upload Widget or API:
   ```bash
   # Bulk upload using curl
   AUTH_TOKEN="your_auth_token"
   CLOUD_NAME="your_cloud_name"
   
   for image in *.jpg; do
     curl -X POST "https://api.cloudinary.com/v1_1/$CLOUD_NAME/image/upload" \
       -F "file=@$image" \
       -F "api_key=YOUR_API_KEY" \
       -F "signature=$AUTH_TOKEN"
   done
   ```

---

### Option 4: **Firebase Storage (Free 5GB)**
- **Pros:** 5GB free storage, 1GB/day download
- **Cons:** Requires Google account
- **Best for:** Small to medium catalogs

---

## CSV Format for Stock Clearance Products

### Standard CSV Structure:
```csv
id,sr_no,name,price,category,size,colors,stock,description,image_url,active
1,1,houndstooth,899,Dresses,L (shoulder),pink,1,Beautiful houndstooth dress,https://imgbb.com/YOUR_IMAGE_ID,true
2,2,Knitted long,1099,Dresses,L (shoulder),Dusty pink,1,Comfortable knitted dress,https://imgbb.com/YOUR_IMAGE_ID2,true
```

### Important Columns:
| Column | Type | Example |
|--------|------|---------|
| id | Number | 1 |
| sr_no | Number | 1 |
| name | String | houndstooth |
| price | Number | 899 |
| category | String | Dresses / Tops / Bottom |
| size | String | L, M, XL, S |
| colors | String | pink, Dusty pink |
| stock | Number | 1 |
| description | String | Product description |
| image_url | URL | Full image URL from CDN |
| active | Boolean | true / false |

---

## Step-by-Step Import Process

### 1. Prepare Your Images

**Optimize images first (IMPORTANT!)**
```bash
# Using ImageMagick to batch resize (install: apt-get install imagemagick)
for img in *.jpg; do
  convert "$img" -resize 800x800 -quality 80 "optimized_$img"
done
```

**Image Optimization Tips:**
- Max width: 800-1000px (enough for display)
- Quality: 75-80% JPEG (balances size & quality)
- Format: JPG for photos, PNG for graphics
- Target size: 100-300KB per image

**Free Batch Image Optimizer Tools:**
- [TinyPNG online](https://tinypng.com) - Upload up to 20 images at once
- [ImageOptim](https://imageoptim.com) (Mac)
- [PNGQuant](https://pngquant.org) (CLI)

---

### 2. Upload Images to CDN

**Using ImgBB Batch Upload (Recommended for beginners):**
1. Go to ImgBB.com
2. Look for "Bulk Upload" or drag multiple images at once
3. Download the batch JSON with all URLs
4. Extract image URLs to create CSV

**Using PowerShell Automation (Windows):**
```powershell
# Upload to ImgBB
$apiKey = "YOUR_API_KEY"
$folder = "C:\path\to\images\"
$csv = @()

Get-ChildItem $folder -Filter "*.jpg" | ForEach-Object {
  $response = curl -X POST "https://api.imgbb.com/1/upload" `
    -Form @{
      image = @($_.FullName)
      key = $apiKey
    }
  
  $json = $response | ConvertFrom-Json
  $imageUrl = $json.data.url
  
  $csv += [PSCustomObject]@{
    image_url = $imageUrl
    filename = $_.BaseName
  }
}

# Export to CSV
$csv | Export-Csv -Path "image_urls.csv" -NoTypeInformation
```

---

### 3. Create Your Products CSV

**Template for 6 products (dresses example from image):**
```csv
id,sr_no,name,price,category,size,colors,stock,description,image_url,active
1,1,houndstooth,899,Dresses,L (shoulder S),pink,1,Beautiful houndstooth pattern dress,https://imgbb.com/abc123,true
2,2,Knitted long s,1099,Dresses,L (shoulder S),Dusty pink,1,Soft knitted dress perfect for cold weather,https://imgbb.com/def456,true
3,3,VCAY dress,900,Dresses,M (Bust 96cm),black,1,Elegant black dress for any occasion,https://imgbb.com/ghi789,true
4,4,Summer high n,1299,Dresses,S (Bust 95cm),Multicolour,1,Colorful summer dress with bold pattern,https://imgbb.com/jkl012,true
5,5,Debby Mesh l,1499,Dresses,XL (shoulder),royal blue,1,Comfortable mesh dress in royal blue,https://imgbb.com/mno345,true
6,6,blush Co-ord,0,Dresses,L,blush pink,0,Blush pink co-ord set - Out of stock,https://imgbb.com/pqr678,false
```

---

### 4. Import CSV to Supabase

**Method A: Using Supabase Dashboard**

1. Go to Supabase Dashboard → Your Project
2. Navigate to SQL Editor
3. Create table first if not exists:
```sql
CREATE TABLE IF NOT EXISTS stock_clearance_products (
  id SERIAL PRIMARY KEY,
  sr_no INTEGER,
  name TEXT NOT NULL,
  price NUMERIC(10, 2),
  category TEXT,
  size TEXT,
  colors TEXT,
  stock INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

4. Use pgAdmin or CSV import:
   - Table → Import Data → Upload your CSV
   - Map columns correctly
   - Click Import

**Method B: Using Supabase JS SDK**

```javascript
import Papa from 'papaparse';
import { supabase } from './supabase.js';

export async function importStockClearanceCSV(csvFile) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const products = results.data.map(row => ({
            sr_no: parseInt(row.sr_no),
            name: row.name.trim(),
            price: parseFloat(row.price),
            category: row.category.trim(),
            size: row.size ? row.size.trim() : null,
            colors: row.colors ? row.colors.trim() : null,
            stock: parseInt(row.stock) || 0,
            description: row.description || '',
            image_url: row.image_url.trim(),
            active: row.active === 'true' || row.active === '1'
          }));

          // Batch insert in chunks of 100
          for (let i = 0; i < products.length; i += 100) {
            const chunk = products.slice(i, i + 100);
            const { error } = await supabase
              .from('stock_clearance_products')
              .insert(chunk);
            
            if (error) throw error;
            console.log(`Imported ${Math.min(i + 100, products.length)} products`);
          }

          resolve({ success: true, count: products.length });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
}
```

---

## Cost Comparison (Free Tier)

| Service | Storage | Bandwidth | Best For |
|---------|---------|-----------|----------|
| **Supabase Storage** | 1GB | Included | Small catalog only |
| **ImgBB** | Unlimited | Unlimited | 100-500 images |
| **Cloudinary** | 25GB | 25GB/month | 500+ images |
| **Firebase** | 5GB | 1GB/day | Medium catalogs |
| **Imgur** | Unlimited | Fast CDN | Quick uploads |

---

## Database Schema for Stock Clearance

```sql
CREATE TABLE stock_clearance_products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sr_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Tops', 'Bottom', 'Dresses')),
  size TEXT,
  colors TEXT,
  stock INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for better query performance
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_stock CHECK (stock >= 0)
);

-- Add indexes
CREATE INDEX idx_category ON stock_clearance_products(category);
CREATE INDEX idx_active ON stock_clearance_products(active);
CREATE INDEX idx_price ON stock_clearance_products(price);
```

---

## Recommended Workflow

### For Your Use Case (Dresses, Tops, Bottom):

1. **Week 1: Setup**
   - Create ImgBB account
   - Organize images by category: `Dresses/`, `Tops/`, `Bottom/`
   - Optimize all images

2. **Week 2: Upload**
   - Upload ~50 images to ImgBB per day (bulk)
   - Extract URLs
   - Build CSV file

3. **Week 3: Import**
   - Test import with 10 products first
   - Verify in Supabase
   - Import full catalog

4. **Ongoing: Maintenance**
   - Add new items to CSV
   - Keep images on ImgBB (permanent URLs)
   - Monitor Supabase storage (stays minimal since images are external)

---

## Pro Tips to Avoid Charges

✅ **DO:**
- Host images on free CDN (ImgBB, Cloudinary, Imgur)
- Optimize images before upload (reduce file size)
- Use PNG for graphics, JPG for photos
- Link CSV to external image URLs
- Keep Supabase storage only for backups

❌ **DON'T:**
- Don't upload original high-res images (2000x2000+)
- Don't store images in Supabase for production
- Don't upload unoptimized 10MB images
- Don't make duplicate image uploads
- Don't leave unused objects in Supabase storage

---

## Troubleshooting

**Q: Images not loading after import?**
- Check URLs are complete and valid
- Verify CDN website is still hosting the image
- Test URL in browser

**Q: CSV import fails in Supabase?**
- Ensure column names match exactly
- Check data types (numbers shouldn't have quotes)
- Split large files (>1000 rows) into chunks

**Q: Images too large - slow loading?**
- Re-optimize with TinyPNG
- Use 75% JPEG quality
- Resize to max 800px width

**Q: Want to switch from one CDN to another?**
- Export products with old URLs
- Re-upload images to new CDN
- Update CSV with new URLs
- Batch update in Supabase:
  ```sql
  UPDATE stock_clearance_products
  SET image_url = REPLACE(image_url, 'old-cdn.com', 'new-cdn.com');
  ```

---

## Summary

**Efficient Image Upload Strategy:**
1. ✅ Use **ImgBB or Cloudinary** (free CDN)
2. ✅ Optimize images before upload (75% JPEG, ~100-300KB each)
3. ✅ Create CSV with image URLs pointing to CDN
4. ✅ Import CSV to Supabase `stock_clearance_products` table
5. ✅ Avoid uploading images to Supabase Storage in free tier

**Cost Result:** ~0 extra charges, only Supabase for database (included in free tier)

---

## Next Steps

1. Create ImgBB account and get API key
2. Prepare and optimize your product images
3. Bulk upload to ImgBB
4. Create CSV with the provided template
5. Import to Supabase using the provided SQL/JS code
6. Test the stock clearance page with live data
