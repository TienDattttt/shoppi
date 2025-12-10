/**
 * Shop Voucher Routes
 * API endpoints for Partner to manage shop vouchers
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { sendSuccess: successResponse, sendError: errorResponse } = require('../../shared/utils/response.util');

// All routes require authentication and partner role (admin can also access)
router.use(authenticate);
router.use(authorize('partner', 'admin'));

/**
 * Helper to get shop_id from partner user
 */
async function getShopIdFromUser(req) {
  // If admin provides shopId in query, use that
  if (req.user.role === 'admin' && req.query.shopId) {
    return req.query.shopId;
  }
  
  const { data: shop, error } = await supabaseAdmin
    .from('shops')
    .select('id')
    .eq('partner_id', req.user.userId)
    .single();
  
  if (error || !shop) {
    throw new Error('Shop not found for this partner');
  }
  return shop.id;
}

/**
 * GET /api/shop/vouchers
 * Get all vouchers for partner's shop
 */
router.get('/', async (req, res, next) => {
  try {
    const shopId = await getShopIdFromUser(req);
    const { page = 1, limit = 20, is_active } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('vouchers')
      .select('*', { count: 'exact' })
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return successResponse(res, {
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});


/**
 * POST /api/shop/vouchers
 * Create a new shop voucher
 */
router.post('/', async (req, res, next) => {
  try {
    const shopId = await getShopIdFromUser(req);
    const {
      code,
      discount_type,
      discount_value,
      min_order_value = 0,
      max_discount_value,
      usage_limit,
      usage_per_user = 1,
      start_date,
      end_date,
      is_active = true,
    } = req.body;

    // Validate required fields
    if (!code || !discount_type || !discount_value || !start_date || !end_date) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    // Map discount_type: frontend sends 'fixed'/'percent', db expects 'fixed'/'percentage'
    const dbDiscountType = discount_type === 'percent' ? 'percentage' : discount_type;

    // Check if code already exists
    const { data: existing } = await supabaseAdmin
      .from('vouchers')
      .select('id')
      .eq('code', code.toUpperCase())
      .single();

    if (existing) {
      return errorResponse(res, 'Voucher code already exists', 409);
    }

    const { data, error } = await supabaseAdmin
      .from('vouchers')
      .insert({
        shop_id: shopId,
        code: code.toUpperCase(),
        type: 'shop',
        discount_type: dbDiscountType,
        discount_value,
        min_order_value: min_order_value || 0,
        max_discount: max_discount_value || null,
        usage_limit: usage_limit || null,
        per_user_limit: usage_per_user || 1,
        start_date,
        end_date,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return successResponse(res, {
      message: 'Voucher created successfully',
      data,
    }, 201);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/shop/vouchers/:id
 * Update a shop voucher
 */
router.put('/:id', async (req, res, next) => {
  try {
    const shopId = await getShopIdFromUser(req);
    const { id } = req.params;
    const {
      discount_type,
      discount_value,
      min_order_value,
      max_discount_value,
      usage_limit,
      usage_per_user,
      start_date,
      end_date,
      is_active,
    } = req.body;

    // Verify ownership
    const { data: voucher, error: findError } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (findError || !voucher) {
      return errorResponse(res, 'Voucher not found', 404);
    }

    const updateData = {};
    if (discount_type !== undefined) {
      // Map discount_type: frontend sends 'fixed'/'percent', db expects 'fixed'/'percentage'
      updateData.discount_type = discount_type === 'percent' ? 'percentage' : discount_type;
    }
    if (discount_value !== undefined) updateData.discount_value = discount_value;
    if (min_order_value !== undefined) updateData.min_order_value = min_order_value;
    if (max_discount_value !== undefined) updateData.max_discount = max_discount_value;
    if (usage_limit !== undefined) updateData.usage_limit = usage_limit;
    if (usage_per_user !== undefined) updateData.per_user_limit = usage_per_user;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('vouchers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return successResponse(res, {
      message: 'Voucher updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/shop/vouchers/:id
 * Delete a shop voucher
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const shopId = await getShopIdFromUser(req);
    const { id } = req.params;

    // Verify ownership
    const { data: voucher, error: findError } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('id', id)
      .eq('shop_id', shopId)
      .single();

    if (findError || !voucher) {
      return errorResponse(res, 'Voucher not found', 404);
    }

    const { error } = await supabaseAdmin
      .from('vouchers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return successResponse(res, {
      message: 'Voucher deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
