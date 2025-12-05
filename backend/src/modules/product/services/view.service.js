/**
 * View Service
 * Product view count tracking with Redis rate limiting
 */

const productRepository = require('../product.repository');
const { redisClient } = require('../../../shared/redis/redis.client');
const { NotFoundError } = require('../../../shared/utils/error.util');

// Rate limiting configuration
const VIEW_RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds
const VIEW_RATE_LIMIT_KEY_PREFIX = 'product_view:';

/**
 * Generate rate limit key for user-product combination
 * @param {string} productId
 * @param {string} userId - User ID or IP address
 * @returns {string}
 */
function getViewRateLimitKey(productId, userId) {
  return `${VIEW_RATE_LIMIT_KEY_PREFIX}${productId}:${userId}`;
}

/**
 * Check if user can view product (rate limiting)
 * @param {string} productId
 * @param {string} userId - User ID or IP address
 * @returns {Promise<boolean>}
 */
async function canCountView(productId, userId) {
  if (!redisClient) {
    // If Redis not available, always allow
    return true;
  }

  try {
    const key = getViewRateLimitKey(productId, userId);
    const exists = await redisClient.exists(key);
    return !exists;
  } catch (error) {
    console.error('Redis error in canCountView:', error.message);
    return true; // Allow on error
  }
}

/**
 * Mark product as viewed by user (for rate limiting)
 * @param {string} productId
 * @param {string} userId - User ID or IP address
 * @returns {Promise<void>}
 */
async function markAsViewed(productId, userId) {
  if (!redisClient) {
    return;
  }

  try {
    const key = getViewRateLimitKey(productId, userId);
    await redisClient.setEx(key, VIEW_RATE_LIMIT_WINDOW, '1');
  } catch (error) {
    console.error('Redis error in markAsViewed:', error.message);
  }
}


/**
 * Track product view with rate limiting
 * @param {string} productId
 * @param {string} viewerId - User ID or IP address for rate limiting
 * @returns {Promise<{product: object, viewCounted: boolean, newViewCount: number}>}
 */
async function trackProductView(productId, viewerId) {
  // Get product
  const product = await productRepository.findProductByIdWithRelations(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Only count views for active products
  if (product.status !== 'active') {
    return {
      product,
      viewCounted: false,
      newViewCount: product.view_count,
      reason: 'Product not active',
    };
  }

  // Check rate limit
  const canCount = await canCountView(productId, viewerId);
  
  if (!canCount) {
    return {
      product,
      viewCounted: false,
      newViewCount: product.view_count,
      reason: 'Rate limited',
    };
  }

  // Increment view count
  const previousCount = product.view_count || 0;
  await productRepository.incrementViewCount(productId);
  
  // Mark as viewed for rate limiting
  await markAsViewed(productId, viewerId);

  // Return updated product
  const updatedProduct = await productRepository.findProductByIdWithRelations(productId);

  return {
    product: updatedProduct,
    viewCounted: true,
    previousViewCount: previousCount,
    newViewCount: previousCount + 1,
  };
}

/**
 * Get product detail with view tracking
 * @param {string} productId
 * @param {string} viewerId - User ID or IP address
 * @param {boolean} trackView - Whether to track the view
 * @returns {Promise<object>}
 */
async function getProductDetail(productId, viewerId = null, trackView = true) {
  if (trackView && viewerId) {
    const result = await trackProductView(productId, viewerId);
    return result.product;
  }

  const product = await productRepository.findProductByIdWithRelations(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

/**
 * Get view count for product
 * @param {string} productId
 * @returns {Promise<number>}
 */
async function getViewCount(productId) {
  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product.view_count || 0;
}

/**
 * Increment view count directly (without rate limiting)
 * Used for testing or admin purposes
 * @param {string} productId
 * @returns {Promise<{previousCount: number, newCount: number}>}
 */
async function incrementViewCount(productId) {
  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const previousCount = product.view_count || 0;
  await productRepository.incrementViewCount(productId);

  return {
    previousCount,
    newCount: previousCount + 1,
  };
}

/**
 * Reset view count (admin only)
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function resetViewCount(productId) {
  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return productRepository.updateProduct(productId, { view_count: 0 });
}

/**
 * Get most viewed products
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function getMostViewedProducts(limit = 10) {
  // This would need a custom repository method
  // For now, return empty array
  return [];
}

module.exports = {
  trackProductView,
  getProductDetail,
  getViewCount,
  incrementViewCount,
  resetViewCount,
  getMostViewedProducts,
  canCountView,
  markAsViewed,
  getViewRateLimitKey,
  VIEW_RATE_LIMIT_WINDOW,
};
