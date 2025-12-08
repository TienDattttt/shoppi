/**
 * Admin Orders Routes
 * Endpoints for order management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * GET /api/admin/orders
 * Get all orders (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        // Fetch related data
        const result = await Promise.all((orders || []).map(async (order) => {
            // Get user info
            let userName = 'Unknown';
            if (order.user_id) {
                const { data: user } = await supabaseAdmin
                    .from('users')
                    .select('full_name')
                    .eq('id', order.user_id)
                    .single();
                if (user) userName = user.full_name;
            }

            // Get sub_orders to find shop
            let shopName = 'N/A';
            let itemCount = 0;
            const { data: subOrders } = await supabaseAdmin
                .from('sub_orders')
                .select('shop_id')
                .eq('order_id', order.id);

            if (subOrders && subOrders.length > 0) {
                const { data: shop } = await supabaseAdmin
                    .from('shops')
                    .select('shop_name')
                    .eq('id', subOrders[0].shop_id)
                    .single();
                if (shop) shopName = shop.shop_name;

                // Count items
                const { count } = await supabaseAdmin
                    .from('order_items')
                    .select('*', { count: 'exact', head: true })
                    .in('sub_order_id', subOrders.map(s => s.id));
                itemCount = count || 0;
            }

            return {
                ...order,
                _id: order.id,
                userName,
                shopName,
                order_status: order.status,
                order_checkout: { totalPrice: order.grand_total },
                order_products: Array(itemCount).fill({}),
                createdAt: new Date(order.created_at).toLocaleDateString('vi-VN')
            };
        }));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'ORDERS_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/orders/:id
 * Get order detail (Admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Get user
        let user = null;
        if (order.user_id) {
            const { data } = await supabaseAdmin
                .from('users')
                .select('id, full_name, email, phone')
                .eq('id', order.user_id)
                .single();
            user = data;
        }

        // Get sub_orders with items
        const { data: subOrders } = await supabaseAdmin
            .from('sub_orders')
            .select('*')
            .eq('order_id', id);

        const subOrdersWithDetails = await Promise.all((subOrders || []).map(async (so) => {
            const { data: items } = await supabaseAdmin
                .from('order_items')
                .select('*')
                .eq('sub_order_id', so.id);

            const { data: shop } = await supabaseAdmin
                .from('shops')
                .select('id, shop_name')
                .eq('id', so.shop_id)
                .single();

            return { ...so, items: items || [], shop };
        }));

        res.json({
            success: true,
            data: {
                ...order,
                user,
                sub_orders: subOrdersWithDetails
            }
        });
    } catch (error) {
        console.error('Get order detail error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'ORDER_ERROR', message: error.message }
        });
    }
});

module.exports = router;
