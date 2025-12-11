-- ========================================
-- SEED DATA FOR SHOPPI E-COMMERCE
-- Run this after migrations
-- ========================================

-- ========================================
-- 1. CATEGORIES (8 main categories)
-- ========================================
INSERT INTO categories (id, name, slug, description, image_url, level, sort_order, is_active) VALUES
('c0000001-0000-0000-0000-000000000001', 'Fashion', 'fashion', 'Clothing, shoes, and accessories', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200', 1, 1, true),
('c0000001-0000-0000-0000-000000000002', 'Electronics', 'electronics', 'Phones, laptops, gadgets', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200', 1, 2, true),
('c0000001-0000-0000-0000-000000000003', 'Home & Living', 'home-living', 'Furniture, decor, kitchen', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=200', 1, 3, true),
('c0000001-0000-0000-0000-000000000004', 'Mother & Baby', 'mother-baby', 'Baby products, maternity', 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200', 1, 4, true),
('c0000001-0000-0000-0000-000000000005', 'Pets', 'pets', 'Pet food, accessories', 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200', 1, 5, true),
('c0000001-0000-0000-0000-000000000006', 'Sports', 'sports', 'Sports equipment, fitness', 'https://images.unsplash.com/photo-1461896836934- voices?w=200', 1, 6, true),
('c0000001-0000-0000-0000-000000000007', 'Watches', 'watches', 'Watches and accessories', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200', 1, 7, true),
('c0000001-0000-0000-0000-000000000008', 'Others', 'others', 'Other products', 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200', 1, 8, true)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories for Fashion
INSERT INTO categories (id, parent_id, name, slug, description, level, sort_order, is_active) VALUES
('c0000002-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Men Clothes', 'men-clothes', 'Men clothing', 2, 1, true),
('c0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Women Clothes', 'women-clothes', 'Women clothing', 2, 2, true),
('c0000002-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'Shoes', 'shoes', 'All shoes', 2, 3, true)
ON CONFLICT (slug) DO NOTHING;

-- Sub-categories for Electronics
INSERT INTO categories (id, parent_id, name, slug, description, level, sort_order, is_active) VALUES
('c0000002-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'Phones', 'phones', 'Mobile phones', 2, 1, true),
('c0000002-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000002', 'Laptops', 'laptops', 'Laptops and notebooks', 2, 2, true),
('c0000002-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000002', 'Accessories', 'electronics-accessories', 'Electronic accessories', 2, 3, true)
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- 2. DEMO SHOP (linked to partner@shoppi.com)
-- ========================================
-- First get partner user id, or create shop with known ID
INSERT INTO shops (id, partner_id, shop_name, slug, description, phone, email, status, follower_count, avg_rating, response_rate, city)
SELECT 
    's0000001-0000-0000-0000-000000000001',
    id,
    'Shoppi Official Store',
    'shoppi-official',
    'Official store with best products and fast delivery',
    '0901234567',
    'partner@shoppi.com',
    'active',
    15000,
    4.9,
    98,
    'Hanoi'
FROM users WHERE email = 'partner@shoppi.com'
ON CONFLICT (slug) DO NOTHING;


-- ========================================
-- 3. PRODUCTS (matching mock data)
-- ========================================

-- Flash Sale Products
INSERT INTO products (id, shop_id, category_id, name, slug, description, short_description, base_price, compare_at_price, status, total_sold, avg_rating, review_count, published_at) VALUES
('p0000001-0000-0000-0000-000000000001', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Wireless Earbuds Pro', 'wireless-earbuds-pro', 'High quality wireless earbuds with noise cancellation', 'Premium wireless earbuds', 299000, 899000, 'active', 1542, 4.8, 320, NOW()),
('p0000001-0000-0000-0000-000000000002', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000007', 'Smart Watch Series 7', 'smart-watch-series-7', 'Latest smartwatch with health monitoring features', 'Smart watch with health features', 1590000, 3500000, 'active', 892, 4.9, 156, NOW()),
('p0000001-0000-0000-0000-000000000003', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Fashion Backpack', 'fashion-backpack', 'Stylish and durable backpack for everyday use', 'Stylish everyday backpack', 159000, 450000, 'active', 231, 4.5, 89, NOW()),
('p0000001-0000-0000-0000-000000000004', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Mechanical Keyboard RGB', 'mechanical-keyboard', 'RGB mechanical keyboard with Cherry MX switches', 'Gaming mechanical keyboard', 890000, 1500000, 'active', 412, 4.7, 234, NOW()),
('p0000001-0000-0000-0000-000000000005', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'iPhone 15 Case', 'iphone-15-case', 'Premium protective case for iPhone 15', 'iPhone 15 protective case', 49000, 120000, 'active', 5210, 4.6, 1230, NOW()),
('p0000001-0000-0000-0000-000000000006', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Lipstick Matte', 'lipstick-matte', 'Long-lasting matte lipstick in various colors', 'Matte lipstick collection', 129000, 280000, 'active', 120, 4.8, 67, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Today Suggestions Products
INSERT INTO products (id, shop_id, category_id, name, slug, description, short_description, base_price, compare_at_price, status, total_sold, avg_rating, review_count, published_at) VALUES
('p0000001-0000-0000-0000-000000000007', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Classic White T-Shirt', 'classic-white-t-shirt', 'Premium cotton white t-shirt', 'Classic cotton t-shirt', 150000, NULL, 'active', 120, 4.5, 45, NOW()),
('p0000001-0000-0000-0000-000000000008', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Denim Jacket', 'denim-jacket', 'Classic denim jacket for all seasons', 'Classic denim jacket', 450000, 600000, 'active', 450, 4.8, 123, NOW()),
('p0000001-0000-0000-0000-000000000009', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000006', 'Running Shoes', 'running-shoes', 'Lightweight running shoes for athletes', 'Athletic running shoes', 890000, NULL, 'active', 890, 4.7, 234, NOW()),
('p0000001-0000-0000-0000-000000000010', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Leather Wallet', 'leather-wallet', 'Genuine leather wallet with multiple compartments', 'Genuine leather wallet', 290000, NULL, 'active', 230, 4.6, 89, NOW()),
('p0000001-0000-0000-0000-000000000011', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Sunglasses', 'sunglasses', 'UV protection sunglasses with stylish design', 'Stylish UV sunglasses', 190000, 300000, 'active', 150, 4.4, 56, NOW()),
('p0000001-0000-0000-0000-000000000012', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000007', 'Wrist Watch', 'wrist-watch', 'Elegant wrist watch with leather strap', 'Elegant leather watch', 1200000, NULL, 'active', 560, 4.9, 178, NOW()),
('p0000001-0000-0000-0000-000000000013', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Backpack', 'backpack', 'Durable backpack for travel and daily use', 'Travel backpack', 350000, NULL, 'active', 340, 4.5, 98, NOW()),
('p0000001-0000-0000-0000-000000000014', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Wireless Headphones', 'wireless-headphones', 'Over-ear wireless headphones with ANC', 'ANC wireless headphones', 590000, 900000, 'active', 1200, 4.7, 456, NOW()),
('p0000001-0000-0000-0000-000000000015', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Gaming Mouse', 'gaming-mouse', 'High DPI gaming mouse with RGB lighting', 'RGB gaming mouse', 450000, NULL, 'active', 670, 4.6, 234, NOW()),
('p0000001-0000-0000-0000-000000000016', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Smart Band', 'smart-band', 'Fitness tracker with heart rate monitor', 'Fitness smart band', 350000, NULL, 'active', 2100, 4.4, 567, NOW()),
('p0000001-0000-0000-0000-000000000017', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Portable Speaker', 'portable-speaker', 'Bluetooth portable speaker with bass boost', 'Bluetooth speaker', 290000, NULL, 'active', 430, 4.5, 123, NOW()),
('p0000001-0000-0000-0000-000000000018', 's0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'Apple MacBook Air M1', 'macbook-air-m1', 'Apple MacBook Air 13 inch M1 2020 8GB/256GB - Genuine Apple Vietnam', 'MacBook Air M1 chip', 18990000, 22990000, 'active', 35000, 4.8, 12500, NOW())
ON CONFLICT (slug) DO NOTHING;


-- ========================================
-- 4. PRODUCT IMAGES
-- ========================================
INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary) VALUES
-- Wireless Earbuds Pro
('p0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=500', 'Wireless Earbuds Pro', 0, true),
-- Smart Watch Series 7
('p0000001-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=500', 'Smart Watch Series 7', 0, true),
-- Fashion Backpack
('p0000001-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=500', 'Fashion Backpack', 0, true),
-- Mechanical Keyboard
('p0000001-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1587829741301-dc798b91a603?q=80&w=500', 'Mechanical Keyboard RGB', 0, true),
-- iPhone 15 Case
('p0000001-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1628116904674-8b6fa3528659?q=80&w=500', 'iPhone 15 Case', 0, true),
-- Lipstick Matte
('p0000001-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=500', 'Lipstick Matte', 0, true),
-- Classic White T-Shirt
('p0000001-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=500', 'Classic White T-Shirt', 0, true),
-- Denim Jacket
('p0000001-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=500', 'Denim Jacket', 0, true),
-- Running Shoes
('p0000001-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=500', 'Running Shoes', 0, true),
-- Leather Wallet
('p0000001-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=500', 'Leather Wallet', 0, true),
-- Sunglasses
('p0000001-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=500', 'Sunglasses', 0, true),
-- Wrist Watch
('p0000001-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=500', 'Wrist Watch', 0, true),
-- Backpack
('p0000001-0000-0000-0000-000000000013', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=500', 'Backpack', 0, true),
-- Wireless Headphones
('p0000001-0000-0000-0000-000000000014', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=500', 'Wireless Headphones', 0, true),
-- Gaming Mouse
('p0000001-0000-0000-0000-000000000015', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=500', 'Gaming Mouse', 0, true),
-- Smart Band
('p0000001-0000-0000-0000-000000000016', 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?q=80&w=500', 'Smart Band', 0, true),
-- Portable Speaker
('p0000001-0000-0000-0000-000000000017', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=500', 'Portable Speaker', 0, true),
-- MacBook Air M1
('p0000001-0000-0000-0000-000000000018', 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=500', 'MacBook Air M1', 0, true),
('p0000001-0000-0000-0000-000000000018', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?q=80&w=500', 'MacBook Air M1 Side', 1, false),
('p0000001-0000-0000-0000-000000000018', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=500', 'MacBook Air M1 Open', 2, false);

-- ========================================
-- 5. PRODUCT VARIANTS
-- ========================================
INSERT INTO product_variants (product_id, sku, name, attributes, price, quantity, is_active) VALUES
-- Wireless Earbuds Pro
('p0000001-0000-0000-0000-000000000001', 'WEP-BLK-001', 'Black', '{"color": "Black"}', 299000, 100, true),
('p0000001-0000-0000-0000-000000000001', 'WEP-WHT-001', 'White', '{"color": "White"}', 299000, 80, true),
-- Smart Watch
('p0000001-0000-0000-0000-000000000002', 'SW7-BLK-001', 'Black', '{"color": "Black"}', 1590000, 50, true),
('p0000001-0000-0000-0000-000000000002', 'SW7-SLV-001', 'Silver', '{"color": "Silver"}', 1590000, 40, true),
-- Fashion Backpack
('p0000001-0000-0000-0000-000000000003', 'FBP-BLK-001', 'Black', '{"color": "Black"}', 159000, 200, true),
-- Mechanical Keyboard
('p0000001-0000-0000-0000-000000000004', 'MKB-RGB-001', 'RGB', '{"type": "RGB"}', 890000, 60, true),
-- iPhone 15 Case
('p0000001-0000-0000-0000-000000000005', 'IP15-CLR-001', 'Clear', '{"color": "Clear"}', 49000, 500, true),
('p0000001-0000-0000-0000-000000000005', 'IP15-BLK-001', 'Black', '{"color": "Black"}', 49000, 300, true),
-- Lipstick
('p0000001-0000-0000-0000-000000000006', 'LIP-RED-001', 'Red', '{"color": "Red"}', 129000, 150, true),
('p0000001-0000-0000-0000-000000000006', 'LIP-PNK-001', 'Pink', '{"color": "Pink"}', 129000, 120, true),
-- T-Shirt
('p0000001-0000-0000-0000-000000000007', 'TSH-WHT-S', 'White S', '{"color": "White", "size": "S"}', 150000, 100, true),
('p0000001-0000-0000-0000-000000000007', 'TSH-WHT-M', 'White M', '{"color": "White", "size": "M"}', 150000, 150, true),
('p0000001-0000-0000-0000-000000000007', 'TSH-WHT-L', 'White L', '{"color": "White", "size": "L"}', 150000, 120, true),
-- Denim Jacket
('p0000001-0000-0000-0000-000000000008', 'DNM-BLU-M', 'Blue M', '{"color": "Blue", "size": "M"}', 450000, 50, true),
('p0000001-0000-0000-0000-000000000008', 'DNM-BLU-L', 'Blue L', '{"color": "Blue", "size": "L"}', 450000, 40, true),
-- Running Shoes
('p0000001-0000-0000-0000-000000000009', 'RUN-BLK-42', 'Black 42', '{"color": "Black", "size": "42"}', 890000, 30, true),
('p0000001-0000-0000-0000-000000000009', 'RUN-BLK-43', 'Black 43', '{"color": "Black", "size": "43"}', 890000, 25, true),
-- Leather Wallet
('p0000001-0000-0000-0000-000000000010', 'WAL-BRN-001', 'Brown', '{"color": "Brown"}', 290000, 80, true),
-- Sunglasses
('p0000001-0000-0000-0000-000000000011', 'SUN-BLK-001', 'Black', '{"color": "Black"}', 190000, 100, true),
-- Wrist Watch
('p0000001-0000-0000-0000-000000000012', 'WCH-GLD-001', 'Gold', '{"color": "Gold"}', 1200000, 20, true),
('p0000001-0000-0000-0000-000000000012', 'WCH-SLV-001', 'Silver', '{"color": "Silver"}', 1200000, 25, true),
-- Backpack
('p0000001-0000-0000-0000-000000000013', 'BKP-GRY-001', 'Grey', '{"color": "Grey"}', 350000, 70, true),
-- Wireless Headphones
('p0000001-0000-0000-0000-000000000014', 'WHP-BLK-001', 'Black', '{"color": "Black"}', 590000, 60, true),
-- Gaming Mouse
('p0000001-0000-0000-0000-000000000015', 'GMS-BLK-001', 'Black', '{"color": "Black"}', 450000, 90, true),
-- Smart Band
('p0000001-0000-0000-0000-000000000016', 'SMB-BLK-001', 'Black', '{"color": "Black"}', 350000, 200, true),
-- Portable Speaker
('p0000001-0000-0000-0000-000000000017', 'SPK-BLU-001', 'Blue', '{"color": "Blue"}', 290000, 80, true),
-- MacBook Air M1
('p0000001-0000-0000-0000-000000000018', 'MBA-SGR-256', 'Space Grey 256GB', '{"color": "Space Grey", "storage": "256GB"}', 18990000, 15, true),
('p0000001-0000-0000-0000-000000000018', 'MBA-SLV-256', 'Silver 256GB', '{"color": "Silver", "storage": "256GB"}', 18990000, 12, true),
('p0000001-0000-0000-0000-000000000018', 'MBA-GLD-256', 'Gold 256GB', '{"color": "Gold", "storage": "256GB"}', 18990000, 10, true),
('p0000001-0000-0000-0000-000000000018', 'MBA-SGR-512', 'Space Grey 512GB', '{"color": "Space Grey", "storage": "512GB"}', 22990000, 8, true);

-- ========================================
-- 6. FLASH SALE CONFIG (optional - if table exists)
-- ========================================
-- You can add flash_sale table and data here if needed

SELECT 'Seed data inserted successfully!' as status;
