/**
 * Shop Review Routes
 * API endpoints for Partner to manage shop reviews
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../auth/auth.middleware');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');
const reviewService = require('../product/services/review.service');

// All routes require authentication and partner role
router.use(authenticate);
router.use(authorize('partner', 'admin'));

/**
 * Helper to get shop_id from partner user
 */
async function getShopIdFromUser(req) {
  if (req.user.role === 'admin' && req.query.shopId) {
    return req.query.shopId;
  }
  
  const { data: shop, error } = await supabaseAdmin
    .from('shops')
    .select('id')
    .eq('partner_id', req.user.userId)
    .single();
  
  if (error || !shop) {
    return null;
  }
  return shop.id;
}

/**
 * GET /api/shop/reviews
 * Get all reviews for partner's shop products
 */
router.get('/', async (req, res, next) => {
  try {
    const shopId = await getShopIdFromUser(req);
    console.log('[ShopReview] Getting reviews for shopId:', shopId);
    
    const emptyResponse = {
      data: [],
      stats: { total: 0, average: 0, pending: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
    
    if (!shopId) {
      return sendSuccess(res, emptyResponse);
    }

    const { page = 1, limit = 20, rating, has_reply } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get all product IDs for this shop
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shop_id', shopId);

    if (productsError) {
      console.error('[ShopReview] Error getting products:', productsError);
      return sendSuccess(res, emptyResponse);
    }

    const productIds = products?.map(p => p.id) || [];
    console.log('[ShopReview] Found products:', productIds.length);

    if (productIds.length === 0) {
      return sendSuccess(res, {
        ...emptyResponse,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 }
      });
    }

    // Build query for reviews - simpler query first
    let query = supabaseAdmin
      .from('reviews')
      .select('*', { count: 'exact' })
      .in('product_id', productIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Filter by rating
    if (rating) {
      query = query.eq('rating', parseInt(rating));
    }

    // Filter by reply status
    if (has_reply === 'true') {
      query = query.not('reply', 'is', null);
    } else if (has_reply === 'false') {
      query = query.is('reply', null);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[ShopReview] Error getting reviews:', error);
      // If reviews table doesn't exist, return empty
      if (error.message?.includes('relation') || error.code === '42P01') {
        return sendSuccess(res, emptyResponse);
      }
      throw error;
    }

    // Enrich with user and product info
    const enrichedData = await Promise.all((data || []).map(async (review) => {
      // Get user info
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', review.user_id)
        .single();
      
      // Get product info
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, name, slug')
        .eq('id', review.product_id)
        .single();
      
      return {
        ...review,
        user: user || null,
        product: product || null
      };
    }));

    // Get stats
    const { data: allReviews } = await supabaseAdmin
      .from('reviews')
      .select('rating, reply')
      .in('product_id', productIds)
      .eq('status', 'active');

    const stats = {
      total: allReviews?.length || 0,
      average: 0,
      pending: allReviews?.filter(r => !r.reply).length || 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    if (allReviews && allReviews.length > 0) {
      const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
      stats.average = Math.round((sum / allReviews.length) * 10) / 10;
      allReviews.forEach(r => {
        stats.distribution[r.rating] = (stats.distribution[r.rating] || 0) + 1;
      });
    }

    console.log('[ShopReview] Returning reviews:', enrichedData.length, 'stats:', stats);

    return sendSuccess(res, {
      data: enrichedData,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[ShopReview] Error getting reviews:', error);
    // Return empty data instead of error for better UX
    return sendSuccess(res, {
      data: [],
      stats: { total: 0, average: 0, pending: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
  }
});

/**
 * POST /api/shop/reviews/:reviewId/reply
 * Reply to a review
 */
router.post('/:reviewId/reply', async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { content } = req.body;
    const partnerId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Reply content is required', 400);
    }

    const result = await reviewService.replyToReview(reviewId, partnerId, content);
    return sendSuccess(res, result, 201);
  } catch (error) {
    console.error('[ShopReview] Error replying to review:', error);
    if (error.statusCode) {
      return sendError(res, error.code, error.message, error.statusCode);
    }
    next(error);
  }
});

/**
 * PUT /api/shop/reviews/:reviewId/reply
 * Update reply to a review
 */
router.put('/:reviewId/reply', async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { content } = req.body;
    const partnerId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'Reply content is required', 400);
    }

    const result = await reviewService.updateReply(reviewId, partnerId, content);
    return sendSuccess(res, result);
  } catch (error) {
    console.error('[ShopReview] Error updating reply:', error);
    if (error.statusCode) {
      return sendError(res, error.code, error.message, error.statusCode);
    }
    next(error);
  }
});

module.exports = router;
