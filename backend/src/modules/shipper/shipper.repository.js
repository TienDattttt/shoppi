/**
 * Shipper Repository
 * Data access layer for shipper operations
 * 
 * Requirements: 4 (Shipper Management)
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// ============================================
// SHIPPER CRUD OPERATIONS
// ============================================

/**
 * Create a new shipper
 * @param {Object} data - Shipper data
 * @returns {Promise<Object>}
 */
async function createShipper(data) {
  const { data: shipper, error } = await supabaseAdmin
    .from('shippers')
    .insert({
      id: uuidv4(),
      ...data,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create shipper: ${error.message}`);
  }

  return shipper;
}

/**
 * Find shipper by ID
 * @param {string} shipperId
 * @returns {Promise<Object|null>}
 */
async function findShipperById(shipperId) {
  const { data, error } = await supabaseAdmin
    .from('shippers')
    .select('*')
    .eq('id', shipperId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shipper: ${error.message}`);
  }

  if (!data) return null;

  // Get user info separately
  if (data.user_id) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone, email, avatar_url')
      .eq('id', data.user_id)
      .single();
    
    data.user = userData || null;
  }
  
  // Document URLs are now stored in shippers table directly (id_card_front_url, id_card_back_url, driver_license_url)

  return data;
}

/**
 * Find shipper by user ID
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function findShipperByUserId(userId) {
  const { data, error } = await supabaseAdmin
    .from('shippers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find shipper: ${error.message}`);
  }

  return data || null;
}

/**
 * Update shipper
 * @param {string} shipperId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateShipper(shipperId, updates) {
  const { data, error } = await supabaseAdmin
    .from('shippers')
    .update(updates)
    .eq('id', shipperId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update shipper: ${error.message}`);
  }

  return data;
}

/**
 * Find pending shippers for admin approval
 * @param {Object} options - Pagination options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function findPendingShippers(options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('shippers')
    .select('*', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find pending shippers: ${error.message}`);
  }

  // Get user info for each shipper
  // Document URLs are stored in shippers table directly
  const shippersWithUsers = await Promise.all((data || []).map(async (shipper) => {
    if (shipper.user_id) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, full_name, phone, email, avatar_url')
        .eq('id', shipper.user_id)
        .single();
      shipper.user = userData || null;
    }
    return shipper;
  }));

  return { data: shippersWithUsers, count: count || 0 };
}

/**
 * Find active shippers
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function findActiveShippers(options = {}) {
  const { page = 1, limit = 20, onlineOnly = false } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('shippers')
    .select('*', { count: 'exact' })
    .eq('status', 'active');

  if (onlineOnly) {
    query = query.eq('is_online', true);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find active shippers: ${error.message}`);
  }

  // Get user info for each shipper
  const shippersWithUsers = await Promise.all((data || []).map(async (shipper) => {
    if (shipper.user_id) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, full_name, phone, avatar_url')
        .eq('id', shipper.user_id)
        .single();
      shipper.user = userData || null;
    }
    return shipper;
  }));

  return { data: shippersWithUsers, count: count || 0 };
}

// ============================================
// LOCATION OPERATIONS
// ============================================

/**
 * Update shipper location
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object>}
 */
async function updateLocation(shipperId, lat, lng) {
  const { data, error } = await supabaseAdmin
    .from('shippers')
    .update({
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
    })
    .eq('id', shipperId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update location: ${error.message}`);
  }

  return data;
}

/**
 * Update shipper online status
 * @param {string} shipperId
 * @param {boolean} isOnline
 * @param {Object} location - Optional location {lat, lng}
 * @returns {Promise<Object>}
 */
async function updateOnlineStatus(shipperId, isOnline, location = null) {
  const updates = {
    is_online: isOnline,
  };

  if (location) {
    updates.current_lat = location.lat;
    updates.current_lng = location.lng;
    updates.last_location_update = new Date().toISOString();
  }

  if (!isOnline) {
    updates.is_available = true; // Reset availability when going offline
  }

  const { data, error } = await supabaseAdmin
    .from('shippers')
    .update(updates)
    .eq('id', shipperId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update online status: ${error.message}`);
  }

  return data;
}

/**
 * Find nearby online shippers
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @param {number} limit - Max results
 * @returns {Promise<Object[]>}
 */
async function findNearbyShippers(lat, lng, radiusKm = 5, limit = 10) {
  // Using Haversine formula approximation
  // 1 degree latitude ≈ 111 km
  // 1 degree longitude ≈ 111 * cos(lat) km
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  const { data, error } = await supabaseAdmin
    .from('shippers')
    .select('*')
    .eq('status', 'active')
    .eq('is_online', true)
    .eq('is_available', true)
    .gte('current_lat', lat - latDelta)
    .lte('current_lat', lat + latDelta)
    .gte('current_lng', lng - lngDelta)
    .lte('current_lng', lng + lngDelta)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to find nearby shippers: ${error.message}`);
  }

  // Get user info and calculate distance
  const shippersWithDistance = await Promise.all((data || []).map(async (shipper) => {
    const distance = calculateDistance(lat, lng, shipper.current_lat, shipper.current_lng);
    
    if (shipper.user_id) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, full_name, phone, avatar_url')
        .eq('id', shipper.user_id)
        .single();
      shipper.user = userData || null;
    }
    
    return { ...shipper, distance_km: distance };
  }));

  return shippersWithDistance
    .filter(s => s.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// STATISTICS OPERATIONS
// ============================================

/**
 * Update shipper statistics
 * @param {string} shipperId
 * @param {Object} stats - Statistics to update
 * @returns {Promise<Object>}
 */
async function updateStatistics(shipperId, stats) {
  const { data, error } = await supabaseAdmin
    .from('shippers')
    .update(stats)
    .eq('id', shipperId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update statistics: ${error.message}`);
  }

  return data;
}

/**
 * Increment delivery count
 * @param {string} shipperId
 * @param {boolean} successful
 * @returns {Promise<Object>}
 */
async function incrementDeliveryCount(shipperId, successful) {
  const shipper = await findShipperById(shipperId);
  if (!shipper) {
    throw new Error('Shipper not found');
  }

  const updates = {
    total_deliveries: (shipper.total_deliveries || 0) + 1,
  };

  if (successful) {
    updates.successful_deliveries = (shipper.successful_deliveries || 0) + 1;
  } else {
    updates.failed_deliveries = (shipper.failed_deliveries || 0) + 1;
  }

  return updateShipper(shipperId, updates);
}

// ============================================
// COD OPERATIONS (Requirements: 6.3, 6.4)
// ============================================

/**
 * Update shipper's daily COD balance
 * Requirements: 6.3 - Record COD collection and update shipper's daily COD balance
 * 
 * @param {string} shipperId
 * @param {number} codAmount - COD amount collected
 * @returns {Promise<Object>}
 */
async function updateDailyCodBalance(shipperId, codAmount) {
  const shipper = await findShipperById(shipperId);
  if (!shipper) {
    throw new Error('Shipper not found');
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const lastCodDate = shipper.daily_cod_collected_at;
  
  // Reset daily COD if it's a new day
  let currentDailyCod = parseFloat(shipper.daily_cod_collected || 0);
  if (lastCodDate !== today) {
    currentDailyCod = 0;
  }

  const newDailyCod = currentDailyCod + parseFloat(codAmount);

  const updates = {
    daily_cod_collected: newDailyCod,
    daily_cod_collected_at: today,
  };

  return updateShipper(shipperId, updates);
}

/**
 * Get shipper's daily COD balance
 * Requirements: 6.4 - Display total COD collected for reconciliation
 * 
 * @param {string} shipperId
 * @returns {Promise<{dailyCodCollected: number, date: string}>}
 */
async function getDailyCodBalance(shipperId) {
  const shipper = await findShipperById(shipperId);
  if (!shipper) {
    throw new Error('Shipper not found');
  }

  const today = new Date().toISOString().split('T')[0];
  const lastCodDate = shipper.daily_cod_collected_at;
  
  // If last COD date is not today, balance is 0
  if (lastCodDate !== today) {
    return {
      dailyCodCollected: 0,
      date: today,
    };
  }

  return {
    dailyCodCollected: parseFloat(shipper.daily_cod_collected || 0),
    date: lastCodDate,
  };
}

/**
 * Find flagged shippers for admin review
 * Requirements: 15.4 - Flag shipper when rating falls below 3.5
 * 
 * @param {Object} options - Pagination options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function findFlaggedShippers(options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('shippers')
    .select('*', { count: 'exact' })
    .eq('is_flagged', true)
    .order('flagged_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find flagged shippers: ${error.message}`);
  }

  // Get user info for each shipper
  const shippersWithUsers = await Promise.all((data || []).map(async (shipper) => {
    if (shipper.user_id) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id, full_name, phone, email, avatar_url')
        .eq('id', shipper.user_id)
        .single();
      shipper.user = userData || null;
    }
    return shipper;
  }));

  return { data: shippersWithUsers, count: count || 0 };
}

/**
 * Clear shipper flag (after admin review)
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function clearShipperFlag(shipperId) {
  const { data, error } = await supabaseAdmin
    .from('shippers')
    .update({
      is_flagged: false,
      flagged_reason: null,
      flagged_at: null,
    })
    .eq('id', shipperId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to clear shipper flag: ${error.message}`);
  }

  return data;
}

module.exports = {
  // CRUD
  createShipper,
  findShipperById,
  findShipperByUserId,
  updateShipper,
  findPendingShippers,
  findActiveShippers,
  
  // Location
  updateLocation,
  updateOnlineStatus,
  findNearbyShippers,
  calculateDistance,
  
  // Statistics
  updateStatistics,
  incrementDeliveryCount,
  
  // COD
  updateDailyCodBalance,
  getDailyCodBalance,
  
  // Flagging
  findFlaggedShippers,
  clearShipperFlag,
};
