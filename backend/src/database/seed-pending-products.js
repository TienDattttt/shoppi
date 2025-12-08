/**
 * Seed Pending Products for Testing
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

async function seedPendingProducts() {
    console.log('🌱 Seeding pending products for testing...\n');

    // Get a shop to associate products with
    const { data: shop } = await supabase
        .from('shops')
        .select('id, shop_name')
        .eq('status', 'active')
        .limit(1)
        .single();

    if (!shop) {
        console.error('❌ No active shop found. Please run seed.js first.');
        process.exit(1);
    }

    console.log(`📦 Using shop: ${shop.shop_name}`);

    // Get a category
    const { data: category } = await supabase
        .from('categories')
        .select('id, name')
        .limit(1)
        .single();

    const categoryId = category?.id || null;

    // Pending products to create
    const pendingProducts = [
        {
            id: uuidv4(),
            shop_id: shop.id,
            category_id: categoryId,
            name: 'iPhone 15 Pro Max 256GB',
            slug: `iphone-15-pro-max-${Date.now()}`,
            description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
            base_price: 34990000,
            compare_at_price: 36990000,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: uuidv4(),
            shop_id: shop.id,
            category_id: categoryId,
            name: 'Samsung Galaxy S24 Ultra',
            slug: `samsung-galaxy-s24-ultra-${Date.now()}`,
            description: 'Premium Android flagship with S Pen, AI features, and 200MP camera',
            base_price: 31990000,
            compare_at_price: 33990000,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: uuidv4(),
            shop_id: shop.id,
            category_id: categoryId,
            name: 'MacBook Pro 14" M3 Pro',
            slug: `macbook-pro-14-m3-${Date.now()}`,
            description: 'Professional laptop with M3 Pro chip, 18GB RAM, 512GB SSD',
            base_price: 49990000,
            compare_at_price: 52990000,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: uuidv4(),
            shop_id: shop.id,
            category_id: categoryId,
            name: 'Sony WH-1000XM5 Headphones',
            slug: `sony-wh1000xm5-${Date.now()}`,
            description: 'Industry-leading noise canceling wireless headphones',
            base_price: 8490000,
            compare_at_price: 9990000,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: uuidv4(),
            shop_id: shop.id,
            category_id: categoryId,
            name: 'iPad Pro 12.9" M2 WiFi 256GB',
            slug: `ipad-pro-129-m2-${Date.now()}`,
            description: 'Powerful tablet with M2 chip, Liquid Retina XDR display',
            base_price: 28990000,
            compare_at_price: 30990000,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];

    console.log('\n📝 Creating pending products...');
    
    for (const product of pendingProducts) {
        const { error } = await supabase
            .from('products')
            .insert(product);

        if (error) {
            console.error(`  ❌ Failed to create "${product.name}":`, error.message);
        } else {
            console.log(`  ✅ Created: ${product.name} (pending)`);
        }
    }

    console.log('\n✨ Done! You can now test Approve/Reject/Revision actions.');
}

seedPendingProducts()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    });
