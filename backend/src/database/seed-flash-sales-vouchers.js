/**
 * Seed Flash Sales and Platform Vouchers
 * Run: node src/database/seed-flash-sales-vouchers.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedFlashSalesAndVouchers() {
  console.log('🚀 Starting Flash Sales & Vouchers seed...\n');

  try {
    // Get admin user for created_by
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .single();

    const adminId = adminUser?.id;

    // Get some products for flash sale
    const { data: products } = await supabase
      .from('products')
      .select('id, name, base_price, compare_at_price')
      .eq('status', 'active')
      .limit(10);

    if (!products || products.length === 0) {
      console.log('❌ No products found. Please seed products first.');
      return;
    }

    console.log(`📦 Found ${products.length} products for flash sales\n`);

    // ========================================
    // 1. SEED FLASH SALES
    // ========================================
    console.log('⚡ Creating Flash Sales...');

    const now = new Date();
    const flashSales = [
      {
        name: 'Flash Sale 12:00',
        slug: 'flash-sale-12-00',
        description: 'Siêu sale giữa trưa - Giảm đến 50%',
        start_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString(),
        end_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0).toISOString(),
        status: 'active',
        max_products: 50,
        banner_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
        is_featured: true,
        sort_order: 1,
        created_by: adminId,
      },
      {
        name: 'Flash Sale 21:00',
        slug: 'flash-sale-21-00',
        description: 'Đêm khuya săn sale - Giảm sốc đến 70%',
        start_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0).toISOString(),
        end_time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString(),
        status: 'scheduled',
        max_products: 100,
        banner_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
        is_featured: true,
        sort_order: 2,
        created_by: adminId,
      },
      {
        name: 'Weekend Mega Sale',
        slug: 'weekend-mega-sale',
        description: 'Cuối tuần bùng nổ - Giảm giá cực sốc',
        start_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
        end_time: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
        status: 'scheduled',
        max_products: 200,
        banner_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200',
        is_featured: false,
        sort_order: 3,
        created_by: adminId,
      },
    ];

    const createdFlashSales = [];
    for (const sale of flashSales) {
      const { data, error } = await supabase
        .from('flash_sales')
        .upsert(sale, { onConflict: 'slug' })
        .select('id, slug')
        .single();
      
      if (error) {
        console.log(`  ⚠️ Flash sale "${sale.name}": ${error.message}`);
        // Try to get existing
        const { data: existing } = await supabase
          .from('flash_sales')
          .select('id, slug')
          .eq('slug', sale.slug)
          .single();
        if (existing) createdFlashSales.push(existing);
      } else {
        console.log(`  ✅ Flash sale: ${sale.name}`);
        createdFlashSales.push(data);
      }
    }

    // ========================================
    // 2. SEED FLASH SALE PRODUCTS
    // ========================================
    console.log('\n📦 Adding products to Flash Sales...');

    const flashSaleProducts = [];
    
    // Get flash sale IDs by slug
    const flashSale1 = createdFlashSales.find(fs => fs.slug === 'flash-sale-12-00');
    const flashSale2 = createdFlashSales.find(fs => fs.slug === 'flash-sale-21-00');
    const flashSale3 = createdFlashSales.find(fs => fs.slug === 'weekend-mega-sale');

    // Add products to first flash sale (12:00)
    if (flashSale1) {
      products.slice(0, 5).forEach((product, index) => {
        const originalPrice = parseFloat(product.compare_at_price || product.base_price);
        const discountPercent = 30 + Math.floor(Math.random() * 40); // 30-70% discount
        const flashPrice = Math.round(originalPrice * (1 - discountPercent / 100) / 1000) * 1000;
        
        flashSaleProducts.push({
          flash_sale_id: flashSale1.id,
          product_id: product.id,
          original_price: originalPrice,
          flash_price: Math.max(flashPrice, 1000), // Ensure min price
          flash_stock: 50 + Math.floor(Math.random() * 100),
          sold_count: Math.floor(Math.random() * 30),
          limit_per_user: 2,
          is_active: true,
          sort_order: index,
        });
      });
    }

    // Add products to second flash sale (21:00)
    if (flashSale2) {
      products.slice(3, 8).forEach((product, index) => {
        const originalPrice = parseFloat(product.compare_at_price || product.base_price);
        const discountPercent = 40 + Math.floor(Math.random() * 30); // 40-70% discount
        const flashPrice = Math.round(originalPrice * (1 - discountPercent / 100) / 1000) * 1000;
        
        flashSaleProducts.push({
          flash_sale_id: flashSale2.id,
          product_id: product.id,
          original_price: originalPrice,
          flash_price: Math.max(flashPrice, 1000),
          flash_stock: 30 + Math.floor(Math.random() * 70),
          sold_count: 0,
          limit_per_user: 1,
          is_active: true,
          sort_order: index,
        });
      });
    }

    // Add products to weekend sale
    if (flashSale3) {
      products.slice(0, 10).forEach((product, index) => {
        const originalPrice = parseFloat(product.compare_at_price || product.base_price);
        const discountPercent = 20 + Math.floor(Math.random() * 50); // 20-70% discount
        const flashPrice = Math.round(originalPrice * (1 - discountPercent / 100) / 1000) * 1000;
        
        flashSaleProducts.push({
          flash_sale_id: flashSale3.id,
          product_id: product.id,
          original_price: originalPrice,
          flash_price: Math.max(flashPrice, 1000),
          flash_stock: 100 + Math.floor(Math.random() * 200),
          sold_count: 0,
          limit_per_user: 3,
          is_active: true,
          sort_order: index,
        });
      });
    }

    for (const fsp of flashSaleProducts) {
      const { error } = await supabase
        .from('flash_sale_products')
        .upsert(fsp, { onConflict: 'flash_sale_id,product_id,variant_id', ignoreDuplicates: true });
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`  ⚠️ Flash sale product: ${error.message}`);
      }
    }
    console.log(`  ✅ Added ${flashSaleProducts.length} products to flash sales`);

    // ========================================
    // 3. SEED PLATFORM VOUCHERS
    // ========================================
    console.log('\n🎫 Creating Platform Vouchers...');

    const vouchers = [
      // Welcome vouchers (remove id to let DB generate)
      {
        code: 'WELCOME50K',
        name: 'Chào mừng thành viên mới',
        description: 'Giảm 50.000đ cho đơn hàng đầu tiên từ 200.000đ',
        type: 'platform',
        shop_id: null,
        discount_type: 'fixed',
        discount_value: 50000,
        max_discount: null,
        min_order_value: 200000,
        usage_limit: 10000,
        used_count: 0,
        per_user_limit: 1,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      {
        code: 'NEWUSER100K',
        name: 'Ưu đãi người dùng mới',
        description: 'Giảm 100.000đ cho đơn hàng từ 500.000đ',
        type: 'platform',
        shop_id: null,
        discount_type: 'fixed',
        discount_value: 100000,
        max_discount: null,
        min_order_value: 500000,
        usage_limit: 5000,
        used_count: 0,
        per_user_limit: 1,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      // Free shipping vouchers
      {
        code: 'FREESHIP',
        name: 'Miễn phí vận chuyển',
        description: 'Miễn phí vận chuyển cho đơn từ 99.000đ',
        type: 'platform',
        shop_id: null,
        discount_type: 'fixed',
        discount_value: 30000,
        max_discount: null,
        min_order_value: 99000,
        usage_limit: 50000,
        used_count: 1234,
        per_user_limit: 5,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      {
        code: 'FREESHIP50K',
        name: 'Giảm 50K phí ship',
        description: 'Giảm 50.000đ phí vận chuyển cho đơn từ 299.000đ',
        type: 'platform',
        shop_id: null,
        discount_type: 'fixed',
        discount_value: 50000,
        max_discount: null,
        min_order_value: 299000,
        usage_limit: 20000,
        used_count: 567,
        per_user_limit: 3,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      // Percentage discount vouchers
      {
        code: 'SALE10',
        name: 'Giảm 10%',
        description: 'Giảm 10% tối đa 50.000đ cho đơn từ 200.000đ',
        type: 'platform',
        shop_id: null,
        discount_type: 'percentage',
        discount_value: 10,
        max_discount: 50000,
        min_order_value: 200000,
        usage_limit: 30000,
        used_count: 2345,
        per_user_limit: 3,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      {
        code: 'SALE20',
        name: 'Giảm 20%',
        description: 'Giảm 20% tối đa 100.000đ cho đơn từ 500.000đ',
        type: 'platform',
        shop_id: null,
        discount_type: 'percentage',
        discount_value: 20,
        max_discount: 100000,
        min_order_value: 500000,
        usage_limit: 10000,
        used_count: 890,
        per_user_limit: 2,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      {
        code: 'MEGA30',
        name: 'Mega Sale 30%',
        description: 'Giảm 30% tối đa 200.000đ cho đơn từ 1.000.000đ',
        type: 'platform',
        shop_id: null,
        discount_type: 'percentage',
        discount_value: 30,
        max_discount: 200000,
        min_order_value: 1000000,
        usage_limit: 3000,
        used_count: 456,
        per_user_limit: 1,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      // Special event vouchers
      {
        code: 'XMAS2024',
        name: 'Giáng sinh 2024',
        description: 'Giảm 25% tối đa 150.000đ - Mừng Giáng sinh',
        type: 'platform',
        shop_id: null,
        discount_type: 'percentage',
        discount_value: 25,
        max_discount: 150000,
        min_order_value: 400000,
        usage_limit: 5000,
        used_count: 0,
        per_user_limit: 1,
        start_date: new Date(2024, 11, 20).toISOString(), // Dec 20
        end_date: new Date(2024, 11, 26).toISOString(), // Dec 26
        is_active: true,
      },
      {
        code: 'NEWYEAR2025',
        name: 'Năm mới 2025',
        description: 'Giảm 50.000đ - Chào năm mới 2025',
        type: 'platform',
        shop_id: null,
        discount_type: 'fixed',
        discount_value: 50000,
        max_discount: null,
        min_order_value: 250000,
        usage_limit: 10000,
        used_count: 0,
        per_user_limit: 1,
        start_date: new Date(2024, 11, 28).toISOString(), // Dec 28
        end_date: new Date(2025, 0, 5).toISOString(), // Jan 5
        is_active: true,
      },
      {
        code: 'TET2025',
        name: 'Tết Nguyên Đán 2025',
        description: 'Giảm 15% tối đa 300.000đ - Mừng Tết Ất Tỵ',
        type: 'platform',
        shop_id: null,
        discount_type: 'percentage',
        discount_value: 15,
        max_discount: 300000,
        min_order_value: 500000,
        usage_limit: 20000,
        used_count: 0,
        per_user_limit: 2,
        start_date: new Date(2025, 0, 20).toISOString(), // Jan 20
        end_date: new Date(2025, 1, 10).toISOString(), // Feb 10
        is_active: true,
      },
      // Flash sale vouchers
      {
        code: 'FLASH50',
        name: 'Flash Voucher 50K',
        description: 'Giảm 50.000đ - Chỉ dùng trong Flash Sale',
        type: 'platform',
        shop_id: null,
        discount_type: 'fixed',
        discount_value: 50000,
        max_discount: null,
        min_order_value: 150000,
        usage_limit: 1000,
        used_count: 234,
        per_user_limit: 1,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      {
        code: 'FLASH100',
        name: 'Flash Voucher 100K',
        description: 'Giảm 100.000đ - Số lượng có hạn',
        type: 'platform',
        shop_id: null,
        discount_type: 'fixed',
        discount_value: 100000,
        max_discount: null,
        min_order_value: 500000,
        usage_limit: 500,
        used_count: 123,
        per_user_limit: 1,
        start_date: now.toISOString(),
        end_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
    ];

    for (const voucher of vouchers) {
      const { error } = await supabase
        .from('vouchers')
        .upsert(voucher, { onConflict: 'code' });
      
      if (error) {
        console.log(`  ⚠️ Voucher "${voucher.code}": ${error.message}`);
      } else {
        console.log(`  ✅ Voucher: ${voucher.code} - ${voucher.name}`);
      }
    }

    // ========================================
    // 4. GET SHOP AND SEED SHOP VOUCHERS
    // ========================================
    console.log('\n🏪 Creating Shop Vouchers...');

    const { data: shops } = await supabase
      .from('shops')
      .select('id, shop_name')
      .eq('status', 'active')
      .limit(5);

    if (shops && shops.length > 0) {
      const shopVoucherTemplates = [
        { suffix: '10', discount_type: 'percentage', discount_value: 10, max_discount: 30000, min_order_value: 100000, name: 'Giảm 10%' },
        { suffix: '20K', discount_type: 'fixed', discount_value: 20000, max_discount: null, min_order_value: 150000, name: 'Giảm 20K' },
        { suffix: '50K', discount_type: 'fixed', discount_value: 50000, max_discount: null, min_order_value: 300000, name: 'Giảm 50K' },
      ];

      for (const shop of shops) {
        const shopCode = shop.shop_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
        
        for (const template of shopVoucherTemplates) {
          const code = `${shopCode}${template.suffix}`;
          const shopVoucher = {
            code,
            name: `${template.name} tại ${shop.shop_name}`,
            description: `${template.name} cho đơn từ ${template.min_order_value.toLocaleString()}đ tại ${shop.shop_name}`,
            type: 'shop',
            shop_id: shop.id,
            discount_type: template.discount_type,
            discount_value: template.discount_value,
            max_discount: template.max_discount,
            min_order_value: template.min_order_value,
            usage_limit: 1000,
            used_count: Math.floor(Math.random() * 100),
            per_user_limit: 2,
            start_date: now.toISOString(),
            end_date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
          };

          const { error } = await supabase
            .from('vouchers')
            .upsert(shopVoucher, { onConflict: 'code' });
          
          if (error) {
            console.log(`  ⚠️ Shop voucher "${code}": ${error.message}`);
          } else {
            console.log(`  ✅ Shop voucher: ${code}`);
          }
        }
      }
    }

    console.log('\n✅ Flash Sales & Vouchers seed completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Flash Sales: ${flashSales.length}`);
    console.log(`   - Flash Sale Products: ${flashSaleProducts.length}`);
    console.log(`   - Platform Vouchers: ${vouchers.length}`);
    console.log(`   - Shop Vouchers: ${shops ? shops.length * 3 : 0}`);

  } catch (error) {
    console.error('❌ Seed error:', error);
  }
}

seedFlashSalesAndVouchers();
