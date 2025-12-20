/**
 * Seed Pending Products for Testing Admin Approval
 * Run: node src/database/seed-pending-products.js
 */

const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample pending products from different categories
const PENDING_PRODUCTS = [
  // Electronics
  {
    name: 'iPhone 16 Pro Max 512GB Titan Đen',
    description: 'iPhone 16 Pro Max mới nhất với chip A18 Pro, camera 48MP, màn hình Super Retina XDR 6.9 inch. Thiết kế titan cao cấp, pin cả ngày.',
    base_price: 42990000,
    compare_at_price: 45990000,
    category_slug: 'dien-thoai',
  },
  {
    name: 'Samsung Galaxy Z Fold 6 256GB',
    description: 'Điện thoại gập cao cấp với màn hình Dynamic AMOLED 2X 7.6 inch, chip Snapdragon 8 Gen 3, camera 50MP. Hỗ trợ S Pen.',
    base_price: 41990000,
    compare_at_price: 44990000,
    category_slug: 'dien-thoai',
  },
  {
    name: 'MacBook Air 15" M3 16GB/512GB',
    description: 'MacBook Air 15 inch với chip M3, RAM 16GB, SSD 512GB. Màn hình Liquid Retina, pin 18 giờ, thiết kế siêu mỏng nhẹ.',
    base_price: 37990000,
    compare_at_price: 39990000,
    category_slug: 'laptop',
  },
  {
    name: 'Dell XPS 15 9530 Core i7-13700H RTX 4060',
    description: 'Laptop cao cấp với màn hình OLED 3.5K, Intel Core i7 Gen 13, RTX 4060, RAM 32GB, SSD 1TB. Thiết kế premium.',
    base_price: 52990000,
    compare_at_price: 56990000,
    category_slug: 'laptop',
  },
  // Fashion
  {
    name: 'Áo Polo Nam Premium Cotton Pique',
    description: 'Áo polo nam chất liệu cotton pique cao cấp, form regular fit, nhiều màu sắc. Size S-XXL.',
    base_price: 450000,
    compare_at_price: 599000,
    category_slug: 'ao-nam',
  },
  {
    name: 'Quần Jeans Nữ Skinny High Waist',
    description: 'Quần jeans nữ lưng cao, form skinny tôn dáng. Chất liệu denim co giãn thoải mái. Size 26-32.',
    base_price: 650000,
    compare_at_price: 850000,
    category_slug: 'quan-nu',
  },
  {
    name: 'Váy Đầm Maxi Hoa Nhí Vintage',
    description: 'Váy đầm maxi họa tiết hoa nhí phong cách vintage, chất liệu voan mềm mại, phù hợp đi biển, dạo phố.',
    base_price: 520000,
    compare_at_price: 699000,
    category_slug: 'vay-dam',
  },
  // Home & Living
  {
    name: 'Nồi Chiên Không Dầu Philips HD9252 4.1L',
    description: 'Nồi chiên không dầu Philips dung tích 4.1L, công nghệ Rapid Air, 7 chế độ nấu tự động. Bảo hành 24 tháng.',
    base_price: 2990000,
    compare_at_price: 3490000,
    category_slug: 'do-gia-dung',
  },
  {
    name: 'Robot Hút Bụi Xiaomi Vacuum X20 Pro',
    description: 'Robot hút bụi lau nhà thông minh, lực hút 6000Pa, tự động đổ rác, điều khiển qua app. Bản quốc tế.',
    base_price: 8990000,
    compare_at_price: 10990000,
    category_slug: 'do-gia-dung',
  },
  // Beauty
  {
    name: 'Serum Vitamin C 20% The Ordinary',
    description: 'Serum Vitamin C 20% giúp làm sáng da, mờ thâm nám, chống oxy hóa. Dung tích 30ml.',
    base_price: 350000,
    compare_at_price: 450000,
    category_slug: 'cham-soc-da',
  },
  {
    name: 'Son Kem Lì MAC Powder Kiss Liquid',
    description: 'Son kem lì MAC công thức mới, lên màu chuẩn, bền màu 8 giờ, không khô môi. Nhiều màu hot.',
    base_price: 750000,
    compare_at_price: 890000,
    category_slug: 'trang-diem',
  },
  // Sports
  {
    name: 'Giày Chạy Bộ Nike Air Zoom Pegasus 41',
    description: 'Giày chạy bộ Nike Pegasus 41 với đệm Zoom Air, đế React foam, trọng lượng nhẹ. Size 39-45.',
    base_price: 3290000,
    compare_at_price: 3890000,
    category_slug: 'giay-the-thao',
  },
  {
    name: 'Vợt Cầu Lông Yonex Astrox 99 Pro',
    description: 'Vợt cầu lông cao cấp Yonex Astrox 99 Pro, khung Namd, trục Slim Shaft. Tặng kèm túi vợt.',
    base_price: 4500000,
    compare_at_price: 5200000,
    category_slug: 'dung-cu-the-thao',
  },
];

async function seedPendingProducts() {
  console.log('🌱 Seeding pending products for admin approval testing...\n');

  // Get multiple active shops
  const { data: shops, error: shopError } = await supabase
    .from('shops')
    .select('id, shop_name')
    .eq('status', 'active')
    .limit(5);

  if (shopError || !shops?.length) {
    console.error('❌ No active shops found. Please run seed.js first.');
    process.exit(1);
  }

  console.log(`📦 Found ${shops.length} active shops`);
  shops.forEach(s => console.log(`   - ${s.shop_name}`));

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug');

  const categoryMap = {};
  categories?.forEach(c => {
    categoryMap[c.slug] = c.id;
  });

  console.log(`\n📁 Found ${categories?.length || 0} categories`);

  // Create pending products
  console.log('\n📝 Creating pending products...\n');

  let created = 0;
  for (let i = 0; i < PENDING_PRODUCTS.length; i++) {
    const product = PENDING_PRODUCTS[i];
    const shop = shops[i % shops.length]; // Distribute across shops
    const categoryId = categoryMap[product.category_slug] || categories?.[0]?.id || null;

    const productData = {
      id: uuidv4(),
      shop_id: shop.id,
      category_id: categoryId,
      name: product.name,
      slug: `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${i}`,
      description: product.description,
      base_price: product.base_price,
      compare_at_price: product.compare_at_price,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('products').insert(productData);

    if (error) {
      console.error(`  ❌ Failed: ${product.name} - ${error.message}`);
    } else {
      console.log(`  ✅ ${product.name}`);
      console.log(`     Shop: ${shop.shop_name} | Price: ${product.base_price.toLocaleString()}đ`);
      created++;
    }
  }

  console.log(`\n✨ Created ${created}/${PENDING_PRODUCTS.length} pending products`);
  console.log('👉 Go to Admin > Duyệt sản phẩm to test approval workflow');
}

seedPendingProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
