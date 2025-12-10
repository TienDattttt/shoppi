/**
 * Admin Vouchers Routes
 * Endpoints for platform voucher management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/admin/vouchers
 * Get all platform vouchers (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('vouchers')
            .select('*')
            .is('shop_id', null) // Platform vouchers only
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform for frontend
        const vouchers = (data || []).map(v => ({
            ...v,
            _id: v.id,
            status: v.is_active ? 'active' : 'inactive',
            discountType: v.discount_type === 'percentage' ? 'percent' : v.discount_type,
            value: v.discount_value,
            minOrderValue: v.min_order_value,
            usedCount: v.used_count,
            usageLimit: v.usage_limit || 'Unlimited',
            startDate: v.start_date ? new Date(v.start_date).toLocaleDateString('vi-VN') : null,
            endDate: v.end_date ? new Date(v.end_date).toLocaleDateString('vi-VN') : null
        }));

        res.json({
            success: true,
            data: vouchers
        });
    } catch (error) {
        console.error('Get vouchers error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'VOUCHERS_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/admin/vouchers
 * Create platform voucher (Admin only)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        // Support both snake_case and camelCase from frontend
        const code = req.body.code;
        const discountType = req.body.discount_type || req.body.discountType || 'fixed';
        const discountValue = req.body.discount_value || req.body.value || 0;
        const minOrderValue = req.body.min_order_value || req.body.minOrderValue || 0;
        const maxDiscount = req.body.max_discount_value || req.body.maxDiscount;
        const usageLimit = req.body.usage_limit || req.body.usageLimit;
        const perUserLimit = req.body.usage_per_user || req.body.perUserLimit || 1;
        const startDate = req.body.start_date || req.body.startDate;
        const endDate = req.body.end_date || req.body.endDate;
        const isActive = req.body.is_active !== false && req.body.status !== 'inactive';

        const { data, error } = await supabaseAdmin
            .from('vouchers')
            .insert({
                id: uuidv4(),
                type: 'platform',
                shop_id: null,
                code: code.toUpperCase(),
                discount_type: discountType === 'percent' ? 'percentage' : discountType,
                discount_value: discountValue,
                min_order_value: minOrderValue,
                max_discount: maxDiscount,
                usage_limit: usageLimit,
                per_user_limit: perUserLimit,
                used_count: 0,
                start_date: startDate,
                end_date: endDate,
                is_active: isActive,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { voucher: data, message: 'Voucher created successfully' }
        });
    } catch (error) {
        console.error('Create voucher error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'VOUCHER_ERROR', message: error.message }
        });
    }
});

/**
 * PUT /api/admin/vouchers/:id
 * Update voucher (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Build updates object with only valid columns (no updated_at in schema)
        const updates = {};
        if (req.body.code) updates.code = req.body.code.toUpperCase();
        if (req.body.discount_type !== undefined) updates.discount_type = req.body.discount_type === 'percent' ? 'percentage' : req.body.discount_type;
        if (req.body.discountType !== undefined) updates.discount_type = req.body.discountType === 'percent' ? 'percentage' : req.body.discountType;
        if (req.body.discount_value !== undefined) updates.discount_value = req.body.discount_value;
        if (req.body.value !== undefined) updates.discount_value = req.body.value;
        if (req.body.min_order_value !== undefined) updates.min_order_value = req.body.min_order_value;
        if (req.body.minOrderValue !== undefined) updates.min_order_value = req.body.minOrderValue;
        if (req.body.max_discount !== undefined) updates.max_discount = req.body.max_discount;
        if (req.body.maxDiscount !== undefined) updates.max_discount = req.body.maxDiscount;
        if (req.body.usage_limit !== undefined) updates.usage_limit = req.body.usage_limit;
        if (req.body.usageLimit !== undefined) updates.usage_limit = req.body.usageLimit;
        if (req.body.per_user_limit !== undefined) updates.per_user_limit = req.body.per_user_limit;
        if (req.body.perUserLimit !== undefined) updates.per_user_limit = req.body.perUserLimit;
        if (req.body.start_date !== undefined) updates.start_date = req.body.start_date;
        if (req.body.startDate !== undefined) updates.start_date = req.body.startDate;
        if (req.body.end_date !== undefined) updates.end_date = req.body.end_date;
        if (req.body.endDate !== undefined) updates.end_date = req.body.endDate;
        if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
        if (req.body.status !== undefined) updates.is_active = req.body.status === 'active';

        const { data, error } = await supabaseAdmin
            .from('vouchers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { voucher: data, message: 'Voucher updated successfully' }
        });
    } catch (error) {
        console.error('Update voucher error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'VOUCHER_ERROR', message: error.message }
        });
    }
});

/**
 * PATCH /api/admin/vouchers/:id/status
 * Toggle voucher status (Admin only)
 */
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const { data, error } = await supabaseAdmin
            .from('vouchers')
            .update({ 
                is_active: isActive === 'active' || isActive === true
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { voucher: data, message: 'Status updated' }
        });
    } catch (error) {
        console.error('Toggle voucher status error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'VOUCHER_ERROR', message: error.message }
        });
    }
});

/**
 * DELETE /api/admin/vouchers/:id
 * Delete voucher (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('vouchers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            data: { message: 'Voucher deleted successfully' }
        });
    } catch (error) {
        console.error('Delete voucher error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'VOUCHER_ERROR', message: error.message }
        });
    }
});

module.exports = router;
