/**
 * System Settings Routes
 * Admin-only endpoints for platform configuration
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('system_settings')
            .select('*');

        if (error) throw error;

        // Convert to key-value object, parse JSONB values
        const settings = {};
        data.forEach(row => {
            // JSONB is already parsed by Supabase, just use directly
            settings[row.key] = row.value;
        });

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ 
            success: false, 
            error: { code: 'SETTINGS_ERROR', message: error.message } 
        });
    }
});

/**
 * PATCH /api/admin/settings
 * Update system settings
 */
router.patch('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const updates = req.body;
        const adminId = req.user.userId;

        for (const [key, value] of Object.entries(updates)) {
            const { error } = await supabaseAdmin
                .from('system_settings')
                .upsert({
                    key,
                    value: value, // JSONB column handles serialization automatically
                    updated_at: new Date().toISOString(),
                    updated_by: adminId,
                }, { onConflict: 'key' });

            if (error) throw error;
        }

        res.json({ 
            success: true, 
            data: { message: 'Settings updated successfully' } 
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ 
            success: false, 
            error: { code: 'SETTINGS_ERROR', message: error.message } 
        });
    }
});

module.exports = router;
