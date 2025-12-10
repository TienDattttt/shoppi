/**
 * Admin Shippers Routes
 * Endpoints for shipper management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * GET /api/shippers
 * Get all shippers with user info (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        
        // Get shippers
        let query = supabaseAdmin
            .from('shippers')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: shippersData, error } = await query;

        if (error) throw error;

        // Get user info for each shipper
        const userIds = (shippersData || []).map(s => s.user_id).filter(Boolean);
        let usersMap = {};
        
        if (userIds.length > 0) {
            const { data: users } = await supabaseAdmin
                .from('users')
                .select('id, full_name, email, phone, avatar_url')
                .in('id', userIds);
            
            usersMap = (users || []).reduce((acc, u) => {
                acc[u.id] = u;
                return acc;
            }, {});
        }

        // Transform for frontend
        const shippers = (shippersData || []).map(s => {
            const user = usersMap[s.user_id] || {};
            return {
                ...s,
                _id: s.id,
                name: user.full_name || 'Unknown',
                email: user.email,
                phone: user.phone || 'N/A',
                avatar: user.avatar_url,
                area: s.working_district ? `${s.working_district}, ${s.working_city}` : (s.working_city || 'Chưa cập nhật'),
                totalDeliveries: s.total_deliveries || 0,
                successRate: s.total_deliveries > 0 
                    ? Math.round((s.successful_deliveries / s.total_deliveries) * 100) 
                    : 0,
                rating: s.avg_rating || 0,
                // Map status for frontend
                status: s.status === 'active' ? 'active' : (s.status === 'suspended' ? 'suspended' : 'inactive')
            };
        });

        res.json({
            success: true,
            data: shippers
        });
    } catch (error) {
        console.error('Get shippers error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHIPPERS_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/shippers/:id
 * Get shipper detail (Admin only)
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('shippers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Shipper not found' }
            });
        }

        // Get user info
        let user = {};
        if (data.user_id) {
            const { data: userData } = await supabaseAdmin
                .from('users')
                .select('id, full_name, email, phone, avatar_url')
                .eq('id', data.user_id)
                .single();
            user = userData || {};
        }

        // Get recent deliveries (shipments table may not exist yet)
        let deliveries = [];
        try {
            const { data: deliveriesData } = await supabaseAdmin
                .from('shipments')
                .select('*')
                .eq('shipper_id', id)
                .order('created_at', { ascending: false })
                .limit(10);
            deliveries = deliveriesData || [];
        } catch (e) {
            // Shipments table may not exist
        }

        const shipper = {
            ...data,
            _id: data.id,
            name: user.full_name || 'Unknown',
            email: user.email,
            phone: user.phone || 'N/A',
            avatar: user.avatar_url,
            area: data.working_district ? `${data.working_district}, ${data.working_city}` : (data.working_city || 'Chưa cập nhật'),
            totalDeliveries: data.total_deliveries || 0,
            successRate: data.total_deliveries > 0 
                ? Math.round((data.successful_deliveries / data.total_deliveries) * 100) 
                : 0,
            rating: data.avg_rating || 0,
            recentDeliveries: deliveries
        };

        res.json({
            success: true,
            data: shipper
        });
    } catch (error) {
        console.error('Get shipper detail error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHIPPER_ERROR', message: error.message }
        });
    }
});

/**
 * PATCH /api/shippers/:id/status
 * Update shipper status (Admin only)
 */
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'active', 'suspended', 'inactive'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_STATUS', message: 'Invalid status value' }
            });
        }

        const updateData = { status };
        
        // If activating, set approved info
        if (status === 'active') {
            updateData.approved_at = new Date().toISOString();
            updateData.approved_by = req.user.userId;
        }

        const { data, error } = await supabaseAdmin
            .from('shippers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: { shipper: data, message: 'Status updated successfully' }
        });
    } catch (error) {
        console.error('Update shipper status error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SHIPPER_ERROR', message: error.message }
        });
    }
});

module.exports = router;
