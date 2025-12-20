/**
 * Seed Banners
 * Run with: node src/database/seed-banners.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedBanners() {
    console.log('🎨 Seeding banners...');

    // First check if table exists by trying to select
    const { data: existing, error: checkError } = await supabase
        .from('banners')
        .select('id')
        .limit(1);

    if (checkError) {
        console.log('⚠️  Banners table not found in schema cache.');
        console.log('   This is normal - Supabase PostgREST needs time to refresh.');
        console.log('   Please wait 1-2 minutes and try again, or restart your Supabase project.');
        console.log('\n   Error:', checkError.message);
        return;
    }

    // Check if already has data
    const { count } = await supabase
        .from('banners')
        .select('*', { count: 'exact', head: true });

    if (count > 0) {
        console.log(`✅ Banners already seeded (${count} banners)`);
        return;
    }

    // Insert banners
    const banners = [
        {
            title: 'Siêu Sale 12.12',
            description: 'Giảm đến 50% cho tất cả sản phẩm điện tử',
            image_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop',
            link_url: '/search?sort=best_selling',
            link_text: 'Mua ngay',
            position: 1,
            is_active: true
        },
        {
            title: 'Bộ sưu tập mới',
            description: 'Khám phá xu hướng thời trang mới nhất',
            image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop',
            link_url: '/categories',
            link_text: 'Khám phá',
            position: 2,
            is_active: true
        },
        {
            title: 'Tuần lễ công nghệ',
            description: 'Ưu đãi tốt nhất cho laptop và phụ kiện',
            image_url: 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=2070&auto=format&fit=crop',
            link_url: '/search?q=laptop',
            link_text: 'Xem ngay',
            position: 3,
            is_active: true
        }
    ];

    const { data, error } = await supabase
        .from('banners')
        .insert(banners)
        .select();

    if (error) {
        console.error('❌ Failed to seed banners:', error.message);
        return;
    }

    console.log(`✅ Seeded ${data.length} banners successfully!`);
}

seedBanners().catch(console.error);
