/**
 * Admin Products Routes
 * Endpoints for product approval management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * GET /api/admin/products/pending
 * Get all pending products for approval
 */
router.get('/pending', authenticate, requireAdmin, async (req, res) => {
    try {
        // Get products with status pending
        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get related data separately to avoid complex join issues
        const result = await Promise.all((products || []).map(async (p) => {
            // Get shop info
            let shopName = 'Unknown Shop';
            if (p.shop_id) {
                const { data: shop } = await supabaseAdmin
                    .from('shops')
                    .select('shop_name')
                    .eq('id', p.shop_id)
                    .single();
                if (shop) shopName = shop.shop_name;
            }

            // Get category info
            let categoryName = 'Uncategorized';
            if (p.category_id) {
                const { data: category } = await supabaseAdmin
                    .from('categories')
                    .select('name')
                    .eq('id', p.category_id)
                    .single();
                if (category) categoryName = category.name;
            }

            // Get primary image
            let thumbUrl = '';
            const { data: images } = await supabaseAdmin
                .from('product_images')
                .select('url, is_primary')
                .eq('product_id', p.id)
                .order('is_primary', { ascending: false })
                .limit(1);
            if (images && images.length > 0) thumbUrl = images[0].url;

            return {
                ...p,
                _id: p.id,
                product_name: p.name,
                product_thumb: thumbUrl,
                product_price: p.base_price,
                product_type: categoryName,
                shopName: shopName,
                createdAt: new Date(p.created_at).toLocaleDateString('vi-VN')
            };
        }));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Get pending products error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'PRODUCTS_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/admin/products/:id/approve
 * Approve a product
 */
router.post('/:id/approve', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ 
                status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { product: data, message: 'Product approved successfully' }
        });
    } catch (error) {
        console.error('Approve product error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'APPROVE_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/admin/products/:id/reject
 * Reject a product
 */
router.post('/:id/reject', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ 
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { product: data, message: 'Product rejected' }
        });
    } catch (error) {
        console.error('Reject product error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'REJECT_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/admin/products/:id/revision
 * Request revision for a product
 */
router.post('/:id/revision', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ 
                status: 'revision_required',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { product: data, message: 'Revision requested' }
        });
    } catch (error) {
        console.error('Request revision error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'REVISION_ERROR', message: error.message }
        });
    }
});

module.exports = router;
