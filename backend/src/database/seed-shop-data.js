/**
 * Seed Shop Data: Vouchers, Followers, Reviews
 * For shop: setupholic@shoppi.com
 * Run: node src/database/seed-shop-data.js
 */

const { supabaseAdmin } = require('../shared/supabase/supabase.client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const SHOP_EMAIL = 'setupholic@shoppi.com';
const PASSWORD = 'Test@123';

// 3 test users who will follow and review
const TEST_USERS = [
  {
    email: 'follower1@test.com',
    phone: '0912000001',
    fullName: 'Nguyễn Văn Follower 1',
  },
  {
    email: 'follower2@test.com',
    phone: '0912000002',
    fullName: 'Trần Thị Follower 2',
  },
  {
    email: 'follower3@test.com',
    phone: '0912000003',
    fullName: 'Lê Hoàng Follower 3',
  },
];

// Shop vouchers
const SHOP_VOUCHERS = [
  {
    code: 'SETUP10',
    name: 'Giảm 10% đơn hàng',
    description: 'Giảm 10% cho đơn hàng từ 500K tại Setup Holic',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 100000,
    minOrderValue: 500000,
    usageLimit: 100,
    perUserLimit: 1,
  },
  {
    code: 'SETUP50K',
    name: 'Giảm 50K đơn hàng',
    description: 'Giảm 50.000đ cho đơn hàng từ 300K',
    discountType: 'fixed',
    discountValue: 50000,
    maxDiscount: null,
    minOrderValue: 300000,
    usageLimit: 200,
    perUserLimit: 2,
  },
  {
    code: 'SETUPNEW',
    name: 'Khách hàng mới giảm 15%',
    description: 'Giảm 15% cho khách hàng mới, tối đa 150K',
    discountType: 'percentage',
    discountValue: 15,
    maxDiscount: 150000,
    minOrderValue: 200000,
    usageLimit: 50,
    perUserLimit: 1,
  },
  {
    code: 'SETUP100K',
    name: 'Giảm 100K đơn từ 1 triệu',
    description: 'Giảm 100.000đ cho đơn hàng từ 1.000.000đ',
    discountType: 'fixed',
    discountValue: 100000,
    maxDiscount: null,
    minOrderValue: 1000000,
    usageLimit: 30,
    perUserLimit: 1,
  },
  {
    code: 'SETUPVIP',
    name: 'VIP giảm 20%',
    description: 'Giảm 20% cho khách VIP, tối đa 500K',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 500000,
    minOrderValue: 1000000,
    usageLimit: 20,
    perUserLimit: 1,
  },
];

// Sample reviews
const SAMPLE_REVIEWS = [
  {
    rating: 5,
    title: 'Sản phẩm tuyệt vời!',
    content: 'Chất lượng rất tốt, đóng gói cẩn thận. Giao hàng nhanh. Sẽ ủng hộ shop dài dài!',
  },
  {
    rating: 4,
    title: 'Hài lòng với sản phẩm',
    content: 'Sản phẩm đúng mô tả, chất lượng ổn. Giao hàng hơi chậm một chút nhưng vẫn chấp nhận được.',
  },
  {
    rating: 5,
    title: 'Shop uy tín',
    content: 'Mua lần thứ 3 rồi, lần nào cũng hài lòng. Shop tư vấn nhiệt tình, sản phẩm chính hãng.',
  },
];

async function seedShopData() {
  console.log('='.repeat(60));
  console.log('🛍️ Seeding Shop Data: Vouchers, Followers, Reviews');
  console.log(`   Shop: ${SHOP_EMAIL}`);
  console.log('='.repeat(60));

  // 1. Find the shop
  const { data: shopOwner } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', SHOP_EMAIL)
    .single();

  if (!shopOwner) {
    console.error(`❌ User not found: ${SHOP_EMAIL}`);
    process.exit(1);
  }

  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, shop_name')
    .eq('partner_id', shopOwner.id)
    .single();

  if (!shop) {
    console.error(`❌ Shop not found for user: ${SHOP_EMAIL}`);
    process.exit(1);
  }

  console.log(`\n📦 Found shop: ${shop.shop_name} (${shop.id.slice(0, 8)}...)`);

  // 2. Get shop products for reviews
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('shop_id', shop.id)
    .eq('status', 'active')
    .limit(10);

  console.log(`   Found ${products?.length || 0} active products`);

  // 3. Create/Get test users
  console.log('\n👥 Creating test users...');
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  const userIds = [];

  for (const user of TEST_USERS) {
    const normalizedPhone = '+84' + user.phone.slice(1);
    
    // Check if exists
    let { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!existingUser) {
      // Create user
      const userId = uuidv4();
      const { error } = await supabaseAdmin.from('users').insert({
        id: userId,
        email: user.email,
        phone: normalizedPhone,
        full_name: user.fullName,
        password_hash: hashedPassword,
        role: 'customer',
        status: 'active',
      });

      if (error) {
        console.error(`   ❌ Failed to create ${user.email}: ${error.message}`);
        continue;
      }
      userIds.push(userId);
      console.log(`   ✓ Created: ${user.fullName}`);
    } else {
      userIds.push(existingUser.id);
      console.log(`   ✓ Exists: ${user.fullName}`);
    }
  }

  // 4. Create shop vouchers
  console.log('\n🎫 Creating shop vouchers...');
  const now = new Date();
  const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

  for (const voucher of SHOP_VOUCHERS) {
    // Check if exists
    const { data: existing } = await supabaseAdmin
      .from('vouchers')
      .select('id')
      .eq('code', voucher.code)
      .single();

    if (existing) {
      console.log(`   ⏭️ Voucher exists: ${voucher.code}`);
      continue;
    }

    const { error } = await supabaseAdmin.from('vouchers').insert({
      id: uuidv4(),
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      type: 'shop',
      shop_id: shop.id,
      discount_type: voucher.discountType,
      discount_value: voucher.discountValue,
      max_discount: voucher.maxDiscount,
      min_order_value: voucher.minOrderValue,
      usage_limit: voucher.usageLimit,
      per_user_limit: voucher.perUserLimit,
      used_count: 0,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      is_active: true,
    });

    if (error) {
      console.error(`   ❌ Failed: ${voucher.code} - ${error.message}`);
    } else {
      console.log(`   ✓ Created: ${voucher.code} - ${voucher.name}`);
    }
  }

  // 5. Create follows
  console.log('\n❤️ Creating followers...');
  for (const userId of userIds) {
    // Check if already following
    const { data: existing } = await supabaseAdmin
      .from('follows')
      .select('id')
      .eq('user_id', userId)
      .eq('shop_id', shop.id)
      .single();

    if (existing) {
      console.log(`   ⏭️ Already following`);
      continue;
    }

    const { error } = await supabaseAdmin.from('follows').insert({
      id: uuidv4(),
      user_id: userId,
      shop_id: shop.id,
    });

    if (error) {
      console.error(`   ❌ Follow error: ${error.message}`);
    } else {
      console.log(`   ✓ User ${userId.slice(0, 8)}... now follows shop`);
    }
  }

  // Update shop follower count
  const { count: followerCount } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shop.id);

  await supabaseAdmin
    .from('shops')
    .update({ follower_count: followerCount })
    .eq('id', shop.id);

  console.log(`   📊 Total followers: ${followerCount}`);

  // 6. Create reviews
  console.log('\n⭐ Creating reviews...');
  if (products && products.length > 0) {
    for (let i = 0; i < Math.min(userIds.length, products.length); i++) {
      const userId = userIds[i];
      const product = products[i];
      const review = SAMPLE_REVIEWS[i % SAMPLE_REVIEWS.length];

      // Check if review exists
      const { data: existing } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', product.id)
        .single();

      if (existing) {
        console.log(`   ⏭️ Review exists for ${product.name.slice(0, 30)}...`);
        continue;
      }

      const { error } = await supabaseAdmin.from('reviews').insert({
        id: uuidv4(),
        product_id: product.id,
        user_id: userId,
        rating: review.rating,
        title: review.title,
        content: review.content,
        is_verified_purchase: true,
        status: 'active',
      });

      if (error) {
        console.error(`   ❌ Review error: ${error.message}`);
      } else {
        console.log(`   ✓ ${review.rating}⭐ for "${product.name.slice(0, 30)}..."`);
      }
    }
  } else {
    console.log('   ⚠️ No products found to review');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`   Shop: ${shop.shop_name}`);
  console.log(`   Vouchers: ${SHOP_VOUCHERS.length}`);
  console.log(`   Followers: ${userIds.length}`);
  console.log(`   Reviews: ${Math.min(userIds.length, products?.length || 0)}`);
  console.log('\n🔑 Test user credentials:');
  TEST_USERS.forEach(u => {
    console.log(`   ${u.email} / ${PASSWORD}`);
  });
  console.log('='.repeat(60));
}

seedShopData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
