/**
 * Shipper Service
 * Business logic for shipper operations
 * 
 * Requirements: 4 (Shipper Management)
 */

const shipperRepository = require('./shipper.repository');
const { AppError, ValidationError } = require('../../shared/utils/error.util');
const redisClient = require('../../shared/redis/redis.client');

// ============================================
// SHIPPER MANAGEMENT
// ============================================

/**
 * Create a new shipper profile
 * @param {string} userId - User ID
 * @param {Object} data - Shipper data
 * @returns {Promise<Object>}
 */
async function createShipper(userId, data) {
  // Check if user already has a shipper profile
  const existing = await shipperRepository.findShipperByUserId(userId);
  if (existing) {
    throw new AppError('SHIPPER_EXISTS', 'User already has a shipper profile', 400);
  }

  const shipperData = {
    user_id: userId,
    vehicle_type: data.vehicleType,
    vehicle_plate: data.vehiclePlate,
    vehicle_brand: data.vehicleBrand,
    vehicle_model: data.vehicleModel,
    id_card_number: data.idCardNumber,
    driver_license: data.driverLicense,
    working_district: data.workingDistrict,
    working_city: data.workingCity,
    max_distance_km: data.maxDistanceKm || 10,
    status: 'pending', // Requires admin approval
  };

  const shipper = await shipperRepository.createShipper(shipperData);
  return shipper;
}

/**
 * Get shipper by ID
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function getShipperById(shipperId) {
  const shipper = await shipperRepository.findShipperById(shipperId);
  if (!shipper) {
    throw new AppError('SHIPPER_NOT_FOUND', 'Shipper not found', 404);
  }
  return shipper;
}

/**
 * Get shipper by user ID
 * @param {string} userId
 * @returns {Promise<Object>}
 */
async function getShipperByUserId(userId) {
  const shipper = await shipperRepository.findShipperByUserId(userId);
  if (!shipper) {
    throw new AppError('SHIPPER_NOT_FOUND', 'Shipper profile not found', 404);
  }
  return shipper;
}

/**
 * Update shipper profile
 * @param {string} shipperId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateShipper(shipperId, updates) {
  const shipper = await getShipperById(shipperId);

  const allowedUpdates = {
    vehicle_type: updates.vehicleType,
    vehicle_plate: updates.vehiclePlate,
    vehicle_brand: updates.vehicleBrand,
    vehicle_model: updates.vehicleModel,
    working_district: updates.workingDistrict,
    working_city: updates.workingCity,
    max_distance_km: updates.maxDistanceKm,
  };

  // Remove undefined values
  Object.keys(allowedUpdates).forEach(key => {
    if (allowedUpdates[key] === undefined) {
      delete allowedUpdates[key];
    }
  });

  return shipperRepository.updateShipper(shipperId, allowedUpdates);
}

// ============================================
// ADMIN OPERATIONS
// ============================================

/**
 * Approve shipper (Admin only)
 * @param {string} shipperId
 * @param {string} adminId
 * @returns {Promise<Object>}
 */
async function approveShipper(shipperId, adminId) {
  const shipper = await getShipperById(shipperId);

  if (shipper.status !== 'pending') {
    throw new AppError('INVALID_STATUS', 'Shipper is not in pending status', 400);
  }

  return shipperRepository.updateShipper(shipperId, {
    status: 'active',
    approved_at: new Date().toISOString(),
    approved_by: adminId,
  });
}

/**
 * Suspend shipper (Admin only)
 * @param {string} shipperId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
async function suspendShipper(shipperId, reason) {
  const shipper = await getShipperById(shipperId);

  // Force offline when suspended
  await updateOnlineStatus(shipperId, false);

  return shipperRepository.updateShipper(shipperId, {
    status: 'suspended',
  });
}

/**
 * Reactivate shipper (Admin only)
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function reactivateShipper(shipperId) {
  const shipper = await getShipperById(shipperId);

  if (shipper.status !== 'suspended') {
    throw new AppError('INVALID_STATUS', 'Shipper is not suspended', 400);
  }

  return shipperRepository.updateShipper(shipperId, {
    status: 'active',
  });
}

/**
 * Reject shipper application (Admin only)
 * @param {string} shipperId
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>}
 */
async function rejectShipper(shipperId, reason) {
  const shipper = await getShipperById(shipperId);

  if (shipper.status !== 'pending') {
    throw new AppError('INVALID_STATUS', 'Shipper is not in pending status', 400);
  }

  // Update shipper status to inactive (rejected)
  return shipperRepository.updateShipper(shipperId, {
    status: 'inactive',
    rejection_reason: reason,
  });
}

/**
 * Get pending shippers for approval
 * @param {Object} options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getPendingShippers(options = {}) {
  return shipperRepository.findPendingShippers(options);
}

/**
 * Get active shippers
 * @param {Object} options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getActiveShippers(options = {}) {
  return shipperRepository.findActiveShippers(options);
}

// ============================================
// ONLINE STATUS MANAGEMENT
// ============================================

/**
 * Update shipper online status
 * @param {string} shipperId
 * @param {boolean} isOnline
 * @param {Object} location - Optional {lat, lng}
 * @returns {Promise<Object>}
 */
async function updateOnlineStatus(shipperId, isOnline, location = null) {
  const shipper = await getShipperById(shipperId);

  if (shipper.status !== 'active') {
    throw new AppError('SHIPPER_NOT_ACTIVE', 'Only active shippers can go online', 400);
  }

  const result = await shipperRepository.updateOnlineStatus(shipperId, isOnline, location);

  // Update Redis cache for real-time location
  if (isOnline && location) {
    await cacheShipperLocation(shipperId, location.lat, location.lng);
  } else if (!isOnline) {
    await removeShipperLocationCache(shipperId);
  }

  return result;
}

/**
 * Go online
 * @param {string} shipperId
 * @param {Object} location - {lat, lng}
 * @returns {Promise<Object>}
 */
async function goOnline(shipperId, location) {
  if (!location || !location.lat || !location.lng) {
    throw new ValidationError('Location is required to go online');
  }
  return updateOnlineStatus(shipperId, true, location);
}

/**
 * Go offline
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function goOffline(shipperId) {
  return updateOnlineStatus(shipperId, false);
}

// ============================================
// LOCATION TRACKING
// ============================================

/**
 * Update shipper location
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object>}
 */
async function updateLocation(shipperId, lat, lng) {
  const shipper = await getShipperById(shipperId);

  if (!shipper.is_online) {
    throw new AppError('SHIPPER_OFFLINE', 'Shipper must be online to update location', 400);
  }

  // Update in database
  const result = await shipperRepository.updateLocation(shipperId, lat, lng);

  // Update in Redis for real-time tracking
  await cacheShipperLocation(shipperId, lat, lng);

  return result;
}

/**
 * Get shipper current location from cache
 * @param {string} shipperId
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
async function getShipperLocation(shipperId) {
  const cacheKey = `shipper:${shipperId}:location`;
  const cached = await redisClient.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // Fallback to database
  const shipper = await shipperRepository.findShipperById(shipperId);
  if (shipper && shipper.current_lat && shipper.current_lng) {
    return {
      lat: parseFloat(shipper.current_lat),
      lng: parseFloat(shipper.current_lng),
      updatedAt: shipper.last_location_update,
    };
  }

  return null;
}

/**
 * Find available shippers near a location
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function findNearbyShippers(lat, lng, radiusKm = 5, limit = 10) {
  return shipperRepository.findNearbyShippers(lat, lng, radiusKm, limit);
}

// ============================================
// STATISTICS
// ============================================

/**
 * Update shipper rating
 * @param {string} shipperId
 * @param {number} rating - 1-5
 * @returns {Promise<Object>}
 */
async function updateRating(shipperId, rating) {
  const shipper = await getShipperById(shipperId);

  const totalRatings = (shipper.total_ratings || 0) + 1;
  const currentTotal = (shipper.avg_rating || 0) * (shipper.total_ratings || 0);
  const newAvgRating = (currentTotal + rating) / totalRatings;

  return shipperRepository.updateStatistics(shipperId, {
    avg_rating: Math.round(newAvgRating * 10) / 10, // Round to 1 decimal
    total_ratings: totalRatings,
  });
}

/**
 * Record delivery completion
 * @param {string} shipperId
 * @param {boolean} successful
 * @returns {Promise<Object>}
 */
async function recordDelivery(shipperId, successful) {
  return shipperRepository.incrementDeliveryCount(shipperId, successful);
}

// ============================================
// REDIS CACHE HELPERS
// ============================================

async function cacheShipperLocation(shipperId, lat, lng) {
  const cacheKey = `shipper:${shipperId}:location`;
  const data = JSON.stringify({
    lat,
    lng,
    updatedAt: new Date().toISOString(),
  });
  await redisClient.set(cacheKey, data, 'EX', 300); // 5 minutes TTL
}

async function removeShipperLocationCache(shipperId) {
  const cacheKey = `shipper:${shipperId}:location`;
  await redisClient.del(cacheKey);
}

/**
 * Get flagged shippers for admin review
 * Requirements: 15.4 - Flag shipper when rating falls below 3.5
 * 
 * @param {Object} options - Pagination options
 * @returns {Promise<{data: Object[], count: number}>}
 */
async function getFlaggedShippers(options = {}) {
  return shipperRepository.findFlaggedShippers(options);
}

/**
 * Clear shipper flag after admin review
 * @param {string} shipperId
 * @returns {Promise<Object>}
 */
async function clearShipperFlag(shipperId) {
  const shipper = await getShipperById(shipperId);
  if (!shipper.is_flagged) {
    throw new AppError('NOT_FLAGGED', 'Shipper is not flagged', 400);
  }
  return shipperRepository.clearShipperFlag(shipperId);
}

module.exports = {
  // Shipper management
  createShipper,
  getShipperById,
  getShipperByUserId,
  updateShipper,

  // Admin operations
  approveShipper,
  rejectShipper,
  suspendShipper,
  reactivateShipper,
  getPendingShippers,
  getActiveShippers,
  getFlaggedShippers,
  clearShipperFlag,

  // Online status
  updateOnlineStatus,
  goOnline,
  goOffline,

  // Location
  updateLocation,
  getShipperLocation,
  findNearbyShippers,

  // Statistics
  updateRating,
  recordDelivery,
};
