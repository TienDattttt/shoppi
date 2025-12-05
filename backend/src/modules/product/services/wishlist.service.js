/**
 * Wishlist Service
 * Business logic for customer wishlist/favorites
 */

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const productRepository = require('../product.repository');
const { NotFoundError, ConflictError } = require('../../../shared/utils/error.util');
const { v4: uuidv4 } = require('uuid');

/**
 * Add product to wishlist
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function addToWishlist(userId, productId) {
  // Check if product exists
  const product = await productRepository.findProductById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // Check if already in wishlist
  const existing = await isInWishlist(userId, productId);
  if (existing) {
    throw new ConflictError('ALREADY_IN_WISHLIST', 'Product is already in your wishlist');
  }

  // Add to wishlist with current price
  const { data, error } = await supabaseAdmin
    .from('wishlists')
    .insert({
      id: uuidv4(),
      user_id: userId,
      product_id: productId,
      price_at_add: product.base_price,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new ConflictError('ALREADY_IN_WISHLIST', 'Product is already in your wishlist');
    }
    throw new Error(`Failed to add to wishlist: ${error.message}`);
  }

  return {
    ...data,
    product,
  };
}

/**
 * Remove product from wishlist
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<void>}
 */
async function removeFromWishlist(userId, productId) {
  const { error, count } = await supabaseAdmin
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);

  if (error) {
    throw new Error(`Failed to remove from wishlist: ${error.message}`);
  }

  // No error if item wasn't in wishlist
}


/**
 * Get user's wishlist
 * @param {string} userId
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getWishlist(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('wishlists')
    .select(`
      *,
      products(
        id, name, slug, short_description, base_price,
        compare_at_price, currency, avg_rating, review_count,
        status
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get wishlist: ${error.message}`);
  }

  // Filter out deleted/inactive products and add price drop info
  const items = (data || [])
    .filter(item => item.products && item.products.status === 'active')
    .map(item => ({
      id: item.id,
      productId: item.product_id,
      addedAt: item.created_at,
      priceAtAdd: item.price_at_add,
      currentPrice: item.products.base_price,
      hasPriceDrop: item.products.base_price < item.price_at_add,
      priceDropAmount: item.price_at_add - item.products.base_price,
      product: item.products,
    }));

  return {
    data: items,
    count: count || 0,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Check if product is in user's wishlist
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
async function isInWishlist(userId, productId) {
  const { count, error } = await supabaseAdmin
    .from('wishlists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('product_id', productId);

  if (error) {
    throw new Error(`Failed to check wishlist: ${error.message}`);
  }

  return count > 0;
}

/**
 * Get wishlist item
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<object|null>}
 */
async function getWishlistItem(userId, productId) {
  const { data, error } = await supabaseAdmin
    .from('wishlists')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get wishlist item: ${error.message}`);
  }

  return data || null;
}

/**
 * Get wishlist count for user
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getWishlistCount(userId) {
  const { count, error } = await supabaseAdmin
    .from('wishlists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get wishlist count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Toggle wishlist (add if not exists, remove if exists)
 * @param {string} userId
 * @param {string} productId
 * @returns {Promise<{action: string, inWishlist: boolean}>}
 */
async function toggleWishlist(userId, productId) {
  const inWishlist = await isInWishlist(userId, productId);

  if (inWishlist) {
    await removeFromWishlist(userId, productId);
    return { action: 'removed', inWishlist: false };
  } else {
    await addToWishlist(userId, productId);
    return { action: 'added', inWishlist: true };
  }
}


/**
 * Get products with price drops for a user
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getPriceDrops(userId) {
  const { data, error } = await supabaseAdmin
    .from('wishlists')
    .select(`
      *,
      products(id, name, slug, base_price, compare_at_price, status)
    `)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get price drops: ${error.message}`);
  }

  // Filter for price drops
  const priceDrops = (data || [])
    .filter(item => 
      item.products && 
      item.products.status === 'active' &&
      item.products.base_price < item.price_at_add
    )
    .map(item => ({
      productId: item.product_id,
      productName: item.products.name,
      productSlug: item.products.slug,
      priceAtAdd: item.price_at_add,
      currentPrice: item.products.base_price,
      dropAmount: item.price_at_add - item.products.base_price,
      dropPercentage: Math.round(((item.price_at_add - item.products.base_price) / item.price_at_add) * 100),
      addedAt: item.created_at,
    }));

  return priceDrops;
}

/**
 * Check for price drops and notify users (batch job)
 * @returns {Promise<{notified: number, errors: number}>}
 */
async function checkAndNotifyPriceDrops() {
  // Get all wishlist items where current price < price_at_add
  const { data, error } = await supabaseAdmin
    .from('wishlists')
    .select(`
      user_id,
      product_id,
      price_at_add,
      products(id, name, base_price, status)
    `);

  if (error) {
    throw new Error(`Failed to check price drops: ${error.message}`);
  }

  let notified = 0;
  let errors = 0;

  for (const item of data || []) {
    if (
      item.products &&
      item.products.status === 'active' &&
      item.products.base_price < item.price_at_add
    ) {
      try {
        // TODO: Send notification to user
        // await notificationService.sendPriceDropNotification(item.user_id, {
        //   productId: item.product_id,
        //   productName: item.products.name,
        //   oldPrice: item.price_at_add,
        //   newPrice: item.products.base_price,
        // });
        
        // Update price_at_add to current price to avoid duplicate notifications
        await supabaseAdmin
          .from('wishlists')
          .update({ price_at_add: item.products.base_price })
          .eq('user_id', item.user_id)
          .eq('product_id', item.product_id);
        
        notified++;
      } catch (err) {
        console.error(`Failed to notify user ${item.user_id}:`, err.message);
        errors++;
      }
    }
  }

  return { notified, errors };
}

/**
 * Clear user's wishlist
 * @param {string} userId
 * @returns {Promise<number>} Number of items removed
 */
async function clearWishlist(userId) {
  const { data, error } = await supabaseAdmin
    .from('wishlists')
    .delete()
    .eq('user_id', userId)
    .select();

  if (error) {
    throw new Error(`Failed to clear wishlist: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Get users who have a product in their wishlist
 * @param {string} productId
 * @returns {Promise<string[]>} Array of user IDs
 */
async function getUsersWithProductInWishlist(productId) {
  const { data, error } = await supabaseAdmin
    .from('wishlists')
    .select('user_id')
    .eq('product_id', productId);

  if (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }

  return (data || []).map(item => item.user_id);
}

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  isInWishlist,
  getWishlistItem,
  getWishlistCount,
  toggleWishlist,
  getPriceDrops,
  checkAndNotifyPriceDrops,
  clearWishlist,
  getUsersWithProductInWishlist,
};
