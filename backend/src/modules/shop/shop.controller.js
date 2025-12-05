/**
 * Shop Controller
 * HTTP request handlers for shop endpoints
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 4.1
 */

const shopService = require('./shop.service');
const followService = require('./follow.service');
const { serializeShop, serializeShopForCustomer, serializeShopList } = require('./shop.dto');
const { sendSuccess, sendCreated, sendError } = require('../../shared/utils/response.util');

// ============================================
// SHOP CRUD (Requirements 1.1, 3.1, 4.1)
// ============================================

/**
 * Create a new shop (Partner registration)
 * POST /api/shops
 * 
 * Requirement 1.1: WHEN a Partner submits shop registration with required fields
 * THEN the Shop_System SHALL create a new Shop with status 'pending'
 */
async function createShop(req, res, next) {
  try {
    const partnerId = req.user.id;
    
    const shop = await shopService.createShop(partnerId, req.body);
    
    return sendCreated(res, {
      message: 'Shop registration submitted successfully. Pending admin approval.',
      shop: serializeShop(shop),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shop by ID
 * GET /api/shops/:id
 * 
 * Requirement 4.1: WHEN a Customer views shop profile THEN the Shop_System SHALL
 * return shop information including name, description, rating, follower count, and product count
 */
async function getShop(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const shop = await shopService.getShopById(id);
    
    // Check if user is the shop owner or admin
    const isOwner = shop.partner_id === userId;
    const isAdmin = userRole === 'admin';
    
    // For customers, only show active shops with customer-safe serialization
    if (!isOwner && !isAdmin) {
      if (shop.status !== 'active') {
        return sendError(res, 'SHOP_004', 'Shop is not available', 404);
      }
      
      // Include follow status if user is logged in
      let isFollowing = false;
      if (userId) {
        isFollowing = await followService.isFollowing(userId, id);
      }
      
      return sendSuccess(res, {
        shop: serializeShopForCustomer(shop),
        isFollowing,
      });
    }
    
    // For owner or admin, return full shop details
    return sendSuccess(res, {
      shop: serializeShop(shop),
    });
  } catch (error) {
    next(error);
  }
}


/**
 * Get shop by slug
 * GET /api/shops/slug/:slug
 */
async function getShopBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;
    
    const shop = await shopService.getShopBySlug(slug);
    
    // Only show active shops to public
    if (shop.status !== 'active') {
      return sendError(res, 'SHOP_004', 'Shop is not available', 404);
    }
    
    // Include follow status if user is logged in
    let isFollowing = false;
    if (userId) {
      isFollowing = await followService.isFollowing(userId, shop.id);
    }
    
    return sendSuccess(res, {
      shop: serializeShopForCustomer(shop),
      isFollowing,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current partner's shop
 * GET /api/shops/me
 */
async function getMyShop(req, res, next) {
  try {
    const partnerId = req.user.id;
    
    const shop = await shopService.getShopByPartnerId(partnerId);
    
    return sendSuccess(res, {
      shop: serializeShop(shop),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update shop information
 * PATCH /api/shops/:id
 * 
 * Requirement 3.1: WHEN a Partner updates shop profile THEN the Shop_System SHALL
 * validate and save changes
 */
async function updateShop(req, res, next) {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;
    
    const shop = await shopService.updateShop(id, partnerId, req.body);
    
    // Check if status changed to pending (critical fields changed)
    const statusMessage = shop.status === 'pending' 
      ? ' Critical fields were changed, shop requires re-approval.'
      : '';
    
    return sendSuccess(res, {
      message: `Shop updated successfully.${statusMessage}`,
      shop: serializeShop(shop),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List active shops with filters
 * GET /api/shops
 */
async function listShops(req, res, next) {
  try {
    const { q, city, district, category_id, sortBy, sortOrder, page, pageSize } = req.query;
    
    let result;
    
    if (q) {
      // Search shops
      result = await shopService.searchShops(q, {
        city,
        district,
        category_id,
      }, {
        page: parseInt(page, 10) || 1,
        pageSize: parseInt(pageSize, 10) || 20,
        sortBy,
        sortOrder,
      });
    } else {
      // List active shops
      result = await shopService.getActiveShops({
        city,
        district,
        category_id,
      }, {
        page: parseInt(page, 10) || 1,
        pageSize: parseInt(pageSize, 10) || 20,
        sortBy,
        sortOrder,
      });
    }
    
    return sendSuccess(res, serializeShopList(result.data, {
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
      totalItems: result.count,
    }, true));
  } catch (error) {
    next(error);
  }
}


// ============================================
// ADMIN OPERATIONS (Requirements 2.1, 2.2, 2.3, 2.4)
// ============================================

/**
 * Get pending shops for admin review
 * GET /api/admin/shops/pending
 * 
 * Requirement 2.1: WHEN Admin views pending shops THEN the Shop_System SHALL
 * display list of shops with status 'pending' sorted by created_at
 */
async function getPendingShops(req, res, next) {
  try {
    const { page, pageSize } = req.query;
    
    const result = await shopService.getPendingShops({
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
    });
    
    return sendSuccess(res, serializeShopList(result.data, {
      page: parseInt(page, 10) || 1,
      pageSize: parseInt(pageSize, 10) || 20,
      totalItems: result.count,
    }));
  } catch (error) {
    next(error);
  }
}

/**
 * Approve a shop
 * POST /api/admin/shops/:id/approve
 * 
 * Requirement 2.2: WHEN Admin approves a Shop THEN the Shop_System SHALL
 * change status to 'active' and notify Partner via email and SMS
 */
async function approveShop(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const shop = await shopService.approveShop(id, adminId);
    
    return sendSuccess(res, {
      message: 'Shop approved successfully',
      shop: serializeShop(shop),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject a shop
 * POST /api/admin/shops/:id/reject
 * 
 * Requirement 2.3: WHEN Admin rejects a Shop THEN the Shop_System SHALL
 * change status to 'rejected' and notify Partner with rejection reason
 */
async function rejectShop(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;
    
    if (!reason || reason.trim().length === 0) {
      return sendError(res, 'SHOP_003', 'Rejection reason is required', 400);
    }
    
    const shop = await shopService.rejectShop(id, adminId, reason);
    
    return sendSuccess(res, {
      message: 'Shop rejected',
      shop: serializeShop(shop),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request revision for a shop
 * POST /api/admin/shops/:id/revision
 * 
 * Requirement 2.4: WHEN Admin requests revision THEN the Shop_System SHALL
 * change status to 'revision_required' and notify Partner with required changes
 */
async function requestRevision(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { changes } = req.body;
    
    if (!changes || changes.trim().length === 0) {
      return sendError(res, 'SHOP_003', 'Required changes description is required', 400);
    }
    
    const shop = await shopService.requestRevision(id, adminId, changes);
    
    return sendSuccess(res, {
      message: 'Revision requested',
      shop: serializeShop(shop),
    });
  } catch (error) {
    next(error);
  }
}


// ============================================
// FOLLOW OPERATIONS (Requirements 5.1, 5.2, 5.3, 6.3)
// ============================================

/**
 * Follow a shop
 * POST /api/shops/:id/follow
 * 
 * Requirement 5.1: WHEN a Customer follows a Shop THEN the Shop_System SHALL
 * create follow relationship and increment shop follower_count
 */
async function followShop(req, res, next) {
  try {
    const { id } = req.params;
    const customerId = req.user.id;
    
    const result = await followService.followShop(customerId, id);
    
    return sendCreated(res, {
      message: 'Successfully followed shop',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unfollow a shop
 * DELETE /api/shops/:id/follow
 * 
 * Requirement 5.2: WHEN a Customer unfollows a Shop THEN the Shop_System SHALL
 * remove follow relationship and decrement shop follower_count
 */
async function unfollowShop(req, res, next) {
  try {
    const { id } = req.params;
    const customerId = req.user.id;
    
    const result = await followService.unfollowShop(customerId, id);
    
    return sendSuccess(res, {
      message: 'Successfully unfollowed shop',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get follower count for a shop
 * GET /api/shops/:id/followers/count
 * 
 * Requirement 6.3: WHEN follower count is requested THEN the Shop_System SHALL
 * return accurate count from database
 */
async function getFollowerCount(req, res, next) {
  try {
    const { id } = req.params;
    
    const count = await followService.getFollowerCount(id);
    
    return sendSuccess(res, {
      shopId: id,
      followerCount: count,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shops followed by current user
 * GET /api/users/me/following
 * 
 * Requirement 5.3: WHEN a Customer views followed shops THEN the Shop_System SHALL
 * return list of followed shops with latest activity
 */
async function getFollowedShops(req, res, next) {
  try {
    const customerId = req.user.id;
    const { page, limit } = req.query;
    
    const result = await followService.getFollowedShops(customerId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
    
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get followers of a shop (Partner dashboard)
 * GET /api/shops/:id/followers
 */
async function getShopFollowers(req, res, next) {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;
    const { page, limit } = req.query;
    
    // Verify ownership
    const shop = await shopService.getShopById(id);
    if (shop.partner_id !== partnerId && req.user.role !== 'admin') {
      return sendError(res, 'SHOP_005', 'Not authorized to view followers', 403);
    }
    
    const result = await followService.getShopFollowers(id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
    
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}


// ============================================
// IMAGE OPERATIONS
// ============================================

/**
 * Upload shop logo
 * POST /api/shops/:id/logo
 */
async function uploadLogo(req, res, next) {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;
    
    if (!req.file) {
      return sendError(res, 'IMAGE_001', 'Logo file is required', 400);
    }
    
    const result = await shopService.uploadLogo(
      id,
      partnerId,
      req.file.buffer,
      req.file.mimetype
    );
    
    return sendSuccess(res, {
      message: 'Logo uploaded successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload shop banner
 * POST /api/shops/:id/banner
 */
async function uploadBanner(req, res, next) {
  try {
    const { id } = req.params;
    const partnerId = req.user.id;
    
    if (!req.file) {
      return sendError(res, 'IMAGE_001', 'Banner file is required', 400);
    }
    
    const result = await shopService.uploadBanner(
      id,
      partnerId,
      req.file.buffer,
      req.file.mimetype
    );
    
    return sendSuccess(res, {
      message: 'Banner uploaded successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Shop CRUD
  createShop,
  getShop,
  getShopBySlug,
  getMyShop,
  updateShop,
  listShops,
  
  // Admin operations
  getPendingShops,
  approveShop,
  rejectShop,
  requestRevision,
  
  // Follow operations
  followShop,
  unfollowShop,
  getFollowerCount,
  getFollowedShops,
  getShopFollowers,
  
  // Image operations
  uploadLogo,
  uploadBanner,
};
