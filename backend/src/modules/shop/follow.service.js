/**
 * Follow Service
 * Business logic for follow operations between customers and shops
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5, 6.1, 6.3
 */

const followRepository = require('./follow.repository');
const shopRepository = require('./shop.repository');
const { NotFoundError, ConflictError, AppError } = require('../../shared/utils/error.util');

// ============================================
// ERROR CODES
// ============================================

const FOLLOW_ERRORS = {
  ALREADY_FOLLOWING: { code: 'FOLLOW_001', message: 'Already following this shop', statusCode: 409 },
  NOT_FOLLOWING: { code: 'FOLLOW_002', message: 'Not following this shop', statusCode: 404 },
  SHOP_NOT_FOUND: { code: 'SHOP_001', message: 'Shop not found', statusCode: 404 },
  SHOP_NOT_ACTIVE: { code: 'SHOP_004', message: 'Shop is not active', statusCode: 403 },
};

// ============================================
// FOLLOW OPERATIONS (Requirements 5.1, 5.2, 5.5)
// ============================================

/**
 * Follow a shop
 * Creates follow relationship and increments shop follower_count
 * @param {string} customerId - Customer user ID
 * @param {string} shopId - Shop ID to follow
 * @returns {Promise<object>} Follow result with shop info
 * 
 * Requirement 5.1: WHEN a Customer follows a Shop THEN the Shop_System SHALL 
 * create follow relationship and increment shop follower_count
 */
async function followShop(customerId, shopId) {
  // Verify shop exists and is active
  const shop = await shopRepository.findShopById(shopId);
  if (!shop) {
    throw new NotFoundError(FOLLOW_ERRORS.SHOP_NOT_FOUND.message);
  }

  if (shop.status !== 'active') {
    throw new AppError(
      FOLLOW_ERRORS.SHOP_NOT_ACTIVE.code,
      FOLLOW_ERRORS.SHOP_NOT_ACTIVE.message,
      FOLLOW_ERRORS.SHOP_NOT_ACTIVE.statusCode
    );
  }

  // Check if already following
  const existingFollow = await followRepository.findFollow(customerId, shopId);
  if (existingFollow) {
    throw new ConflictError(FOLLOW_ERRORS.ALREADY_FOLLOWING.code, FOLLOW_ERRORS.ALREADY_FOLLOWING.message);
  }

  // Create follow relationship
  const follow = await followRepository.createFollow(customerId, shopId);

  // Sync follower count - get actual count from database to ensure accuracy
  const actualCount = await followRepository.getFollowerCount(shopId);
  await shopRepository.updateFollowerCount(shopId, actualCount);

  return {
    follow,
    shop: {
      id: shop.id,
      shop_name: shop.shop_name,
      follower_count: actualCount,
    },
  };
}

/**
 * Unfollow a shop
 * Removes follow relationship and decrements shop follower_count
 * @param {string} customerId - Customer user ID
 * @param {string} shopId - Shop ID to unfollow
 * @returns {Promise<object>} Unfollow result
 * 
 * Requirement 5.2: WHEN a Customer unfollows a Shop THEN the Shop_System SHALL 
 * remove follow relationship and decrement shop follower_count
 */
async function unfollowShop(customerId, shopId) {
  // Verify shop exists
  const shop = await shopRepository.findShopById(shopId);
  if (!shop) {
    throw new NotFoundError(FOLLOW_ERRORS.SHOP_NOT_FOUND.message);
  }

  // Check if following
  const existingFollow = await followRepository.findFollow(customerId, shopId);
  if (!existingFollow) {
    throw new NotFoundError(FOLLOW_ERRORS.NOT_FOLLOWING.message);
  }

  // Delete follow relationship
  await followRepository.deleteFollow(customerId, shopId);

  // Sync follower count - get actual count from database to ensure accuracy
  const actualCount = await followRepository.getFollowerCount(shopId);
  await shopRepository.updateFollowerCount(shopId, actualCount);

  return {
    success: true,
    shop: {
      id: shop.id,
      shop_name: shop.shop_name,
      follower_count: actualCount,
    },
  };
}

/**
 * Check if customer is following a shop
 * @param {string} customerId - Customer user ID
 * @param {string} shopId - Shop ID
 * @returns {Promise<boolean>} True if following, false otherwise
 * 
 * Requirement 5.5: WHEN a Customer checks follow status THEN the Shop_System SHALL 
 * return boolean indicating if Customer follows the Shop
 */
async function isFollowing(customerId, shopId) {
  const follow = await followRepository.findFollow(customerId, shopId);
  return follow !== null;
}

// ============================================
// LIST OPERATIONS (Requirement 5.3)
// ============================================

/**
 * Get shops followed by a customer
 * @param {string} customerId - Customer user ID
 * @param {object} options - Pagination options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=20] - Items per page
 * @returns {Promise<{data: object[], total: number, page: number, limit: number, hasMore: boolean}>}
 * 
 * Requirement 5.3: WHEN a Customer views followed shops THEN the Shop_System SHALL 
 * return list of followed shops with latest activity
 */
async function getFollowedShops(customerId, options = {}) {
  const { page = 1, limit = 20 } = options;
  
  const result = await followRepository.getFollowedShops(customerId, { page, limit });

  // Transform data to include only active shops with relevant info
  const shops = result.data
    .filter(item => item.shop && item.shop.status === 'active')
    .map(item => ({
      followed_at: item.created_at,
      shop: {
        id: item.shop.id,
        shop_name: item.shop.shop_name,
        slug: item.shop.slug,
        description: item.shop.description,
        logo_url: item.shop.logo_url,
        banner_url: item.shop.banner_url,
        follower_count: item.shop.follower_count,
        product_count: item.shop.product_count,
        avg_rating: item.shop.avg_rating,
        review_count: item.shop.review_count,
      },
    }));

  return {
    data: shops,
    total: result.count,
    page,
    limit,
    hasMore: page * limit < result.count,
  };
}

// ============================================
// COUNT OPERATIONS (Requirements 6.1, 6.3)
// ============================================

/**
 * Get follower count for a shop
 * @param {string} shopId - Shop ID
 * @returns {Promise<number>} Follower count
 * 
 * Requirement 6.3: WHEN follower count is requested THEN the Shop_System SHALL 
 * return accurate count from database
 */
async function getFollowerCount(shopId) {
  // Verify shop exists
  const shop = await shopRepository.findShopById(shopId);
  if (!shop) {
    throw new NotFoundError(FOLLOW_ERRORS.SHOP_NOT_FOUND.message);
  }

  // Get actual count from follows table for accuracy
  const count = await followRepository.getFollowerCount(shopId);
  
  // Sync shop's follower_count if it differs
  if (shop.follower_count !== count) {
    await shopRepository.updateFollowerCount(shopId, count);
  }

  return count;
}

/**
 * Get followers of a shop (for Partner dashboard)
 * @param {string} shopId - Shop ID
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], total: number, page: number, limit: number, hasMore: boolean}>}
 * 
 * Requirement 6.1: WHEN Partner views shop dashboard THEN the Shop_System SHALL 
 * display total follower count
 */
async function getShopFollowers(shopId, options = {}) {
  const { page = 1, limit = 20 } = options;

  // Verify shop exists
  const shop = await shopRepository.findShopById(shopId);
  if (!shop) {
    throw new NotFoundError(FOLLOW_ERRORS.SHOP_NOT_FOUND.message);
  }

  const result = await followRepository.getShopFollowers(shopId, { page, limit });

  // Transform data
  const followers = result.data.map(item => ({
    followed_at: item.created_at,
    user: item.user ? {
      id: item.user.id,
      full_name: item.user.full_name,
      avatar_url: item.user.avatar_url,
    } : null,
  }));

  return {
    data: followers,
    total: result.count,
    page,
    limit,
    hasMore: page * limit < result.count,
  };
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Check if customer follows multiple shops
 * Useful for displaying follow status on shop listings
 * @param {string} customerId - Customer user ID
 * @param {string[]} shopIds - Array of shop IDs
 * @returns {Promise<object>} Map of shopId -> boolean
 */
async function checkFollowingMultiple(customerId, shopIds) {
  if (!shopIds || shopIds.length === 0) {
    return {};
  }

  return followRepository.checkFollowingMultiple(customerId, shopIds);
}

/**
 * Get all follower user IDs for a shop (for notifications)
 * @param {string} shopId - Shop ID
 * @returns {Promise<string[]>} Array of user IDs
 */
async function getFollowerUserIds(shopId) {
  return followRepository.getFollowerUserIds(shopId);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Error codes
  FOLLOW_ERRORS,
  
  // Follow operations
  followShop,
  unfollowShop,
  isFollowing,
  
  // List operations
  getFollowedShops,
  
  // Count operations
  getFollowerCount,
  getShopFollowers,
  
  // Bulk operations
  checkFollowingMultiple,
  getFollowerUserIds,
};
