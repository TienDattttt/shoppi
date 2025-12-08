/**
 * Initialize Supabase Storage Buckets
 * Run: node src/database/init-storage.js
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKETS = [
    { name: 'shops', public: true },
    { name: 'products', public: true },
    { name: 'avatars', public: true },
    { name: 'reviews', public: true },
    { name: 'chat', public: true },
    { name: 'documents', public: false },
];

async function initBuckets() {
    console.log('🗄️  Initializing Supabase Storage Buckets...\n');

    for (const bucket of BUCKETS) {
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
            public: bucket.public,
            fileSizeLimit: 5 * 1024 * 1024, // 5MB
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log(`  ✅ Bucket "${bucket.name}" already exists`);
            } else {
                console.error(`  ❌ Failed to create "${bucket.name}":`, error.message);
            }
        } else {
            console.log(`  ✅ Created bucket "${bucket.name}" (public: ${bucket.public})`);
        }
    }

    console.log('\n✨ Storage initialization completed!');
}

initBuckets()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Failed:', err);
        process.exit(1);
    });
