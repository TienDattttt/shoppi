/**
 * Seed Data Runner - Tiếng Việt
 * Run: node src/database/seeds/run-seed.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedWithClient() {
    console.log('🌱 Bắt đầu seed dữ liệu...\n');

    try {
        // 1. Tìm partner user
        console.log('👤 Tìm partner user...');
        const { data: partner } = await supabase.from('users').select('id').eq('email', 'partner@shoppi.com').single();
        
        if (!partner) {
            console.log('  ⚠ Không tìm thấy partner@shoppi.com. Vui lòng tạo tài khoản trước.');
            return;
        }
        console.log('  ✓ Tìm thấy partner:', partner.id);

        // 2. Kiểm tra/Tạo shop
        console.log('🏪 Kiểm tra/Tạo shop...');
        let { data: existingShop } = await supabase.from('shops').select('id').eq('partner_id', partner.id).single();
        
        let shopId;
        if (existingShop) {
            shopId = existingShop.id;
            await supabase.from('shops').update({
                shop_name: 'Shoppi Official Store',
                description: 'Cửa hàng chính hãng với sản phẩm chất lượng và giao hàng nhanh',
                follower_count: 15000,
                avg_rating: 4.9,
                response_rate: 98,
            }).eq('id', shopId);
            console.log('  ✓ Đã cập nhật shop:', shopId);
        } else {
            console.log('  ⚠ Không tìm thấy shop cho partner này');
            return;
        }

        // 3. Seed Categories - Tiếng Việt
        console.log('📁 Seed danh mục...');
        const categories = [
            { name: 'Thời Trang', slug: 'thoi-trang', description: 'Quần áo, giày dép, phụ kiện', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200', level: 1, sort_order: 1, is_active: true },
            { name: 'Điện Tử', slug: 'dien-tu', description: 'Điện thoại, laptop, phụ kiện', image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200', level: 1, sort_order: 2, is_active: true },
            { name: 'Nhà Cửa & Đời Sống', slug: 'nha-cua-doi-song', description: 'Nội thất, trang trí, nhà bếp', image_url: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=200', level: 1, sort_order: 3, is_active: true },
            { name: 'Mẹ & Bé', slug: 'me-va-be', description: 'Sản phẩm cho mẹ và bé', image_url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200', level: 1, sort_order: 4, is_active: true },
            { name: 'Thú Cưng', slug: 'thu-cung', description: 'Thức ăn, phụ kiện thú cưng', image_url: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200', level: 1, sort_order: 5, is_active: true },
            { name: 'Thể Thao', slug: 'the-thao', description: 'Dụng cụ thể thao, fitness', image_url: 'https://images.unsplash.com/photo-1461896836934-28f4f8d36f7a?w=200', level: 1, sort_order: 6, is_active: true },
            { name: 'Đồng Hồ', slug: 'dong-ho', description: 'Đồng hồ và phụ kiện', image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200', level: 1, sort_order: 7, is_active: true },
            { name: 'Khác', slug: 'khac', description: 'Sản phẩm khác', image_url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200', level: 1, sort_order: 8, is_active: true },
        ];

        const { error: catError } = await supabase.from('categories').upsert(categories, { onConflict: 'slug' });
        if (catError) console.log('  ⚠ Categories:', catError.message);
        else console.log('  ✓ Đã thêm danh mục');

        // Lấy category IDs
        const { data: catData } = await supabase.from('categories').select('id, slug');
        const catMap = {};
        catData?.forEach(c => catMap[c.slug] = c.id);

        // 4. Seed Products - Tiếng Việt
        console.log('📦 Seed sản phẩm...');
        const products = [
            // Flash Sale Products
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'Tai Nghe Bluetooth Pro', slug: 'tai-nghe-bluetooth-pro', description: 'Tai nghe không dây cao cấp với công nghệ chống ồn chủ động', short_description: 'Tai nghe không dây cao cấp', base_price: 299000, compare_at_price: 899000, status: 'active', total_sold: 1542, avg_rating: 4.8, review_count: 320 },
            { shop_id: shopId, category_id: catMap['dong-ho'], name: 'Đồng Hồ Thông Minh Series 7', slug: 'dong-ho-thong-minh-series-7', description: 'Đồng hồ thông minh với tính năng theo dõi sức khỏe', short_description: 'Đồng hồ thông minh theo dõi sức khỏe', base_price: 1590000, compare_at_price: 3500000, status: 'active', total_sold: 892, avg_rating: 4.9, review_count: 156 },
            { shop_id: shopId, category_id: catMap['thoi-trang'], name: 'Balo Thời Trang', slug: 'balo-thoi-trang', description: 'Balo thời trang bền đẹp cho mọi hoạt động', short_description: 'Balo thời trang hàng ngày', base_price: 159000, compare_at_price: 450000, status: 'active', total_sold: 231, avg_rating: 4.5, review_count: 89 },
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'Bàn Phím Cơ RGB', slug: 'ban-phim-co-rgb', description: 'Bàn phím cơ gaming với đèn LED RGB', short_description: 'Bàn phím cơ gaming', base_price: 890000, compare_at_price: 1500000, status: 'active', total_sold: 412, avg_rating: 4.7, review_count: 234 },
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'Ốp Lưng iPhone 15', slug: 'op-lung-iphone-15', description: 'Ốp lưng bảo vệ cao cấp cho iPhone 15', short_description: 'Ốp lưng iPhone 15', base_price: 49000, compare_at_price: 120000, status: 'active', total_sold: 5210, avg_rating: 4.6, review_count: 1230 },
            { shop_id: shopId, category_id: catMap['thoi-trang'], name: 'Son Môi Lì', slug: 'son-moi-li', description: 'Son môi lì lâu trôi với nhiều màu sắc', short_description: 'Son môi lì cao cấp', base_price: 129000, compare_at_price: 280000, status: 'active', total_sold: 120, avg_rating: 4.8, review_count: 67 },
            // Today Suggestions
            { shop_id: shopId, category_id: catMap['thoi-trang'], name: 'Áo Thun Trắng Basic', slug: 'ao-thun-trang-basic', description: 'Áo thun cotton trắng cơ bản', short_description: 'Áo thun cotton basic', base_price: 150000, status: 'active', total_sold: 120, avg_rating: 4.5, review_count: 45 },
            { shop_id: shopId, category_id: catMap['thoi-trang'], name: 'Áo Khoác Denim', slug: 'ao-khoac-denim', description: 'Áo khoác denim phong cách cho mọi mùa', short_description: 'Áo khoác denim thời trang', base_price: 450000, compare_at_price: 600000, status: 'active', total_sold: 450, avg_rating: 4.8, review_count: 123 },
            { shop_id: shopId, category_id: catMap['the-thao'], name: 'Giày Chạy Bộ', slug: 'giay-chay-bo', description: 'Giày chạy bộ nhẹ cho vận động viên', short_description: 'Giày thể thao chạy bộ', base_price: 890000, status: 'active', total_sold: 890, avg_rating: 4.7, review_count: 234 },
            { shop_id: shopId, category_id: catMap['thoi-trang'], name: 'Ví Da Nam', slug: 'vi-da-nam', description: 'Ví da thật với nhiều ngăn tiện dụng', short_description: 'Ví da thật cao cấp', base_price: 290000, status: 'active', total_sold: 230, avg_rating: 4.6, review_count: 89 },
            { shop_id: shopId, category_id: catMap['thoi-trang'], name: 'Kính Mát Thời Trang', slug: 'kinh-mat-thoi-trang', description: 'Kính mát chống UV phong cách', short_description: 'Kính mát chống UV', base_price: 190000, compare_at_price: 300000, status: 'active', total_sold: 150, avg_rating: 4.4, review_count: 56 },
            { shop_id: shopId, category_id: catMap['dong-ho'], name: 'Đồng Hồ Đeo Tay', slug: 'dong-ho-deo-tay', description: 'Đồng hồ đeo tay sang trọng với dây da', short_description: 'Đồng hồ dây da sang trọng', base_price: 1200000, status: 'active', total_sold: 560, avg_rating: 4.9, review_count: 178 },
            { shop_id: shopId, category_id: catMap['thoi-trang'], name: 'Balo Du Lịch', slug: 'balo-du-lich', description: 'Balo du lịch bền đẹp cho mọi chuyến đi', short_description: 'Balo du lịch tiện dụng', base_price: 350000, status: 'active', total_sold: 340, avg_rating: 4.5, review_count: 98 },
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'Tai Nghe Chụp Tai', slug: 'tai-nghe-chup-tai', description: 'Tai nghe chụp tai không dây với chống ồn', short_description: 'Tai nghe chụp tai ANC', base_price: 590000, compare_at_price: 900000, status: 'active', total_sold: 1200, avg_rating: 4.7, review_count: 456 },
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'Chuột Gaming', slug: 'chuot-gaming', description: 'Chuột gaming DPI cao với đèn RGB', short_description: 'Chuột gaming RGB', base_price: 450000, status: 'active', total_sold: 670, avg_rating: 4.6, review_count: 234 },
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'Vòng Đeo Tay Thông Minh', slug: 'vong-deo-tay-thong-minh', description: 'Vòng đeo tay theo dõi sức khỏe và nhịp tim', short_description: 'Vòng tay thông minh', base_price: 350000, status: 'active', total_sold: 2100, avg_rating: 4.4, review_count: 567 },
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'Loa Bluetooth Mini', slug: 'loa-bluetooth-mini', description: 'Loa Bluetooth di động với bass mạnh', short_description: 'Loa Bluetooth di động', base_price: 290000, status: 'active', total_sold: 430, avg_rating: 4.5, review_count: 123 },
            { shop_id: shopId, category_id: catMap['dien-tu'], name: 'MacBook Air M1', slug: 'macbook-air-m1', description: 'Apple MacBook Air 13 inch M1 2020 8GB/256GB - Chính hãng Apple Việt Nam', short_description: 'MacBook Air chip M1', base_price: 18990000, compare_at_price: 22990000, status: 'active', total_sold: 35000, avg_rating: 4.8, review_count: 12500 },
        ];

        const { error: prodError } = await supabase.from('products').upsert(products, { onConflict: 'slug' });
        if (prodError) console.log('  ⚠ Products:', prodError.message);
        else console.log('  ✓ Đã thêm sản phẩm');

        // Lấy product IDs
        const { data: prodData } = await supabase.from('products').select('id, slug');
        const prodMap = {};
        prodData?.forEach(p => prodMap[p.slug] = p.id);

        // 5. Seed Product Images
        console.log('🖼️ Seed hình ảnh sản phẩm...');
        const imageData = [
            { slug: 'tai-nghe-bluetooth-pro', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=500', alt: 'Tai Nghe Bluetooth Pro' },
            { slug: 'dong-ho-thong-minh-series-7', url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=500', alt: 'Đồng Hồ Thông Minh Series 7' },
            { slug: 'balo-thoi-trang', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=500', alt: 'Balo Thời Trang' },
            { slug: 'ban-phim-co-rgb', url: 'https://images.unsplash.com/photo-1587829741301-dc798b91a603?q=80&w=500', alt: 'Bàn Phím Cơ RGB' },
            { slug: 'op-lung-iphone-15', url: 'https://images.unsplash.com/photo-1628116904674-8b6fa3528659?q=80&w=500', alt: 'Ốp Lưng iPhone 15' },
            { slug: 'son-moi-li', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=500', alt: 'Son Môi Lì' },
            { slug: 'ao-thun-trang-basic', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=500', alt: 'Áo Thun Trắng Basic' },
            { slug: 'ao-khoac-denim', url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=500', alt: 'Áo Khoác Denim' },
            { slug: 'giay-chay-bo', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=500', alt: 'Giày Chạy Bộ' },
            { slug: 'vi-da-nam', url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=500', alt: 'Ví Da Nam' },
            { slug: 'kinh-mat-thoi-trang', url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=500', alt: 'Kính Mát Thời Trang' },
            { slug: 'dong-ho-deo-tay', url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=500', alt: 'Đồng Hồ Đeo Tay' },
            { slug: 'balo-du-lich', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=500', alt: 'Balo Du Lịch' },
            { slug: 'tai-nghe-chup-tai', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=500', alt: 'Tai Nghe Chụp Tai' },
            { slug: 'chuot-gaming', url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=500', alt: 'Chuột Gaming' },
            { slug: 'vong-deo-tay-thong-minh', url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?q=80&w=500', alt: 'Vòng Đeo Tay Thông Minh' },
            { slug: 'loa-bluetooth-mini', url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=500', alt: 'Loa Bluetooth Mini' },
            { slug: 'macbook-air-m1', url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=500', alt: 'MacBook Air M1' },
        ];

        const images = imageData
            .filter(img => prodMap[img.slug])
            .map(img => ({
                product_id: prodMap[img.slug],
                url: img.url,
                alt_text: img.alt,
                sort_order: 0,
                is_primary: true
            }));

        // Xóa ảnh cũ trước
        const productIds = Object.values(prodMap);
        if (productIds.length > 0) {
            await supabase.from('product_images').delete().in('product_id', productIds);
        }
        
        const { error: imgError } = await supabase.from('product_images').insert(images);
        if (imgError) console.log('  ⚠ Images:', imgError.message);
        else console.log('  ✓ Đã thêm hình ảnh');

        // 6. Seed Product Variants - Tiếng Việt
        console.log('🎨 Seed biến thể sản phẩm...');
        const variantData = [
            { slug: 'tai-nghe-bluetooth-pro', sku: 'TNBT-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 299000, quantity: 100 },
            { slug: 'tai-nghe-bluetooth-pro', sku: 'TNBT-TRG-001', name: 'Trắng', attributes: { color: 'Trắng' }, price: 299000, quantity: 80 },
            { slug: 'dong-ho-thong-minh-series-7', sku: 'DHTM-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 1590000, quantity: 50 },
            { slug: 'dong-ho-thong-minh-series-7', sku: 'DHTM-BAC-001', name: 'Bạc', attributes: { color: 'Bạc' }, price: 1590000, quantity: 40 },
            { slug: 'balo-thoi-trang', sku: 'BLTT-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 159000, quantity: 200 },
            { slug: 'ban-phim-co-rgb', sku: 'BPCO-RGB-001', name: 'RGB', attributes: { type: 'RGB' }, price: 890000, quantity: 60 },
            { slug: 'op-lung-iphone-15', sku: 'OLIP-TRONG-001', name: 'Trong suốt', attributes: { color: 'Trong suốt' }, price: 49000, quantity: 500 },
            { slug: 'op-lung-iphone-15', sku: 'OLIP-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 49000, quantity: 300 },
            { slug: 'son-moi-li', sku: 'SML-DO-001', name: 'Đỏ', attributes: { color: 'Đỏ' }, price: 129000, quantity: 150 },
            { slug: 'son-moi-li', sku: 'SML-HONG-001', name: 'Hồng', attributes: { color: 'Hồng' }, price: 129000, quantity: 120 },
            { slug: 'ao-thun-trang-basic', sku: 'ATTB-TRG-S', name: 'Trắng S', attributes: { color: 'Trắng', size: 'S' }, price: 150000, quantity: 100 },
            { slug: 'ao-thun-trang-basic', sku: 'ATTB-TRG-M', name: 'Trắng M', attributes: { color: 'Trắng', size: 'M' }, price: 150000, quantity: 150 },
            { slug: 'ao-thun-trang-basic', sku: 'ATTB-TRG-L', name: 'Trắng L', attributes: { color: 'Trắng', size: 'L' }, price: 150000, quantity: 120 },
            { slug: 'ao-khoac-denim', sku: 'AKDN-XD-M', name: 'Xanh đậm M', attributes: { color: 'Xanh đậm', size: 'M' }, price: 450000, quantity: 50 },
            { slug: 'ao-khoac-denim', sku: 'AKDN-XD-L', name: 'Xanh đậm L', attributes: { color: 'Xanh đậm', size: 'L' }, price: 450000, quantity: 40 },
            { slug: 'giay-chay-bo', sku: 'GCB-DEN-42', name: 'Đen 42', attributes: { color: 'Đen', size: '42' }, price: 890000, quantity: 30 },
            { slug: 'giay-chay-bo', sku: 'GCB-DEN-43', name: 'Đen 43', attributes: { color: 'Đen', size: '43' }, price: 890000, quantity: 25 },
            { slug: 'vi-da-nam', sku: 'VDN-NAU-001', name: 'Nâu', attributes: { color: 'Nâu' }, price: 290000, quantity: 80 },
            { slug: 'kinh-mat-thoi-trang', sku: 'KMTT-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 190000, quantity: 100 },
            { slug: 'dong-ho-deo-tay', sku: 'DHDT-VANG-001', name: 'Vàng', attributes: { color: 'Vàng' }, price: 1200000, quantity: 20 },
            { slug: 'dong-ho-deo-tay', sku: 'DHDT-BAC-001', name: 'Bạc', attributes: { color: 'Bạc' }, price: 1200000, quantity: 25 },
            { slug: 'balo-du-lich', sku: 'BLDL-XAM-001', name: 'Xám', attributes: { color: 'Xám' }, price: 350000, quantity: 70 },
            { slug: 'tai-nghe-chup-tai', sku: 'TNCT-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 590000, quantity: 60 },
            { slug: 'chuot-gaming', sku: 'CGM-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 450000, quantity: 90 },
            { slug: 'vong-deo-tay-thong-minh', sku: 'VDTTM-DEN-001', name: 'Đen', attributes: { color: 'Đen' }, price: 350000, quantity: 200 },
            { slug: 'loa-bluetooth-mini', sku: 'LBTM-XD-001', name: 'Xanh dương', attributes: { color: 'Xanh dương' }, price: 290000, quantity: 80 },
            { slug: 'macbook-air-m1', sku: 'MBA-XAM-256', name: 'Xám 256GB', attributes: { color: 'Xám', storage: '256GB' }, price: 18990000, quantity: 15 },
            { slug: 'macbook-air-m1', sku: 'MBA-BAC-256', name: 'Bạc 256GB', attributes: { color: 'Bạc', storage: '256GB' }, price: 18990000, quantity: 12 },
            { slug: 'macbook-air-m1', sku: 'MBA-VANG-256', name: 'Vàng 256GB', attributes: { color: 'Vàng', storage: '256GB' }, price: 18990000, quantity: 10 },
        ];

        const variants = variantData
            .filter(v => prodMap[v.slug])
            .map(v => ({
                product_id: prodMap[v.slug],
                sku: v.sku,
                name: v.name,
                attributes: v.attributes,
                price: v.price,
                quantity: v.quantity,
                is_active: true
            }));

        const { error: varError } = await supabase.from('product_variants').upsert(variants, { onConflict: 'sku' });
        if (varError) console.log('  ⚠ Variants:', varError.message);
        else console.log('  ✓ Đã thêm biến thể');

        console.log('\n✅ Seed hoàn tất!');
        console.log(`   - Danh mục: ${categories.length}`);
        console.log(`   - Sản phẩm: ${products.length}`);
        console.log(`   - Hình ảnh: ${images.length}`);
        console.log(`   - Biến thể: ${variants.length}`);
    } catch (error) {
        console.error('❌ Seed thất bại:', error.message);
    }
}

// Run seed
seedWithClient();
