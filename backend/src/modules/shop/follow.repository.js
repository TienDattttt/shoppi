/**
 * Follow Repository
 * Data access layer for follow operations between customers and shops
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// ============================================
// FOLLOW CRUD OPERATIONS
// ============================================

/**
 * Create a follow relationship
 * @param {string} userId - Customer user ID
 * @param {string} shopId - Shop ID to follow
 * @returns {Promise<object>} Created follow record
 */
async function createFollow(userId, shopId) {
  const { data, error } = await supabaseAdmin
    .from('follows')
    .insert({
      id: uuidv4(),
      user_id: userId,
      shop_id: shopId,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new Error('ALREADY_FOLLOWING');
    }
    throw new Error(`Failed to create follow: ${error.message}`);
  }

  return data;
}

/**
 * Delete a follow relationship
 * @param {string} userId - Customer user ID
 * @param {string} shopId - Shop ID to unfollow
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteFollow(userId, shopId) {
  const { data, error } = await supabaseAdmin
    .from('follows')
    .delete()
    .eq('user_id', userId)
    .eq('shop_id', shopId)
    .select();

  if (error) {
    throw new Error(`Failed to delete follow: ${error.message}`);
  }

  return data && data.length > 0;
}

/**
 * Find a specific follow relationship
 * @param {string} userId - Customer user ID
 * @param {string} shopId - Shop ID
 * @returns {Promise<object|null>} Follow record or null
 */
async function findFollow(userId, shopId) {
  const { data, error } = await supabaseAdmin
    .from('follows')
    .select('*')
    .eq('user_id', userId)
    .eq('shop_id', shopId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find follow: ${error.message}`);
  }

  return data || null;
}


// ============================================
// COUNT OPERATIONS
// ============================================

/**
 * Get follower count for a shop
 * @param {string} shopId - Shop ID
 * @returns {Promise<number>} Follower count
 */
async function getFollowerCount(shopId) {
  const { count, error } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shopId);

  if (error) {
    throw new Error(`Failed to get follower count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get following count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Following count
 */
async function getFollowingCount(userId) {
  const { count, error } = await supabaseAdmin
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get following count: ${error.message}`);
  }

  return count || 0;
}

// ============================================
// LIST OPERATIONS
// ============================================

/**
 * Get shops followed by a user
 * @param {string} userId - Customer user ID
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getFollowedShops(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // First get the follow records with shop data
  const { data, error, count } = await supabaseAdmin
    .from('follows')
    .select(`
      id,
      created_at,
      shop:shops (
        id,
        shop_name,
        slug,
        description,
        logo_url,
        banner_url,
        follower_count,
        product_count,
        avg_rating,
        review_count,
        status
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get followed shops: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get followers of a shop
 * @param {string} shopId - Shop ID
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getShopFollowers(shopId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('follows')
    .select(`
      id,
      created_at,
      user:users (
        id,
        full_name,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get shop followers: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get all user IDs following a shop (for notifications)
 * @param {string} shopId - Shop ID
 * @returns {Promise<string[]>} Array of user IDs
 */
async function getFollowerUserIds(shopId) {
  const { data, error } = await supabaseAdmin
    .from('follows')
    .select('user_id')
    .eq('shop_id', shopId);

  if (error) {
    throw new Error(`Failed to get follower user IDs: ${error.message}`);
  }

  return (data || []).map(f => f.user_id);
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Check if user follows multiple shops
 * @param {string} userId - User ID
 * @param {string[]} shopIds - Array of shop IDs
 * @returns {Promise<object>} Map of shopId -> boolean
 */
async function checkFollowingMultiple(userId, shopIds) {
  if (!shopIds || shopIds.length === 0) {
    return {};
  }

  const { data, error } = await supabaseAdmin
    .from('follows')
    .select('shop_id')
    .eq('user_id', userId)
    .in('shop_id', shopIds);

  if (error) {
    throw new Error(`Failed to check following: ${error.message}`);
  }

  const followingSet = new Set((data || []).map(f => f.shop_id));
  const result = {};
  shopIds.forEach(shopId => {
    result[shopId] = followingSet.has(shopId);
  });

  return result;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // CRUD operations
  createFollow,
  deleteFollow,
  findFollow,
  
  // Count operations
  getFollowerCount,
  getFollowingCount,
  
  // List operations
  getFollowedShops,
  getShopFollowers,
  getFollowerUserIds,
  
  // Bulk operations
  checkFollowingMultiple,
};
