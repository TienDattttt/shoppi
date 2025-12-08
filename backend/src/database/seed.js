/**
 * Database Seed Script
 * Creates test users for development and testing
 * 
 * Run: node src/database/seed.js
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SALT_ROUNDS = 10;

async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

async function seed() {
    console.log('🌱 Starting database seed...\n');

    const defaultPassword = await hashPassword('123456');

    // Test Users
    const users = [
        {
            id: uuidv4(),
            email: 'admin@shoppi.com',
            phone: '+84901000001',
            password_hash: defaultPassword,
            role: 'admin',
            status: 'active',
            full_name: 'Admin Shoppi',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: uuidv4(),
            email: 'partner@shoppi.com',
            phone: '+84901000002',
            password_hash: defaultPassword,
            role: 'partner',
            status: 'active',
            full_name: 'Partner Demo',
            business_name: 'Demo Shop',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: uuidv4(),
            email: 'customer@shoppi.com',
            phone: '+84901000003',
            password_hash: defaultPassword,
            role: 'customer',
            status: 'active',
            full_name: 'Customer Demo',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: uuidv4(),
            email: 'shipper@shoppi.com',
            phone: '+84901000004',
            password_hash: defaultPassword,
            role: 'shipper',
            status: 'active',
            full_name: 'Shipper Demo',
            vehicle_type: 'motorcycle',
            vehicle_plate: '59A1-12345',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];

    // Insert users
    console.log('👤 Creating test users...');
    for (const user of users) {
        const { error } = await supabase
            .from('users')
            .upsert(user, { onConflict: 'email' });

        if (error) {
            console.error(`  ❌ Failed to create ${user.email}:`, error.message);
        } else {
            console.log(`  ✅ Created: ${user.email} (${user.role})`);
        }
    }

    // Get partner user for shop creation
    const { data: partnerUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'partner@shoppi.com')
        .single();

    if (partnerUser) {
        // Create a demo shop for partner
        console.log('\n🏪 Creating demo shop...');
        const shop = {
            id: uuidv4(),
            partner_id: partnerUser.id,
            shop_name: 'Demo Shop',
            slug: 'demo-shop',
            description: 'This is a demo shop for testing purposes',
            phone: '+84901000002',
            email: 'partner@shoppi.com',
            address: '123 Nguyen Hue, District 1',
            city: 'Ho Chi Minh',
            district: 'District 1',
            logo_url: null,
            banner_url: null,
            status: 'active',
            avg_rating: 4.5,
            review_count: 10,
            product_count: 0,
            follower_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { error: shopError } = await supabase
            .from('shops')
            .upsert(shop, { onConflict: 'partner_id' });

        if (shopError) {
            console.error('  ❌ Failed to create shop:', shopError.message);
        } else {
            console.log('  ✅ Created: Demo Shop');

            // Create sample categories
            console.log('\n📁 Creating sample categories...');
            const categories = [
                { id: uuidv4(), name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets' },
                { id: uuidv4(), name: 'Fashion', slug: 'fashion', description: 'Clothing and accessories' },
                { id: uuidv4(), name: 'Food & Beverage', slug: 'food-beverage', description: 'Food and drinks' },
                { id: uuidv4(), name: 'Home & Living', slug: 'home-living', description: 'Home decor and furniture' },
            ];

            for (const cat of categories) {
                const { error: catError } = await supabase
                    .from('categories')
                    .upsert({ ...cat, created_at: new Date().toISOString() }, { onConflict: 'slug' });

                if (catError) {
                    console.error(`  ❌ Failed to create category ${cat.name}:`, catError.message);
                } else {
                    console.log(`  ✅ Created: ${cat.name}`);
                }
            }

            // Get electronics category for sample products
            const { data: electronicsCategory } = await supabase
                .from('categories')
                .select('id')
                .eq('slug', 'electronics')
                .single();

            if (electronicsCategory) {
                // Create sample products
                console.log('\n📦 Creating sample products...');
                const products = [
                    {
                        id: uuidv4(),
                        shop_id: shop.id,
                        category_id: electronicsCategory.id,
                        name: 'Wireless Bluetooth Headphones',
                        slug: 'wireless-bluetooth-headphones',
                        description: 'High-quality wireless headphones with noise cancellation',
                        base_price: 1500000,
                        compare_at_price: 2000000,
                        status: 'active',
                        avg_rating: 4.5,
                        review_count: 25,
                        total_sold: 100,
                    },
                    {
                        id: uuidv4(),
                        shop_id: shop.id,
                        category_id: electronicsCategory.id,
                        name: 'Smart Watch Pro',
                        slug: 'smart-watch-pro',
                        description: 'Feature-rich smartwatch with health monitoring',
                        base_price: 3500000,
                        compare_at_price: 4000000,
                        status: 'active',
                        avg_rating: 4.8,
                        review_count: 50,
                        total_sold: 200,
                    },
                    {
                        id: uuidv4(),
                        shop_id: shop.id,
                        category_id: electronicsCategory.id,
                        name: 'Portable Power Bank 20000mAh',
                        slug: 'portable-power-bank-20000mah',
                        description: 'High capacity power bank with fast charging',
                        base_price: 500000,
                        compare_at_price: 700000,
                        status: 'active',
                        avg_rating: 4.3,
                        review_count: 80,
                        total_sold: 500,
                    },
                ];

                for (const product of products) {
                    const { error: prodError } = await supabase
                        .from('products')
                        .upsert({
                            ...product,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }, { onConflict: 'slug' });

                    if (prodError) {
                        console.error(`  ❌ Failed to create product ${product.name}:`, prodError.message);
                    } else {
                        console.log(`  ✅ Created: ${product.name}`);
                    }
                }
            }
        }
    }

    console.log('\n✨ Seed completed!\n');
    console.log('Test accounts (password: 123456):');
    console.log('  - Admin:    admin@shoppi.com');
    console.log('  - Partner:  partner@shoppi.com');
    console.log('  - Customer: customer@shoppi.com');
    console.log('  - Shipper:  shipper@shoppi.com');
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    });
