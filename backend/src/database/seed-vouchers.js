/**
 * Seed Vouchers for Testing
 * Run: node src/database/seed-vouchers.js
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

async function seedVouchers() {
    console.log('🌱 Seeding vouchers for testing...\n');

    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Schema: code, type, shop_id, discount_type (percentage/fixed), discount_value, 
    // max_discount, min_order_value, usage_limit, used_count, per_user_limit, start_date, end_date, is_active
    const vouchers = [
        {
            id: uuidv4(),
            code: 'WELCOME10',
            type: 'platform',
            shop_id: null,
            discount_type: 'percentage',
            discount_value: 10,
            min_order_value: 100000,
            max_discount: 50000,
            usage_limit: 1000,
            per_user_limit: 1,
            used_count: 150,
            start_date: now.toISOString(),
            end_date: nextMonth.toISOString(),
            is_active: true
        },
        {
            id: uuidv4(),
            code: 'FREESHIP',
            type: 'platform',
            shop_id: null,
            discount_type: 'fixed',
            discount_value: 30000,
            min_order_value: 200000,
            max_discount: null,
            usage_limit: 500,
            per_user_limit: 3,
            used_count: 89,
            start_date: now.toISOString(),
            end_date: nextMonth.toISOString(),
            is_active: true
        },
        {
            id: uuidv4(),
            code: 'SUMMER50',
            type: 'platform',
            shop_id: null,
            discount_type: 'fixed',
            discount_value: 50000,
            min_order_value: 300000,
            max_discount: null,
            usage_limit: 200,
            per_user_limit: 1,
            used_count: 200,
            start_date: now.toISOString(),
            end_date: nextMonth.toISOString(),
            is_active: false
        },
        {
            id: uuidv4(),
            code: 'VIP20',
            type: 'platform',
            shop_id: null,
            discount_type: 'percentage',
            discount_value: 20,
            min_order_value: 500000,
            max_discount: 200000,
            usage_limit: null,
            per_user_limit: 5,
            used_count: 45,
            start_date: now.toISOString(),
            end_date: nextMonth.toISOString(),
            is_active: true
        }
    ];

    console.log('📝 Creating vouchers...');

    for (const voucher of vouchers) {
        const { error } = await supabase
            .from('vouchers')
            .insert({
                ...voucher,
                created_at: now.toISOString()
            });

        if (error) {
            console.error(`  ❌ Failed to create "${voucher.code}":`, error.message);
        } else {
            console.log(`  ✅ Created: ${voucher.code} (${voucher.is_active ? 'active' : 'inactive'})`);
        }
    }

    console.log('\n✨ Done! Vouchers created for testing.');
}

seedVouchers()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    });
