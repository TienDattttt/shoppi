/**
 * Location Controller
 * Public APIs for location data (Provinces, Wards, Post Offices)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

/**
 * Get public list of provinces
 * GET /api/public/provinces
 */
async function getProvinces(req, res) {
    try {
        const { region } = req.query;

        let query = supabaseAdmin
            .from('provinces')
            .select('code, name, full_name, region, lat, lng')
            .order('name');

        if (region) {
            query = query.eq('region', region);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Return array directly, not wrapped in { data: [...] }
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, 'QUERY_ERROR', error.message, 500);
    }
}

/**
 * Get public list of wards by province
 * GET /api/public/wards
 */
async function getWards(req, res) {
    try {
        const { province_code } = req.query;

        if (!province_code) {
            return sendError(res, 'VALIDATION_ERROR', 'Missing province_code', 400);
        }

        const { data, error } = await supabaseAdmin
            .from('wards')
            .select('code, name, province_code, ward_type, lat, lng')
            .eq('province_code', province_code)
            .order('name');

        if (error) throw error;

        // Return array directly
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, 'QUERY_ERROR', error.message, 500);
    }
}

/**
 * Get public list of post offices by ward
 * GET /api/public/post-offices
 */
async function getPostOffices(req, res) {
    try {
        const { ward_code, province_code } = req.query;

        let query = supabaseAdmin
            .from('post_offices')
            .select('id, code, name, name_vi, address, phone, lat, lng, province_code, ward_code')
            .eq('is_active', true);

        if (ward_code) {
            query = query.eq('ward_code', ward_code);
        }

        if (province_code) {
            query = query.eq('province_code', province_code);
        }

        // Don't return if no filter provided to prevent dumping entire DB
        if (!ward_code && !province_code) {
            return sendError(res, 'VALIDATION_ERROR', 'Must provide ward_code or province_code', 400);
        }

        const { data, error } = await query.order('name');

        if (error) throw error;

        // Return array directly
        return sendSuccess(res, data);
    } catch (error) {
        return sendError(res, 'QUERY_ERROR', error.message, 500);
    }
}

module.exports = {
    getProvinces,
    getWards,
    getPostOffices,
};
