/**
 * Sync Products to Elasticsearch
 * Run: node src/database/seeds/sync-elasticsearch.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('@elastic/elasticsearch');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const esUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const esClient = new Client({ node: esUrl });

const PRODUCT_INDEX = 'products';

const PRODUCT_MAPPING = {
    properties: {
        id: { type: 'keyword' },
        shop_id: { type: 'keyword' },
        category_id: { type: 'keyword' },
        name: {
            type: 'text',
            analyzer: 'standard',
            fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' },
            },
        },
        slug: { type: 'keyword' },
        description: { type: 'text', analyzer: 'standard' },
        short_description: { type: 'text', analyzer: 'standard' },
        base_price: { type: 'float' },
        compare_at_price: { type: 'float' },
        currency: { type: 'keyword' },
        status: { type: 'keyword' },
        total_sold: { type: 'integer' },
        view_count: { type: 'integer' },
        avg_rating: { type: 'float' },
        review_count: { type: 'integer' },
        category_name: { type: 'keyword' },
        shop_name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        primary_image_url: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
    },
};


async function createIndex() {
    console.log('🔍 Kiểm tra Elasticsearch...');
    
    try {
        const health = await esClient.cluster.health();
        console.log('  ✓ Elasticsearch status:', health.status);
    } catch (error) {
        console.error('  ✗ Không thể kết nối Elasticsearch:', error.message);
        process.exit(1);
    }

    console.log('📦 Tạo index products...');
    
    try {
        // Xóa index cũ nếu có
        const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });
        if (exists) {
            await esClient.indices.delete({ index: PRODUCT_INDEX });
            console.log('  ✓ Đã xóa index cũ');
        }

        // Tạo index mới
        await esClient.indices.create({
            index: PRODUCT_INDEX,
            body: {
                settings: {
                    number_of_shards: 1,
                    number_of_replicas: 0,
                    analysis: {
                        analyzer: {
                            vietnamese: {
                                type: 'custom',
                                tokenizer: 'standard',
                                filter: ['lowercase', 'asciifolding'],
                            },
                        },
                    },
                },
                mappings: PRODUCT_MAPPING,
            },
        });
        console.log('  ✓ Đã tạo index products');
    } catch (error) {
        console.error('  ✗ Lỗi tạo index:', error.message);
        process.exit(1);
    }
}

async function syncProducts() {
    console.log('📥 Lấy products từ database...');
    
    // Lấy tất cả products active
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .is('deleted_at', null);

    if (error) {
        console.error('  ✗ Lỗi lấy products:', error.message);
        process.exit(1);
    }

    console.log(`  ✓ Tìm thấy ${products.length} products`);

    if (products.length === 0) {
        console.log('  ⚠ Không có products để sync');
        return;
    }

    // Lấy thêm thông tin shop, category và images
    for (const p of products) {
        if (p.shop_id) {
            const { data: shop } = await supabase.from('shops').select('shop_name, city').eq('id', p.shop_id).single();
            p.shop = shop;
        }
        if (p.category_id) {
            const { data: cat } = await supabase.from('categories').select('name, slug').eq('id', p.category_id).single();
            p.category = cat;
        }
        // Get primary image
        const { data: images } = await supabase
            .from('product_images')
            .select('url')
            .eq('product_id', p.id)
            .order('is_primary', { ascending: false })
            .order('sort_order', { ascending: true })
            .limit(1);
        p.primary_image_url = images?.[0]?.url || null;
    }

    console.log('📤 Đồng bộ vào Elasticsearch...');

    // Bulk index
    const operations = products.flatMap(p => [
        { index: { _index: PRODUCT_INDEX, _id: p.id } },
        {
            id: p.id,
            shop_id: p.shop_id,
            category_id: p.category_id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            short_description: p.short_description,
            base_price: parseFloat(p.base_price) || 0,
            compare_at_price: p.compare_at_price ? parseFloat(p.compare_at_price) : null,
            currency: p.currency || 'VND',
            status: p.status,
            total_sold: p.total_sold || 0,
            view_count: p.view_count || 0,
            avg_rating: parseFloat(p.avg_rating) || 0,
            review_count: p.review_count || 0,
            category_name: p.category?.name || null,
            shop_name: p.shop?.shop_name || null,
            primary_image_url: p.primary_image_url || null,
            created_at: p.created_at,
            updated_at: p.updated_at,
        },
    ]);

    try {
        const response = await esClient.bulk({ refresh: true, operations });
        
        if (response.errors) {
            const errorItems = response.items.filter(item => item.index?.error);
            console.error('  ⚠ Một số documents bị lỗi:', errorItems.length);
            errorItems.slice(0, 3).forEach(item => {
                console.error('    -', item.index?.error?.reason);
            });
        }
        
        const successCount = response.items.filter(item => !item.index?.error).length;
        console.log(`  ✓ Đã sync ${successCount}/${products.length} products`);
    } catch (error) {
        console.error('  ✗ Lỗi bulk index:', error.message);
        process.exit(1);
    }
}

async function verifySync() {
    console.log('🔎 Kiểm tra kết quả...');
    
    try {
        const count = await esClient.count({ index: PRODUCT_INDEX });
        console.log(`  ✓ Tổng số documents trong index: ${count.count}`);
        
        // Test search
        const searchResult = await esClient.search({
            index: PRODUCT_INDEX,
            body: {
                query: { match_all: {} },
                size: 3,
            },
        });
        
        console.log(`  ✓ Test search: ${searchResult.hits.total.value} kết quả`);
        searchResult.hits.hits.forEach(hit => {
            console.log(`    - ${hit._source.name} (${hit._source.base_price}đ)`);
        });
    } catch (error) {
        console.error('  ✗ Lỗi verify:', error.message);
    }
}

async function main() {
    console.log('🚀 Bắt đầu sync Elasticsearch...\n');
    
    await createIndex();
    await syncProducts();
    await verifySync();
    
    console.log('\n✅ Hoàn tất!');
    process.exit(0);
}

main();
