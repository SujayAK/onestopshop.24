# Announcement Bar Backend Management Guide

## Overview

The announcement bar is a **backend-controlled** feature that displays dynamic messages at the top of your website. No code changes needed—manage everything directly from Supabase!

The announcement bar automatically:
- Displays at the top of every page (above the navbar)
- Updates in real-time across all user sessions
- Falls back to a default message if Supabase is unavailable
- Persists across page navigations

## Quick Start

### 1. Set Up the Database

Run this SQL in Supabase SQL Editor:

```sql
-- Copy the contents of: SUPABASE_STORE_SETTINGS_SCHEMA.sql
-- Paste and run in your Supabase SQL Editor
```

Or copy-paste the entire [SUPABASE_STORE_SETTINGS_SCHEMA.sql](./SUPABASE_STORE_SETTINGS_SCHEMA.sql) file.

### 2. Update an Announcement

Go to Supabase → Table Editor → `store_settings` table

Find the row with `key = 'announcement_bar_text'` and edit the `value` column.

**Example updates:**

| Scenario | Value to Set |
|----------|--------------|
| Special Sale | `🎉 FLASH SALE: 50% OFF ALL BAGS THIS WEEKEND! 🎉` |
| New Launch | `✨ NEW COLLECTION JUST DROPPED - SHOP NOW ✨` |
| Holiday | `🎄 HOLIDAY DEALS: FREE SHIPPING ON EVERYTHING! 🎄` |
| Maintenance | `⚠️ SCHEDULED MAINTENANCE: Site will be down 2-3 AM UTC` |
| Urgent Notice | `📢 Due to high demand, order processing may take 48 hours` |
| Normal | `FREE SHIPPING ON ORDERS OVER ₹100 • NEW ARRIVALS` |

### 3. Changes Take Effect Immediately

Once you update the `value` in Supabase:
- All user sessions will see the new message on next page load/refresh
- No deployment required
- No code changes needed

## How It Works

### Data Flow

```
Supabase store_settings table
  ↓ (GET announcement_bar_text)
Frontend: getAnnouncementBarMessage()
  ↓
navbar.js displays announcement
  ↓
User sees message at top of page
```

### Technical Details

**Supabase Location:**
- Table: `public.store_settings`
- Key: `'announcement_bar_text'` (unique identifier)
- Value: Text content displayed in announcement bar

**Frontend Code:**
- File: `src/utils/supabase.js`
- Function: `getAnnouncementBarMessage()`
- Called from: `src/components/navbar.js`
- Display element: `<span id="announcement-text">`

**Styling:**
- CSS class: `.announcement-bar`
- Located in: `src/styles/main.css` (lines 183-191)
- Current style: Dark background, white text, centered, small font

## Managing Announcements

### Method 1: Supabase Table Editor (Easiest)

1. Open Supabase Dashboard
2. Navigate to **Table Editor**
3. Select **store_settings** table
4. Find row where `key = 'announcement_bar_text'`
5. Click the `value` cell and edit
6. Press Enter to save
7. **✅ Done!** Changes appear immediately

### Method 2: SQL Query

```sql
-- Update announcement
UPDATE public.store_settings
SET value = 'Your new announcement here'
WHERE key = 'announcement_bar_text';

-- Verify the update
SELECT key, value FROM public.store_settings 
WHERE key = 'announcement_bar_text';
```

### Method 3: Add New Settings (Advanced)

To add new settings/announcements:

```sql
INSERT INTO public.store_settings (key, value, description, category)
VALUES (
  'setting_name',
  'setting value',
  'What this setting does',
  'category_name'
);
```

Then update the frontend to use the new setting key.

## Design Recommendations

### Best Practices for Announcement Text

- **Keep it short** (50-80 characters ideal)
  - ✅ `FREE SHIPPING • LIMITED TIME OFFER`
  - ❌ `We are having a special promotional event for customers who wish to purchase items during the holiday season at significantly reduced prices`

- **Use ALL CAPS for impact**
  - ✅ `HUGE SALE: 40% OFF EVERYTHING`
  - ❌ `we have a nice sale for you`

- **Add emojis for personality** (optional)
  - ✅ `🚚 FREE SHIPPING ON ALL ORDERS! 🚚`
  - ✅ `⭐ 5-STAR RATED BY 10K+ CUSTOMERS ⭐`

- **Create urgency (when applicable)**
  - ✅ `⏰ 24-HOUR FLASH SALE - ENDS TONIGHT!`
  - ✅ `📦 LAST FEW ITEMS REMAINING`

- **Highlight value propositions**
  - ✅ `💝 FREE GIFT WITH PURCHASE OVER ₹500`
  - ✅ `⭐ BUY NOW • EASY RETURNS • 30 DAYS`

### Example Announcements by Season

```
Spring:     🌸 NEW SPRING COLLECTION JUST ARRIVED 🌸
Summer:     ☀️ SUMMER SALE: SAVE UP TO 60% ☀️
Fall:       🍂 FALL FAVORITES - SHOP THE SEASON 🍂
Winter:     ❄️ HOLIDAY DEALS START NOW - 50% OFF ❄️
```

### Seasonal Examples

```sql
-- New Year
UPDATE store_settings SET value = '🎊 2026 MEGA SALE: SAVE BIG ON EVERYTHING 🎊' 
WHERE key = 'announcement_bar_text';

-- Valentine's Day
UPDATE store_settings SET value = '💝 GIFT SETS AVAILABLE: PERFECT FOR SOMEONE SPECIAL 💝' 
WHERE key = 'announcement_bar_text';

-- Black Friday
UPDATE store_settings SET value = '🛍️ BLACK FRIDAY: UP TO 70% OFF - TODAY ONLY! 🛍️' 
WHERE key = 'announcement_bar_text';

-- Cyber Monday
UPDATE store_settings SET value = '💻 CYBER MONDAY: EXCLUSIVE ONLINE DEALS - SHOP NOW 💻' 
WHERE key = 'announcement_bar_text';
```

## Customizing the Announcement Bar

### Change Styling

Edit `src/styles/main.css` (lines 183-191):

```css
.announcement-bar {
  background-color: #FF1493;  /* Pink background */
  color: white;
  text-align: center;
  padding: 12px 0;  /* Increase padding */
  font-size: 0.85rem;  /* Make text slightly larger */
  letter-spacing: 1px;
  font-weight: 600;  /* Make text bolder */
  animation: slideInDown 0.5s ease-out;  /* Add animation */
}
```

### Add Dismissible Announcement

To allow users to dismiss the announcement:

**Step 1:** Update HTML in navbar.js:
```javascript
<div class="announcement-bar" id="announcement-bar">
  <span id="announcement-text">Message</span>
  <button id="close-announcement" aria-label="Close" style="margin-left: 10px; cursor: pointer; background: none; border: none; color: white; font-size: 1.2rem;">&times;</button>
</div>
```

**Step 2:** Add JavaScript to main.js:
```javascript
function initAnnouncementBar() {
  const announcementBar = document.getElementById('announcement-bar');
  const closeButton = document.getElementById('close-announcement');
  
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      announcementBar.style.display = 'none';
    });
  }
  
  // ... rest of existing code
}
```

## Advanced Features

### Add Multiple Announcement Slots

Extend `store_settings` for multiple announcements:

```sql
INSERT INTO store_settings (key, value, description, category)
VALUES
  ('announcement_bar_text_1', 'Primary announcement', 'Main announcement', 'announcements'),
  ('announcement_bar_text_2', 'Secondary announcement', 'Secondary message', 'announcements'),
  ('announcement_flash_sale', 'FLASH SALE DETAILS', 'Flash sale banner', 'promotions');
```

Then fetch multiple in frontend:

```javascript
export async function getMultipleAnnouncements() {
  const { data } = await supabase
    .from('store_settings')
    .select('key, value')
    .like('key', 'announcement_%');
  return data;
}
```

### Add Expiring Announcements

Extend table with expiry dates:

```sql
ALTER TABLE store_settings ADD COLUMN expires_at timestamp;

-- Set expiry for a promotion
UPDATE store_settings 
SET expires_at = NOW() + INTERVAL '3 days'
WHERE key = 'announcement_bar_text';
```

Then check expiry in frontend:

```javascript
export async function getAnnouncementBarMessage() {
  const { data } = await supabase
    .from('store_settings')
    .select('value, expires_at')
    .eq('key', 'announcement_bar_text')
    .maybeSingle();
  
  if (data?.expires_at && new Date(data.expires_at) < new Date()) {
    return { success: false, data: null };  // Announcement expired
  }
  
  return { success: true, data: data?.value };
}
```

### Add Rich Media Support

Store HTML in announcements:

```sql
-- Store HTML banner
UPDATE store_settings
SET value = '<strong>🎉 50% OFF</strong> - Use code SAVE50'
WHERE key = 'announcement_bar_text';
```

Update display in navbar.js:

```javascript
// In navbar.html
<div class="announcement-bar">
  <span id="announcement-text"></span>
</div>

// In JavaScript
announcementText.innerHTML = result.data;  // Use innerHTML for HTML support
```

## Troubleshooting

### Issue: Announcement doesn't update

**Solution:**
1. Verify row exists in `store_settings` table with key `'announcement_bar_text'`
2. Check that `value` column is not empty
3. Refresh browser cache (Ctrl+Shift+Delete)
4. Check browser console for errors (F12 → Console)

### Issue: Announcement shows default message

**Causes:**
- Supabase credentials not configured in `.env`
- `store_settings` table doesn't exist
- Row with key `'announcement_bar_text'` missing
- Supabase is unavailable

**Solution:**
1. Verify `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Run the schema SQL to create/recreate table
3. Insert default row with SQL provided above
4. Check Supabase dashboard status

### Issue: Special characters not displaying

**Solution:** Ensure text is UTF-8 encoded. Supabase supports:
- ✅ Emojis: 🎉 ✨ 🎊 🎁 🛍️
- ✅ Symbols: → ← • × ⚡ ★
- ✅ Accents: café naïve résumé
- ✅ Other languages: 中文 日本語 한국어

## Monitoring & Analytics

### Track Announcement Usage

Log when announcements load:

```javascript
// In getAnnouncementBarMessage()
console.log('Announcement loaded:', result.data);
```

### Audit Trail

Store update history:

```sql
CREATE TABLE announcement_updates (
  id BIGSERIAL PRIMARY KEY,
  old_value TEXT,
  new_value TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create trigger to log updates
CREATE TRIGGER log_announcement_updates
AFTER UPDATE ON store_settings
FOR EACH ROW
WHEN (OLD.value IS DISTINCT FROM NEW.value)
EXECUTE FUNCTION store_update_changes();
```

## Performance Tips

1. **Cache announcements** - Currently fetches on every page load
   - Solution: Cache in localStorage with TTL

2. **Batch settings** - Load all settings in one query
   - Solution: Use `store_settings` table for all app config

3. **Add Realtime Updates** - Auto-update without refresh
   - Solution: Subscribe to `store_settings` changes:
   ```javascript
   supabase
     .channel('store_settings_changes')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, 
       payload => updateAnnouncement(payload.new.value))
     .subscribe();
   ```

## Files Reference

- **SQL Schema:** [SUPABASE_STORE_SETTINGS_SCHEMA.sql](./SUPABASE_STORE_SETTINGS_SCHEMA.sql)
- **Frontend Fetch:** [src/utils/supabase.js](./src/utils/supabase.js#getAnnouncementBarMessage)
- **Display Component:** [src/components/navbar.js](./src/components/navbar.js)
- **Styling:** [src/styles/main.css](./src/styles/main.css) (lines 183-191)
- **Initialization:** [src/main.js](./src/main.js) → `initAnnouncementBar()`

## Next Steps

1. ✅ Run the SQL schema in Supabase
2. ✅ Update an announcement via Table Editor
3. ✅ Refresh your website and see changes
4. 📌 Bookmark this guide for future announcements
5. 🚀 Consider adding more settings to the `store_settings` table (site-wide promotions, maintenance mode, etc.)
