-- Supabase Store Settings Schema
-- This table stores global app settings like announcement bar messages

-- Create store_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.store_settings (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key text NOT NULL UNIQUE,
  value text,
  description text,
  category text DEFAULT 'general',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by text
);

-- Enable RLS for store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to store_settings
CREATE POLICY "Allow public read store_settings" ON public.store_settings
  FOR SELECT
  USING (true);

-- Allow authenticated users (admins) to update
CREATE POLICY "Allow authenticated users to update store_settings" ON public.store_settings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Insert default announcement
INSERT INTO public.store_settings (key, value, description, category)
VALUES 
  (
    'announcement_bar_text',
    'FREE SHIPPING ON ORDERS OVER ₹100 • NEW ARRIVALS JUST LANDED',
    'Main announcement bar text displayed at the top of the site',
    'announcements'
  )
ON CONFLICT(key) DO NOTHING;

-- Optional: Add indexes for performance
CREATE INDEX IF NOT EXISTS store_settings_key_idx ON public.store_settings(key);
CREATE INDEX IF NOT EXISTS store_settings_category_idx ON public.store_settings(category);
