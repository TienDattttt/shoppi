/**
 * Banner Controller
 * HTTP handlers for homepage banner management
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

/**
 * Get all active banners (public)
 * GET /api/banners
 */
async function getActiveBanners(req, res, next) {
    try {
        const now = new Date().toISOString();
        
        const { data: banners, error } = await supabaseAdmin
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .or(`start_date.is.null,start_date.lte.${now}`)
            .or(`end_date.is.null,end_date.gte.${now}`)
            .order('position', { ascending: true });

        if (error) throw error;

        return sendSuccess(res, {
            banners: banners.map(b => ({
                id: b.id,
                title: b.title,
                description: b.description,
                imageUrl: b.image_url,
                linkUrl: b.link_url,
                linkText: b.link_text,
                position: b.position,
            })),
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all banners (admin)
 * GET /api/admin/banners
 */
async function getAllBanners(req, res, next) {
    try {
        const { data: banners, error } = await supabaseAdmin
            .from('banners')
            .select('*')
            .order('position', { ascending: true });

        if (error) throw error;

        return sendSuccess(res, {
            banners: banners.map(b => ({
                id: b.id,
                title: b.title,
                description: b.description,
                imageUrl: b.image_url,
                linkUrl: b.link_url,
                linkText: b.link_text,
                position: b.position,
                isActive: b.is_active,
                startDate: b.start_date,
                endDate: b.end_date,
                createdAt: b.created_at,
                updatedAt: b.updated_at,
            })),
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create banner (admin)
 * POST /api/admin/banners
 */
async function createBanner(req, res, next) {
    try {
        const { title, description, imageUrl, linkUrl, linkText, position, isActive, startDate, endDate } = req.body;

        if (!title || !imageUrl) {
            return sendError(res, 'BANNER_001', 'Title and image URL are required', 400);
        }

        const { data: banner, error } = await supabaseAdmin
            .from('banners')
            .insert({
                title,
                description,
                image_url: imageUrl,
                link_url: linkUrl,
                link_text: linkText || 'Mua ngay',
                position: position || 0,
                is_active: isActive !== false,
                start_date: startDate || null,
                end_date: endDate || null,
                created_by: req.user.userId,
            })
            .select()
            .single();

        if (error) throw error;

        return sendSuccess(res, {
            message: 'Banner created successfully',
            banner: {
                id: banner.id,
                title: banner.title,
                description: banner.description,
                imageUrl: banner.image_url,
                linkUrl: banner.link_url,
                linkText: banner.link_text,
                position: banner.position,
                isActive: banner.is_active,
                startDate: banner.start_date,
                endDate: banner.end_date,
            },
        }, 201);
    } catch (error) {
        next(error);
    }
}

/**
 * Update banner (admin)
 * PUT /api/admin/banners/:id
 */
async function updateBanner(req, res, next) {
    try {
        const { id } = req.params;
        const { title, description, imageUrl, linkUrl, linkText, position, isActive, startDate, endDate } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (imageUrl !== undefined) updateData.image_url = imageUrl;
        if (linkUrl !== undefined) updateData.link_url = linkUrl;
        if (linkText !== undefined) updateData.link_text = linkText;
        if (position !== undefined) updateData.position = position;
        if (isActive !== undefined) updateData.is_active = isActive;
        if (startDate !== undefined) updateData.start_date = startDate;
        if (endDate !== undefined) updateData.end_date = endDate;

        const { data: banner, error } = await supabaseAdmin
            .from('banners')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return sendSuccess(res, {
            message: 'Banner updated successfully',
            banner: {
                id: banner.id,
                title: banner.title,
                description: banner.description,
                imageUrl: banner.image_url,
                linkUrl: banner.link_url,
                linkText: banner.link_text,
                position: banner.position,
                isActive: banner.is_active,
                startDate: banner.start_date,
                endDate: banner.end_date,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete banner (admin)
 * DELETE /api/admin/banners/:id
 */
async function deleteBanner(req, res, next) {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('banners')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return sendSuccess(res, { message: 'Banner deleted successfully' });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getActiveBanners,
    getAllBanners,
    createBanner,
    updateBanner,
    deleteBanner,
};
