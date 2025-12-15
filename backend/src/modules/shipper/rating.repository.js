/**
 * Rating Repository
 * Data access layer for shipper rating operations
 * 
 * Requirements: 15.1, 15.2 (Shipper Rating System)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new rating
 * @param {Object} data - Rating data
 * @param {string} data.shipmentId - Shipment ID
 * @param {string} data.shipperId - Shipper ID
 * @param {string} data.customerId - Customer ID
 * @param {number} data.rating - Rating (1-5)
 * @param {string} [data.comment] - Optional comment
 * @returns {Promise<Object>}
 */
async function createRating(data) {
  const { data: rating, error } = await supabaseAdmin
    .from('shipper_ratings')
    .insert({
      id: uuidv4(),
      shipment_id: data.shipmentId,
      shipper_id: data.shipperId,
      customer_id: data.customerId,
      rating: data.rating,
      comment: data.comment || null,
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation (already rated)
    if (error.code === '23505') {
      throw new Error('ALREADY_RATED');
    }
    throw new Error(`Failed to create rating: ${error.message}`);
  }

  return rating;
}

/**
 * Find rating by shipment ID
 * @param {string} shipmentId
 * @returns {Promise<Object|null>}
 */
async function findByShipmentId(shipmentId) {
  const { data, error } = await supabaseAdmin
    .from('shipper_ratings')
    .select('*')
    .eq('shipment_id', shipmentId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find rating: ${error.message}`);
  }

  return data || null;
}

/**
 * Find ratings by shipper ID
 * @param {string} shipperId
 * @param {Object} options - Pagination options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function findByShipperId(shipperId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('shipper_ratings')
    .select(`
      *,
      customer:users!shipper_ratings_customer_id_fkey(id, full_name, avatar_url)
    `, { count: 'exact' })
    .eq('shipper_id', shipperId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find ratings: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get shipper rating statistics
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function getShipperRatingStats(shipperId) {
  const { data, error } = await supabaseAdmin
    .from('shipper_ratings')
    .select('rating')
    .eq('shipper_id', shipperId);

  if (error) {
    throw new Error(`Failed to get rating stats: ${error.message}`);
  }

  const ratings = data || [];
  const totalRatings = ratings.length;
  
  if (totalRatings === 0) {
    return {
      avgRating: 0,
      totalRatings: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = Math.round((sum / totalRatings) * 10) / 10;

  // Calculate distribution
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(r => {
    distribution[r.rating]++;
  });

  return {
    avgRating,
    totalRatings,
    distribution,
  };
}

/**
 * Update rating
 * @param {string} ratingId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateRating(ratingId, updates) {
  const { data, error } = await supabaseAdmin
    .from('shipper_ratings')
    .update(updates)
    .eq('id', ratingId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update rating: ${error.message}`);
  }

  return data;
}

/**
 * Delete rating
 * @param {string} ratingId
 * @returns {Promise<void>}
 */
async function deleteRating(ratingId) {
  const { error } = await supabaseAdmin
    .from('shipper_ratings')
    .delete()
    .eq('id', ratingId);

  if (error) {
    throw new Error(`Failed to delete rating: ${error.message}`);
  }
}

module.exports = {
  createRating,
  findByShipmentId,
  findByShipperId,
  getShipperRatingStats,
  updateRating,
  deleteRating,
};
