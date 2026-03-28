-- Supabase Product Seed Data
-- Run this SQL in your Supabase SQL Editor to populate dummy products

-- Insert Bags Category Products
INSERT INTO products (name, category, price, image, description, stock, active) VALUES
('Classic Leather Tote', 'Bags', 89.00, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600', 'A timeless leather tote bag for everyday use and work.', 15, true),
('Premium Backpack', 'Bags', 129.99, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600', 'Durable and spacious backpack with multiple compartments, perfect for travel and daily commute.', 12, true),
('Crossbody Messenger Bag', 'Bags', 95.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600', 'Stylish crossbody bag with adjustable strap, ideal for urban exploration.', 20, true),
('Luxury Handbag', 'Bags', 249.99, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600', 'Exquisite designer handbag crafted from premium leather with gold accents.', 8, true),
('Minimalist Crossbody', 'Bags', 65.00, 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=600', 'Sleek minimalist crossbody bag for essentials with premium leather finish.', 25, true),
('Travel Duffel Bag', 'Bags', 159.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600', 'Spacious travel duffel with multiple pockets and TSA-approved design.', 10, true),
('Leather Clutch', 'Bags', 45.00, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600', 'Compact leather clutch perfect for evening events and formal occasions.', 18, true),
('Canvas Weekend Bag', 'Bags', 79.00, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600', 'Practical canvas weekender with leather handles for short trips.', 14, true),
('Designer Satchel', 'Bags', 189.99, 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=600', 'Sophisticated satchel combining classic style with modern functionality.', 9, true),
('Woven Straw Tote', 'Bags', 55.00, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600', 'Natural woven straw tote, perfect for beach and casual outings.', 16, true);

-- Insert Accessories Category Products
INSERT INTO products (name, category, price, image, description, stock, active) VALUES
('Silk Floral Scarf', 'Accessories', 35.00, 'https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?q=80&w=600', 'Elegant silk scarf with a vibrant floral pattern.', 22, true),
('Leather Wallet', 'Accessories', 25.00, 'https://images.unsplash.com/photo-1627123834957-4466880c0d94?q=80&w=600', 'Premium RFID-protected leather wallet with multiple card slots.', 30, true),
('Designer Sunglasses', 'Accessories', 145.00, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600', 'UV-protected designer sunglasses with premium lens technology.', 11, true),
('Leather Belt', 'Accessories', 39.99, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=600', 'Classic leather belt with adjustable buckle and multiple notches.', 19, true),
('Cashmere Wrap', 'Accessories', 120.00, 'https://images.unsplash.com/photo-1609932113189-6890e1797371?q=80&w=600', 'Luxurious cashmere wrap, soft and warm for any season.', 7, true),
('Wool Beanie', 'Accessories', 29.99, 'https://images.unsplash.com/photo-1589327826919-4ef09b277eed?q=80&w=600', 'Warm and comfortable wool beanie, perfect for winter.', 26, true),
('Cotton Gloves', 'Accessories', 19.99, 'https://images.unsplash.com/photo-1523521845212-cbe660dbde88?q=80&w=600', 'Breathable cotton gloves for everyday wear.', 28, true),
('Statement Necklace', 'Accessories', 85.00, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60938?q=80&w=600', 'Eye-catching statement necklace with premium finish.', 13, true),
('Vintage Watch', 'Accessories', 199.99, 'https://images.unsplash.com/photo-1523170335684-f1b0248e7f4f?q=80&w=600', 'Classic vintage-inspired watch with leather strap.', 6, true),
('Silk Tie', 'Accessories', 49.99, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=600', 'Premium silk tie with classic patterns and vibrant colors.', 21, true);
