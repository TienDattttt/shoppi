/**
 * Shop Repository
 * Data access layer for shop operations
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// ============================================
// SHOP CRUD OPERATIONS
// ============================================

/**
 * Create a new shop
 * @param {object} shopData
 * @returns {Promise<object>} Created shop
 */
async function createShop(shopData) {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .insert({
      id: shopData.id || uuidv4(),
      partner_id: shopData.partner_id,
      shop_name: shopData.shop_name,
      slug: shopData.slug,
      description: shopData.description,
      phone: shopData.phone,
      email: shopData.email,
      address: shopData.address,
      city: shopData.city,
      district: shopData.district,
      ward: shopData.ward,
      lat: shopData.lat,
      lng: shopData.lng,
      logo_url: shopData.logo_url,
      banner_url: shopData.banner_url,
      operating_hours: shopData.operating_hours,
      category_ids: shopData.category_ids,
      status: shopData.status || 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create shop: ${error.message}`);
  }

  return data;
}

/**
 * Find shop by ID
 * @param {string} shopId
 * @returns {Promise<object|null>}
 */
async function findShopById(shopId) {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shop: ${error.message}`);
  }

  return data || null;
}


/**
 * Find shop by partner ID
 * @param {string} partnerId
 * @returns {Promise<object|null>}
 */
async function findShopByPartnerId(partnerId) {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('partner_id', partnerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shop: ${error.message}`);
  }

  return data || null;
}

/**
 * Find shop by slug
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function findShopBySlug(slug) {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shop: ${error.message}`);
  }

  return data || null;
}

/**
 * Find shop by name (case-insensitive)
 * @param {string} shopName
 * @returns {Promise<object|null>}
 */
async function findShopByName(shopName) {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .select('*')
    .ilike('shop_name', shopName)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shop: ${error.message}`);
  }

  return data || null;
}

/**
 * Update shop
 * @param {string} shopId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateShop(shopId, updateData) {
  const { data, error } = await supabaseAdmin
    .from('shops')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shopId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update shop: ${error.message}`);
  }

  return data;
}

// ============================================
// ADMIN OPERATIONS
// ============================================

/**
 * Find pending shops for admin review
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function findPendingShops(options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('shops')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find pending shops: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}


// ============================================
// PUBLIC OPERATIONS
// ============================================

/**
 * Find active shops with filters
 * @param {object} filters - Filter options
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function findActiveShops(filters = {}, options = {}) {
  const { page = 1, limit = 20 } = options;
  const { city, district, category_id, min_rating } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('shops')
    .select('*', { count: 'exact' })
    .eq('status', 'active');

  if (city) {
    query = query.eq('city', city);
  }

  if (district) {
    query = query.eq('district', district);
  }

  if (category_id) {
    query = query.contains('category_ids', [category_id]);
  }

  if (min_rating) {
    query = query.gte('avg_rating', min_rating);
  }

  query = query
    .order('avg_rating', { ascending: false })
    .order('follower_count', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to find active shops: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Search shops by name or description
 * @param {string} query - Search query
 * @param {object} filters - Additional filters
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function searchShops(searchQuery, filters = {}, options = {}) {
  const { page = 1, limit = 20 } = options;
  const { city, district, category_id, min_rating } = filters;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('shops')
    .select('*', { count: 'exact' })
    .eq('status', 'active');

  // Text search on shop_name and description
  if (searchQuery) {
    query = query.or(`shop_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  if (city) {
    query = query.eq('city', city);
  }

  if (district) {
    query = query.eq('district', district);
  }

  if (category_id) {
    query = query.contains('category_ids', [category_id]);
  }

  if (min_rating) {
    query = query.gte('avg_rating', min_rating);
  }

  query = query
    .order('avg_rating', { ascending: false })
    .order('follower_count', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to search shops: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

// ============================================
// STATISTICS OPERATIONS
// ============================================

/**
 * Update shop follower count
 * @param {string} shopId
 * @param {number} count
 * @returns {Promise<object>}
 */
async function updateFollowerCount(shopId, count) {
  return updateShop(shopId, { follower_count: count });
}

/**
 * Increment shop follower count
 * @param {string} shopId
 * @returns {Promise<object>}
 */
async function incrementFollowerCount(shopId) {
  const shop = await findShopById(shopId);
  if (!shop) {
    throw new Error('Shop not found');
  }
  return updateShop(shopId, { follower_count: (shop.follower_count || 0) + 1 });
}

/**
 * Decrement shop follower count
 * @param {string} shopId
 * @returns {Promise<object>}
 */
async function decrementFollowerCount(shopId) {
  const shop = await findShopById(shopId);
  if (!shop) {
    throw new Error('Shop not found');
  }
  return updateShop(shopId, { follower_count: Math.max(0, (shop.follower_count || 0) - 1) });
}

/**
 * Update shop product count
 * @param {string} shopId
 * @param {number} count
 * @returns {Promise<object>}
 */
async function updateProductCount(shopId, count) {
  return updateShop(shopId, { product_count: count });
}

/**
 * Update shop rating
 * @param {string} shopId
 * @param {number} avgRating
 * @param {number} reviewCount
 * @returns {Promise<object>}
 */
async function updateShopRating(shopId, avgRating, reviewCount) {
  return updateShop(shopId, {
    avg_rating: avgRating,
    review_count: reviewCount,
  });
}


// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if shop name exists (case-insensitive)
 * @param {string} shopName
 * @param {string} excludeId - Shop ID to exclude
 * @returns {Promise<boolean>}
 */
async function shopNameExists(shopName, excludeId = null) {
  let query = supabaseAdmin
    .from('shops')
    .select('id', { count: 'exact', head: true })
    .ilike('shop_name', shopName);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check shop name: ${error.message}`);
  }

  return count > 0;
}

/**
 * Check if slug exists
 * @param {string} slug
 * @param {string} excludeId - Shop ID to exclude
 * @returns {Promise<boolean>}
 */
async function slugExists(slug, excludeId = null) {
  let query = supabaseAdmin
    .from('shops')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check slug: ${error.message}`);
  }

  return count > 0;
}

/**
 * Check if partner already has a shop
 * @param {string} partnerId
 * @param {string} excludeId - Shop ID to exclude
 * @returns {Promise<boolean>}
 */
async function partnerHasShop(partnerId, excludeId = null) {
  let query = supabaseAdmin
    .from('shops')
    .select('id', { count: 'exact', head: true })
    .eq('partner_id', partnerId);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check partner shop: ${error.message}`);
  }

  return count > 0;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // CRUD operations
  createShop,
  findShopById,
  findShopByPartnerId,
  findShopBySlug,
  findShopByName,
  updateShop,
  
  // Admin operations
  findPendingShops,
  
  // Public operations
  findActiveShops,
  searchShops,
  
  // Statistics operations
  updateFollowerCount,
  incrementFollowerCount,
  decrementFollowerCount,
  updateProductCount,
  updateShopRating,
  
  // Validation helpers
  shopNameExists,
  slugExists,
  partnerHasShop,
};
