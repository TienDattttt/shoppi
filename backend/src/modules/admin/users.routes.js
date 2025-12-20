/**
 * Admin Users Routes
 * Admin-only endpoints for user management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, role, status, search } = req.query;
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from('users')
            .select('id, email, phone, full_name, role, status, avatar_url, created_at, updated_at', { count: 'exact' });

        if (role) query = query.eq('role', role);
        if (status) query = query.eq('status', status);
        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                users: data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'USERS_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/users/:id
 * Get user by ID
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' }
            });
        }

        // Remove sensitive fields
        delete data.password_hash;

        res.json({ success: true, data: { user: data } });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'USER_ERROR', message: error.message }
        });
    }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (admin can change status, role)
 */
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, role } = req.body;

        // Get current user data first (for email notification)
        const { data: currentUser } = await supabaseAdmin
            .from('users')
            .select('email, full_name, status')
            .eq('id', id)
            .single();

        const updates = {};
        if (status) updates.status = status;
        if (role) updates.role = role;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Send email notification if status changed to active (approved)
        if (status === 'active' && currentUser?.status === 'pending' && currentUser?.email) {
            try {
                const emailService = require('../../shared/email/email.service');
                await emailService.sendAccountApprovedEmail(currentUser.email, currentUser.full_name);
            } catch (emailError) {
                console.error('Failed to send approval email:', emailError.message);
            }
        }

        // Send email notification if status changed to inactive (rejected)
        if (status === 'inactive' && currentUser?.status === 'pending' && currentUser?.email) {
            try {
                const emailService = require('../../shared/email/email.service');
                await emailService.sendAccountRejectedEmail(currentUser.email, currentUser.full_name, 'Tài khoản không đáp ứng yêu cầu');
            } catch (emailError) {
                console.error('Failed to send rejection email:', emailError.message);
            }
        }

        res.json({
            success: true,
            data: { user: data, message: 'User updated successfully' }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'USER_ERROR', message: error.message }
        });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Soft delete user (set status to inactive)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('users')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            data: { message: 'User deactivated successfully' }
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'USER_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/users/:id/sessions
 * Get user's login sessions (activity log)
 */
router.get('/:id/sessions', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('sessions')
            .select('id, device_type, device_name, ip_address, user_agent, created_at, last_activity_at, expires_at')
            .eq('user_id', id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        res.json({
            success: true,
            data: { sessions: data || [] }
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SESSION_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/users/:id/orders
 * Get user's order history (for customers)
 */
router.get('/:id/orders', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabaseAdmin
            .from('orders')
            .select('id, order_number, grand_total, status, payment_status, created_at', { count: 'exact' })
            .eq('user_id', id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Map grand_total to total_amount for frontend compatibility
        const orders = (data || []).map(order => ({
            ...order,
            total_amount: order.grand_total
        }));

        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                }
            }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'ORDER_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/users/:id/shop
 * Get user's shop info (for partners)
 */
router.get('/:id/shop', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get shop owned by this user
        const { data: shop, error } = await supabaseAdmin
            .from('shops')
            .select('id, shop_name, description, logo_url, status, rating, total_reviews, created_at')
            .eq('owner_id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!shop) {
            return res.json({
                success: true,
                data: { shop: null }
            });
        }

        // Get additional stats
        const [productsResult, ordersResult] = await Promise.all([
            supabaseAdmin
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('shop_id', shop.id),
            supabaseAdmin
                .from('sub_orders')
                .select('id, total_amount', { count: 'exact' })
                .eq('shop_id', shop.id)
        ]);

        // Handle potential errors in stats queries
        if (productsResult.error) {
            console.error('Products query error:', productsResult.error);
        }
        if (ordersResult.error) {
            console.error('Orders query error:', ordersResult.error);
        }

        const totalProducts = productsResult.count || 0;
        const totalOrders = ordersResult.count || 0;
        const totalRevenue = (ordersResult.data || []).reduce((sum, o) => {
            const amount = parseFloat(o.total_amount) || 0;
            return sum + amount;
        }, 0);

        res.json({
            success: true,
            data: {
                shop: {
                    ...shop,
                    total_products: totalProducts,
                    total_orders: totalOrders,
                    total_revenue: totalRevenue,
                }
            }
        });
    } catch (error) {
        console.error('Get shop error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHOP_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/admin/users/:id/shipper
 * Get user's shipper info (for shippers)
 */
router.get('/:id/shipper', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get shipper profile for this user
        const { data: shipper, error } = await supabaseAdmin
            .from('shippers')
            .select('id, vehicle_type, vehicle_plate, vehicle_brand, vehicle_model, id_card_number, status, total_deliveries, successful_deliveries, failed_deliveries, avg_rating, total_ratings, working_city, working_district, is_online, is_available, created_at')
            .eq('user_id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        // If no shipper record found, try to get info from users table (legacy data)
        if (!shipper) {
            const { data: user, error: userError } = await supabaseAdmin
                .from('users')
                .select('id, vehicle_type, vehicle_plate, id_card_number, status, created_at')
                .eq('id', id)
                .eq('role', 'shipper')
                .single();

            if (userError && userError.code !== 'PGRST116') throw userError;

            if (user) {
                // Return user data as shipper info (for legacy users without shipper record)
                return res.json({
                    success: true,
                    data: {
                        shipper: {
                            id: null, // No shipper record ID
                            user_id: user.id,
                            vehicle_type: user.vehicle_type,
                            vehicle_plate: user.vehicle_plate,
                            id_card_number: user.id_card_number,
                            status: user.status,
                            total_deliveries: 0,
                            successful_deliveries: 0,
                            failed_deliveries: 0,
                            avg_rating: 0,
                            total_ratings: 0,
                            working_city: null,
                            working_district: null,
                            is_online: false,
                            is_available: false,
                            created_at: user.created_at,
                            _isLegacy: true, // Flag to indicate this is legacy data
                        }
                    }
                });
            }

            return res.json({
                success: true,
                data: { shipper: null }
            });
        }

        res.json({
            success: true,
            data: { shipper }
        });
    } catch (error) {
        console.error('Get shipper error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHIPPER_ERROR', message: error.message }
        });
    }
});

module.exports = router;
