/**
 * Admin Shops Routes
 * Admin-only endpoints for shop management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * GET /api/admin/shops
 * Get all shops with pagination and filters (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { page = 1, pageSize = 20, status, q, city, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
        const offset = (page - 1) * pageSize;

        let query = supabaseAdmin
            .from('shops')
            .select('*', { count: 'exact' });

        if (status) query = query.eq('status', status);
        if (city) query = query.eq('city', city);
        if (q) {
            query = query.or(`shop_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
        }

        const { data, error, count } = await query
            .order(sortBy, { ascending: sortOrder === 'asc' })
            .range(offset, offset + parseInt(pageSize) - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                shops: data || [],
                pagination: {
                    page: parseInt(page),
                    pageSize: parseInt(pageSize),
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / pageSize),
                }
            }
        });
    } catch (error) {
        console.error('Get shops error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHOPS_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/shops/:id
 * Get shop details by ID (Admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('shops')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: { code: 'SHOP_NOT_FOUND', message: 'Shop not found' }
            });
        }

        res.json({ success: true, data: { shop: data } });
    } catch (error) {
        console.error('Get shop error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHOP_ERROR', message: error.message }
        });
    }
});

/**
 * PATCH /api/admin/shops/:id
 * Update shop status (Admin only)
 */
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (status) {
            updates.status = status;
            if (status === 'active') {
                updates.approved_at = new Date().toISOString();
                updates.approved_by = req.user.userId;
            }
        }
        if (rejection_reason) updates.rejection_reason = rejection_reason;

        const { data, error } = await supabaseAdmin
            .from('shops')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { shop: data, message: 'Shop updated successfully' }
        });
    } catch (error) {
        console.error('Update shop error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHOP_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/shops/:id/products
 * Get shop's products (Admin only)
 */
router.get('/:id/products', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabaseAdmin
            .from('products')
            .select('id, name, slug, base_price, compare_at_price, status, total_sold, created_at', { count: 'exact' })
            .eq('shop_id', id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Map base_price to price for frontend
        const products = (data || []).map(p => ({
            ...p,
            price: p.base_price,
            stock_quantity: 0 // TODO: aggregate from variants
        }));

        res.json({
            success: true,
            data: {
                products,
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 }
            }
        });
    } catch (error) {
        console.error('Get shop products error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'PRODUCTS_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/shops/:id/orders
 * Get shop's orders via sub_orders (Admin only)
 */
router.get('/:id/orders', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabaseAdmin
            .from('sub_orders')
            .select(`
                id, subtotal, total, status, created_at,
                orders(id, order_number, shipping_name)
            `, { count: 'exact' })
            .eq('shop_id', id)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Format response
        const orders = (data || []).map(sub => ({
            id: sub.id,
            order_number: sub.orders?.order_number || sub.id.slice(0, 8),
            customer_name: sub.orders?.shipping_name || 'N/A',
            total: sub.total || sub.subtotal,
            status: sub.status,
            created_at: sub.created_at
        }));

        res.json({
            success: true,
            data: {
                orders,
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 }
            }
        });
    } catch (error) {
        console.error('Get shop orders error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'ORDERS_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/shops/:id/reviews
 * Get shop's reviews (Admin only)
 */
router.get('/:id/reviews', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Get products of this shop first, then get reviews for those products
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('shop_id', id);

        const productIds = (products || []).map(p => p.id);

        if (productIds.length === 0) {
            return res.json({
                success: true,
                data: { reviews: [], pagination: { page: 1, limit: 10, total: 0 } }
            });
        }

        const { data, error, count } = await supabaseAdmin
            .from('reviews')
            .select(`
                id, rating, content, created_at,
                users(id, full_name),
                products(id, name)
            `, { count: 'exact' })
            .in('product_id', productIds)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        const reviews = (data || []).map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.content,
            customer_name: r.users?.full_name || 'Anonymous',
            product_name: r.products?.name || 'N/A',
            created_at: r.created_at
        }));

        res.json({
            success: true,
            data: {
                reviews,
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 }
            }
        });
    } catch (error) {
        console.error('Get shop reviews error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'REVIEWS_ERROR', message: error.message }
        });
    }
});

module.exports = router;
