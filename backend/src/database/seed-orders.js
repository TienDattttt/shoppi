/**
 * Seed Orders for Testing
 * Run: node src/database/seed-orders.js
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

async function seedOrders() {
    console.log('🌱 Seeding orders for testing...\n');

    // Get customer user
    const { data: customer } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('email', 'customer@shoppi.com')
        .single();

    if (!customer) {
        console.error('❌ Customer user not found. Please run seed.js first.');
        process.exit(1);
    }

    // Get a shop
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

    // Get some products
    const { data: products } = await supabase
        .from('products')
        .select('id, name, base_price')
        .eq('shop_id', shop.id)
        .limit(3);

    console.log(`👤 Customer: ${customer.full_name}`);
    console.log(`🏪 Shop: ${shop.shop_name}`);
    console.log(`📦 Products: ${products?.length || 0}\n`);

    // Valid order statuses: pending_payment, payment_failed, confirmed, completed, cancelled, refunded
    const statuses = ['pending_payment', 'confirmed', 'confirmed', 'confirmed', 'completed', 'cancelled'];
    const now = new Date();

    console.log('📝 Creating orders...');

    for (let i = 0; i < 6; i++) {
        const orderId = uuidv4();
        const subOrderId = uuidv4();
        const status = statuses[i];
        const orderDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)); // Each order 1 day apart

        // Calculate totals
        const subtotal = 1500000 + (i * 500000);
        const shippingFee = 30000;
        const totalAmount = subtotal + shippingFee;

        // Create order
        const orderNumber = `ORD${Date.now()}${i}`;
        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                id: orderId,
                order_number: orderNumber,
                user_id: customer.id,
                status: status === 'shipping' ? 'confirmed' : status,
                payment_status: status === 'pending_payment' ? 'pending' : 'paid',
                payment_method: i % 2 === 0 ? 'cod' : 'momo',
                subtotal,
                shipping_total: shippingFee,
                discount_total: 0,
                grand_total: totalAmount,
                shipping_name: customer.full_name,
                shipping_phone: '+84901000003',
                shipping_address: '123 Nguyen Hue Street, District 1, Ho Chi Minh',
                created_at: orderDate.toISOString(),
                updated_at: orderDate.toISOString()
            });

        if (orderError) {
            console.error(`  ❌ Failed to create order ${i + 1}:`, orderError.message);
            continue;
        }

        // Create sub_order
        const subOrderStatus = status === 'shipping' ? 'shipping' : 
                              status === 'delivered' ? 'delivered' :
                              status === 'completed' ? 'completed' :
                              status === 'cancelled' ? 'cancelled' : 'pending';

        const { error: subOrderError } = await supabase
            .from('sub_orders')
            .insert({
                id: subOrderId,
                order_id: orderId,
                shop_id: shop.id,
                status: subOrderStatus,
                subtotal,
                shipping_fee: shippingFee,
                discount: 0,
                total: totalAmount,
                created_at: orderDate.toISOString()
            });

        if (subOrderError) {
            console.error(`  ❌ Failed to create sub_order:`, subOrderError.message);
            continue;
        }

        // Create order items
        if (products && products.length > 0) {
            const itemCount = Math.min(i % 3 + 1, products.length);
            for (let j = 0; j < itemCount; j++) {
                const product = products[j];
                const quantity = j + 1;
                const unitPrice = product.base_price;

                await supabase
                    .from('order_items')
                    .insert({
                        id: uuidv4(),
                        sub_order_id: subOrderId,
                        product_id: product.id,
                        variant_id: null,
                        product_name: product.name,
                        variant_name: null,
                        product_image: null,
                        unit_price: unitPrice,
                        quantity,
                        total_price: unitPrice * quantity,
                        created_at: orderDate.toISOString()
                    });
            }
        }

        console.log(`  ✅ Order ${i + 1}: ${status} - ${totalAmount.toLocaleString('vi-VN')}đ`);
    }

    console.log('\n✨ Done! Orders created for testing.');
}

seedOrders()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    });
