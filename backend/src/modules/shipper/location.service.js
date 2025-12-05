/**
 * Location Service
 * Real-time location tracking for shippers
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Tracking)
 */

const shipperRepository = require('./shipper.repository');
const redisClient = require('../../shared/redis/redis.client');
const cassandraClient = require('../../shared/cassandra/cassandra.client');
const { AppError } = require('../../shared/utils/error.util');

// Redis key prefixes
const LOCATION_KEY_PREFIX = 'shipper:location:';
const LOCATION_TTL = 300; // 5 minutes

// ============================================
// REAL-TIME LOCATION (REDIS)
// ============================================

/**
 * Update shipper's current location
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>}
 */
async function updateLocation(shipperId, lat, lng, metadata = {}) {
  const timestamp = new Date().toISOString();
  
  const locationData = {
    shipperId,
    lat,
    lng,
    accuracy: metadata.accuracy,
    speed: metadata.speed,
    heading: metadata.heading,
    timestamp,
  };

  // Update in Redis for real-time access
  await setCurrentLocation(shipperId, locationData);

  // Update in database (less frequent)
  await shipperRepository.updateLocation(shipperId, lat, lng);

  // Log to Cassandra for history (async, don't wait)
  logLocationHistory(shipperId, lat, lng, metadata).catch(err => {
    console.error('Failed to log location history:', err.message);
  });

  return locationData;
}

/**
 * Set current location in Redis
 * @param {string} shipperId
 * @param {Object} locationData
 */
async function setCurrentLocation(shipperId, locationData) {
  const key = `${LOCATION_KEY_PREFIX}${shipperId}`;
  await redisClient.set(key, JSON.stringify(locationData), 'EX', LOCATION_TTL);
  
  // Also add to geo index for nearby queries
  await addToGeoIndex(shipperId, locationData.lat, locationData.lng);
}

/**
 * Get shipper's current location from Redis
 * @param {string} shipperId
 * @returns {Promise<Object|null>}
 */
async function getCurrentLocation(shipperId) {
  const key = `${LOCATION_KEY_PREFIX}${shipperId}`;
  const data = await redisClient.get(key);
  
  if (data) {
    return JSON.parse(data);
  }

  // Fallback to database
  const shipper = await shipperRepository.findShipperById(shipperId);
  if (shipper && shipper.current_lat && shipper.current_lng) {
    return {
      shipperId,
      lat: parseFloat(shipper.current_lat),
      lng: parseFloat(shipper.current_lng),
      timestamp: shipper.last_location_update,
      source: 'database',
    };
  }

  return null;
}

/**
 * Remove shipper location from cache (when going offline)
 * @param {string} shipperId
 */
async function removeCurrentLocation(shipperId) {
  const key = `${LOCATION_KEY_PREFIX}${shipperId}`;
  await redisClient.del(key);
  await removeFromGeoIndex(shipperId);
}

// ============================================
// GEO INDEX (REDIS GEO)
// ============================================

const GEO_INDEX_KEY = 'shipper:geo:locations';

/**
 * Add shipper to geo index
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 */
async function addToGeoIndex(shipperId, lat, lng) {
  try {
    await redisClient.geoadd(GEO_INDEX_KEY, lng, lat, shipperId);
  } catch (error) {
    console.error('Failed to add to geo index:', error.message);
  }
}

/**
 * Remove shipper from geo index
 * @param {string} shipperId
 */
async function removeFromGeoIndex(shipperId) {
  try {
    await redisClient.zrem(GEO_INDEX_KEY, shipperId);
  } catch (error) {
    console.error('Failed to remove from geo index:', error.message);
  }
}

/**
 * Find shippers within radius using Redis GEO
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function findNearbyShippersGeo(lat, lng, radiusKm = 5, limit = 10) {
  try {
    // GEORADIUS returns members within radius
    const results = await redisClient.georadius(
      GEO_INDEX_KEY,
      lng,
      lat,
      radiusKm,
      'km',
      'WITHDIST',
      'WITHCOORD',
      'ASC',
      'COUNT',
      limit
    );

    if (!results || results.length === 0) {
      return [];
    }

    // Parse results: [memberId, distance, [lng, lat]]
    return results.map(result => ({
      shipperId: result[0],
      distanceKm: parseFloat(result[1]),
      lng: parseFloat(result[2][0]),
      lat: parseFloat(result[2][1]),
    }));
  } catch (error) {
    console.error('Geo search failed, falling back to database:', error.message);
    // Fallback to database query
    return shipperRepository.findNearbyShippers(lat, lng, radiusKm, limit);
  }
}

/**
 * Get distance between shipper and a point
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<number|null>} Distance in km
 */
async function getDistanceToPoint(shipperId, lat, lng) {
  try {
    // Add temporary point
    const tempKey = `temp:${Date.now()}`;
    await redisClient.geoadd(GEO_INDEX_KEY, lng, lat, tempKey);
    
    // Get distance
    const distance = await redisClient.geodist(GEO_INDEX_KEY, shipperId, tempKey, 'km');
    
    // Remove temporary point
    await redisClient.zrem(GEO_INDEX_KEY, tempKey);
    
    return distance ? parseFloat(distance) : null;
  } catch (error) {
    console.error('Failed to calculate distance:', error.message);
    return null;
  }
}

// ============================================
// LOCATION HISTORY (CASSANDRA)
// ============================================

/**
 * Log location to Cassandra for history
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 * @param {Object} metadata
 */
async function logLocationHistory(shipperId, lat, lng, metadata = {}) {
  try {
    await cassandraClient.logShipperLocation(shipperId, {
      lat,
      lng,
      accuracy: metadata.accuracy,
      speed: metadata.speed,
      heading: metadata.heading,
      shipmentId: metadata.shipmentId,
    });
  } catch (error) {
    // Log but don't throw - history logging is not critical
    console.error('Failed to log location to Cassandra:', error.message);
  }
}

/**
 * Get location history for a shipper
 * @param {string} shipperId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function getLocationHistory(shipperId, startTime, endTime, limit = 100) {
  try {
    return await cassandraClient.getShipperLocationHistory(
      shipperId,
      startTime,
      endTime,
      limit
    );
  } catch (error) {
    console.error('Failed to get location history:', error.message);
    return [];
  }
}

/**
 * Get location history for a shipment
 * @param {string} shipmentId
 * @param {string} shipperId
 * @returns {Promise<Object[]>}
 */
async function getShipmentLocationHistory(shipmentId, shipperId) {
  try {
    return await cassandraClient.getShipmentLocationHistory(shipmentId, shipperId);
  } catch (error) {
    console.error('Failed to get shipment location history:', error.message);
    return [];
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Get locations for multiple shippers
 * @param {string[]} shipperIds
 * @returns {Promise<Object>} Map of shipperId to location
 */
async function getMultipleLocations(shipperIds) {
  const locations = {};
  
  // Use Redis pipeline for efficiency
  const pipeline = redisClient.pipeline();
  shipperIds.forEach(id => {
    pipeline.get(`${LOCATION_KEY_PREFIX}${id}`);
  });
  
  const results = await pipeline.exec();
  
  results.forEach((result, index) => {
    const [err, data] = result;
    if (!err && data) {
      locations[shipperIds[index]] = JSON.parse(data);
    }
  });
  
  return locations;
}

/**
 * Broadcast location update (for real-time tracking)
 * @param {string} shipperId
 * @param {Object} locationData
 * @param {string[]} subscriberIds - User IDs to notify
 */
async function broadcastLocationUpdate(shipperId, locationData, subscriberIds = []) {
  // This would integrate with Supabase Realtime or WebSocket
  // For now, just publish to Redis pub/sub
  try {
    const channel = `shipper:${shipperId}:location`;
    await redisClient.publish(channel, JSON.stringify(locationData));
  } catch (error) {
    console.error('Failed to broadcast location:', error.message);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate distance between two points (Haversine formula)
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in km
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * Math.PI / 180;
}

/**
 * Estimate travel time based on distance
 * @param {number} distanceKm
 * @param {string} vehicleType
 * @returns {number} Estimated minutes
 */
function estimateTravelTime(distanceKm, vehicleType = 'motorbike') {
  // Average speeds in km/h
  const speeds = {
    bicycle: 15,
    motorbike: 30,
    car: 25, // Lower due to traffic
    truck: 20,
  };
  
  const speed = speeds[vehicleType] || 25;
  return Math.ceil((distanceKm / speed) * 60);
}

module.exports = {
  // Real-time location
  updateLocation,
  getCurrentLocation,
  removeCurrentLocation,
  
  // Geo queries
  findNearbyShippersGeo,
  getDistanceToPoint,
  
  // History
  logLocationHistory,
  getLocationHistory,
  getShipmentLocationHistory,
  
  // Batch operations
  getMultipleLocations,
  broadcastLocationUpdate,
  
  // Utilities
  calculateDistance,
  estimateTravelTime,
};
