/**
 * Admin Categories Routes
 * Simple admin endpoints for category management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * GET /api/admin/categories
 * Get all categories (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            data: { categories: data || [] }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CATEGORIES_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/admin/categories
 * Create category (Admin only)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { name, description, parent_id, image_url, sort_order } = req.body;

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const { data, error } = await supabaseAdmin
            .from('categories')
            .insert({
                name,
                slug,
                description,
                parent_id: parent_id || null,
                image_url,
                sort_order: sort_order || 0,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { category: data }
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CATEGORY_ERROR', message: error.message }
        });
    }
});

/**
 * PATCH /api/admin/categories/:id
 * Update category (Admin only)
 */
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, parent_id, image_url, sort_order, is_active } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) {
            updates.name = name;
            updates.slug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-');
        }
        if (description !== undefined) updates.description = description;
        if (parent_id !== undefined) updates.parent_id = parent_id;
        if (image_url !== undefined) updates.image_url = image_url;
        if (sort_order !== undefined) updates.sort_order = sort_order;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabaseAdmin
            .from('categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { category: data }
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CATEGORY_ERROR', message: error.message }
        });
    }
});

/**
 * DELETE /api/admin/categories/:id
 * Delete category (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if category has products
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('id')
            .eq('category_id', id)
            .limit(1);

        if (products && products.length > 0) {
            return res.status(400).json({
                success: false,
                error: { code: 'CATEGORY_HAS_PRODUCTS', message: 'Cannot delete category with existing products. Please move or delete products first.' }
            });
        }

        // Update children to become root categories (set parent_id to null)
        await supabaseAdmin
            .from('categories')
            .update({ parent_id: null })
            .eq('parent_id', id);

        const { error } = await supabaseAdmin
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            data: { message: 'Category deleted successfully' }
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CATEGORY_ERROR', message: error.message }
        });
    }
});

module.exports = router;
