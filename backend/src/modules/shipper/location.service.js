/**
 * Location Service
 * Real-time location tracking for shippers
 * 
 * Requirements: 4.1, 4.2, 4.5 (Real-Time Location Tracking)
 * 
 * Functions:
 * - updateLocation: Store in Redis + Cassandra
 * - getShipperLocation: Get from Redis with DB fallback
 * - checkProximity: Calculate distance to delivery
 * - broadcastLocation: Publish to Supabase Realtime
 */

const shipperRepository = require('./shipper.repository');
const { getRedisClient } = require('../../shared/redis/redis.client');
const shipperTrackingRepo = require('../../shared/cassandra/shipper-tracking.cassandra.repository');
const realtimeClient = require('../../shared/supabase/realtime.client');
const { emitShipperLocation } = require('../../shared/socket/socket.service');

// Proximity threshold in meters for "shipper nearby" notification
const PROXIMITY_THRESHOLD_METERS = 500;

// Redis key prefixes
const LOCATION_KEY_PREFIX = 'shipper:location:';
const LOCATION_TTL = 300; // 5 minutes

// ============================================
// REAL-TIME LOCATION (REDIS)
// ============================================

/**
 * Update shipper's current location
 * Stores in Redis + Cassandra and checks for proximity notifications
 * 
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>}
 * 
 * Requirements: 4.1 - Update shipper location every 5 seconds
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

  // Broadcast location update for active shipments (async, don't wait)
  if (metadata.shipmentId) {
    // Broadcast via Supabase Realtime
    broadcastLocation(metadata.shipmentId, locationData).catch(err => {
      console.error('Failed to broadcast location via Supabase:', err.message);
    });
    
    // Also emit via Socket.io for real-time tracking
    emitShipperLocation(metadata.shipmentId, {
      shipperId,
      latitude: lat,
      longitude: lng,
      heading: metadata.heading,
      speed: metadata.speed,
    });
  }

  // Check and trigger proximity notifications (async, don't wait)
  // This is deferred to avoid blocking the location update response
  setImmediate(async () => {
    try {
      await checkAndTriggerProximityNotifications(shipperId, locationData);
    } catch (err) {
      console.error('Failed to check proximity notifications:', err.message);
    }
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
  const redis = await getRedisClient();
  await redis.set(key, JSON.stringify(locationData), { EX: LOCATION_TTL });
  
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
  const redis = await getRedisClient();
  const data = await redis.get(key);
  
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
  const redis = await getRedisClient();
  await redis.del(key);
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
    const redis = await getRedisClient();
    await redis.geoAdd(GEO_INDEX_KEY, { longitude: lng, latitude: lat, member: shipperId });
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
    const redis = await getRedisClient();
    await redis.zRem(GEO_INDEX_KEY, shipperId);
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
    const redis = await getRedisClient();
    // GEOSEARCH returns members within radius (Redis 6.2+)
    const results = await redis.geoSearchWith(
      GEO_INDEX_KEY,
      { longitude: lng, latitude: lat },
      { radius: radiusKm, unit: 'km' },
      ['WITHDIST', 'WITHCOORD'],
      { COUNT: limit, SORT: 'ASC' }
    );

    if (!results || results.length === 0) {
      return [];
    }

    // Parse results
    return results.map(result => ({
      shipperId: result.member,
      distanceKm: parseFloat(result.distance),
      lng: result.coordinates ? parseFloat(result.coordinates.longitude) : 0,
      lat: result.coordinates ? parseFloat(result.coordinates.latitude) : 0,
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
    const redis = await getRedisClient();
    // Add temporary point
    const tempKey = `temp:${Date.now()}`;
    await redis.geoAdd(GEO_INDEX_KEY, { longitude: lng, latitude: lat, member: tempKey });
    
    // Get distance
    const distance = await redis.geoDist(GEO_INDEX_KEY, shipperId, tempKey, 'km');
    
    // Remove temporary point
    await redis.zRem(GEO_INDEX_KEY, tempKey);
    
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
    await shipperTrackingRepo.saveLocation({
      shipperId,
      lat,
      lng,
      accuracy: metadata.accuracy,
      speed: metadata.speed,
      heading: metadata.heading,
      shipmentId: metadata.shipmentId,
      eventType: 'location_update',
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
    // Get date from startTime for partition key
    const date = startTime ? startTime.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    return await shipperTrackingRepo.getLocationHistory(shipperId, date, {
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
      limit,
    });
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
    const date = new Date().toISOString().split('T')[0];
    return await shipperTrackingRepo.getShipmentRoute(shipperId, shipmentId, date);
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
  const redis = await getRedisClient();
  
  // Use Redis multi for efficiency
  const multi = redis.multi();
  shipperIds.forEach(id => {
    multi.get(`${LOCATION_KEY_PREFIX}${id}`);
  });
  
  const results = await multi.exec();
  
  results.forEach((data, index) => {
    if (data) {
      locations[shipperIds[index]] = JSON.parse(data);
    }
  });
  
  return locations;
}

/**
 * Broadcast location update via Supabase Realtime
 * @param {string} shipmentId - Shipment ID for the channel
 * @param {Object} locationData - Location data to broadcast
 * @returns {Promise<boolean>}
 * 
 * Requirements: 4.2 - Real-time location updates via Supabase Realtime
 */
async function broadcastLocation(shipmentId, locationData) {
  try {
    // Create or get the broadcast channel for this shipment
    const channelName = `shipment:${shipmentId}:location`;
    
    // Ensure channel exists
    realtimeClient.createBroadcastChannel(channelName, () => {
      // No-op callback for server-side - we're just broadcasting
    });
    
    // Broadcast the location update
    await realtimeClient.broadcast(channelName, 'location_update', {
      shipmentId,
      lat: locationData.lat,
      lng: locationData.lng,
      heading: locationData.heading,
      speed: locationData.speed,
      accuracy: locationData.accuracy,
      timestamp: locationData.timestamp || new Date().toISOString(),
    });
    
    return true;
  } catch (error) {
    console.error('Failed to broadcast location via Supabase:', error.message);
    
    // Fallback to Redis pub/sub
    try {
      const redis = await getRedisClient();
      const channel = `shipment:${shipmentId}:location`;
      await redis.publish(channel, JSON.stringify(locationData));
    } catch (redisError) {
      console.error('Failed to broadcast location via Redis:', redisError.message);
    }
    
    return false;
  }
}

/**
 * Legacy broadcast function for backward compatibility
 * @deprecated Use broadcastLocation instead
 */
async function broadcastLocationUpdate(shipperId, locationData, subscriberIds = []) {
  // This is kept for backward compatibility
  // For shipment-specific broadcasts, use broadcastLocation
  try {
    const redis = await getRedisClient();
    const channel = `shipper:${shipperId}:location`;
    await redis.publish(channel, JSON.stringify(locationData));
  } catch (error) {
    console.error('Failed to broadcast location:', error.message);
  }
}

// ============================================
// PROXIMITY CHECKING
// ============================================

/**
 * Check if shipper is within proximity of delivery address
 * @param {string} shipperId - Shipper ID
 * @param {number} deliveryLat - Delivery latitude
 * @param {number} deliveryLng - Delivery longitude
 * @returns {Promise<{isNearby: boolean, distanceMeters: number, distanceKm: number}>}
 * 
 * Requirements: 4.5 - Check if shipper within 500m of delivery
 */
async function checkProximity(shipperId, deliveryLat, deliveryLng) {
  // Get shipper's current location
  const location = await getShipperLocation(shipperId);
  
  if (!location) {
    return {
      isNearby: false,
      distanceMeters: null,
      distanceKm: null,
      error: 'Shipper location not available',
    };
  }
  
  // Calculate distance
  const distanceKm = calculateDistance(
    location.lat,
    location.lng,
    deliveryLat,
    deliveryLng
  );
  
  const distanceMeters = distanceKm * 1000;
  const isNearby = distanceMeters <= PROXIMITY_THRESHOLD_METERS;
  
  return {
    isNearby,
    distanceMeters: Math.round(distanceMeters),
    distanceKm: Math.round(distanceKm * 100) / 100,
    shipperLocation: {
      lat: location.lat,
      lng: location.lng,
    },
    deliveryLocation: {
      lat: deliveryLat,
      lng: deliveryLng,
    },
  };
}

/**
 * Check proximity for a shipment and return detailed info
 * @param {string} shipperId - Shipper ID
 * @param {Object} shipment - Shipment object with delivery coordinates
 * @returns {Promise<Object>}
 */
async function checkShipmentProximity(shipperId, shipment) {
  if (!shipment.delivery_lat || !shipment.delivery_lng) {
    return {
      isNearby: false,
      error: 'Delivery coordinates not available',
    };
  }
  
  const result = await checkProximity(
    shipperId,
    parseFloat(shipment.delivery_lat),
    parseFloat(shipment.delivery_lng)
  );
  
  return {
    ...result,
    shipmentId: shipment.id,
    trackingNumber: shipment.tracking_number,
    deliveryAddress: shipment.delivery_address,
  };
}

// ============================================
// PROXIMITY NOTIFICATION TRIGGER
// ============================================

// Redis key prefix for tracking sent proximity notifications
const PROXIMITY_NOTIFICATION_PREFIX = 'proximity:notified:';
const PROXIMITY_NOTIFICATION_TTL = 86400; // 24 hours

/**
 * Check if proximity notification was already sent for a shipment
 * @param {string} shipmentId
 * @returns {Promise<boolean>}
 */
async function wasProximityNotificationSent(shipmentId) {
  try {
    const redis = await getRedisClient();
    const key = `${PROXIMITY_NOTIFICATION_PREFIX}${shipmentId}`;
    const result = await redis.get(key);
    return result !== null;
  } catch (error) {
    console.error('Failed to check proximity notification status:', error.message);
    return false;
  }
}

/**
 * Mark proximity notification as sent for a shipment
 * @param {string} shipmentId
 * @returns {Promise<boolean>}
 */
async function markProximityNotificationSent(shipmentId) {
  try {
    const redis = await getRedisClient();
    const key = `${PROXIMITY_NOTIFICATION_PREFIX}${shipmentId}`;
    await redis.set(key, new Date().toISOString(), { EX: PROXIMITY_NOTIFICATION_TTL });
    return true;
  } catch (error) {
    console.error('Failed to mark proximity notification as sent:', error.message);
    return false;
  }
}

/**
 * Trigger proximity notification if shipper is within 500m of delivery
 * and notification hasn't been sent yet
 * 
 * @param {string} shipperId - Shipper ID
 * @param {Object} shipment - Shipment object with delivery coordinates and customer info
 * @param {Object} options - Additional options
 * @returns {Promise<{triggered: boolean, reason: string}>}
 * 
 * Requirements: 4.5 - Send "Shipper nearby" notification when within 500m
 */
async function triggerProximityNotification(shipperId, shipment, options = {}) {
  const shipmentId = shipment.id;
  
  // 1. Check if notification was already sent
  const alreadySent = await wasProximityNotificationSent(shipmentId);
  if (alreadySent) {
    return {
      triggered: false,
      reason: 'Notification already sent for this shipment',
    };
  }
  
  // 2. Check proximity
  const proximityResult = await checkShipmentProximity(shipperId, shipment);
  
  if (proximityResult.error) {
    return {
      triggered: false,
      reason: proximityResult.error,
    };
  }
  
  if (!proximityResult.isNearby) {
    return {
      triggered: false,
      reason: `Shipper is ${proximityResult.distanceMeters}m away (threshold: ${PROXIMITY_THRESHOLD_METERS}m)`,
      distanceMeters: proximityResult.distanceMeters,
    };
  }
  
  // 3. Shipper is nearby - send notification
  try {
    const rabbitmqClient = require('../../shared/rabbitmq/rabbitmq.client');
    
    // Publish SHIPPER_NEARBY event
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'SHIPPER_NEARBY',
      {
        event: 'SHIPPER_NEARBY',
        data: {
          shipmentId,
          trackingNumber: shipment.tracking_number,
          shipperId,
          customerId: shipment.customer_id || options.customerId,
          distanceMeters: proximityResult.distanceMeters,
          shipperLocation: proximityResult.shipperLocation,
          deliveryAddress: shipment.delivery_address,
        },
        timestamp: new Date().toISOString(),
      }
    );
    
    // Mark notification as sent
    await markProximityNotificationSent(shipmentId);
    
    console.log(`[LocationService] Proximity notification triggered for shipment ${shipmentId}`);
    
    return {
      triggered: true,
      reason: 'Shipper nearby notification sent',
      distanceMeters: proximityResult.distanceMeters,
    };
  } catch (error) {
    console.error('Failed to trigger proximity notification:', error.message);
    return {
      triggered: false,
      reason: `Failed to send notification: ${error.message}`,
    };
  }
}

/**
 * Check and trigger proximity notification for all active shipments of a shipper
 * Called when shipper location is updated
 * 
 * @param {string} shipperId - Shipper ID
 * @param {Object} locationData - Current location data
 * @returns {Promise<Object[]>} - Array of notification results
 */
async function checkAndTriggerProximityNotifications(shipperId, locationData) {
  const results = [];
  
  try {
    // Get active shipments for this shipper
    const shipmentRepository = require('./shipment.repository');
    const activeShipments = await shipmentRepository.findActiveByShipper(shipperId);
    
    // Only check shipments that are "out_for_delivery" or "delivering"
    const deliveringShipments = activeShipments.filter(
      s => s.status === 'delivering' || s.status === 'out_for_delivery'
    );
    
    for (const shipment of deliveringShipments) {
      // Get customer ID from sub_order if available
      const customerId = shipment.sub_order?.order?.customer_id;
      
      const result = await triggerProximityNotification(shipperId, shipment, { customerId });
      results.push({
        shipmentId: shipment.id,
        trackingNumber: shipment.tracking_number,
        ...result,
      });
    }
  } catch (error) {
    console.error('Failed to check proximity notifications:', error.message);
  }
  
  return results;
}

// ============================================
// SHIPPER LOCATION (REDIS + DB FALLBACK)
// ============================================

/**
 * Get shipper's current location with Redis + DB fallback
 * @param {string} shipperId
 * @returns {Promise<Object|null>}
 * 
 * Requirements: 4.2 - Get from Redis with DB fallback
 */
async function getShipperLocation(shipperId) {
  // First try Redis cache
  const cachedLocation = await getCurrentLocation(shipperId);
  
  if (cachedLocation) {
    return cachedLocation;
  }
  
  // Fallback to database
  try {
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
  } catch (error) {
    console.error('Failed to get shipper location from DB:', error.message);
  }
  
  return null;
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

/**
 * Calculate ETA with time range
 * @param {number} distanceKm
 * @param {string} vehicleType
 * @returns {Object} ETA information
 */
function calculateETARange(distanceKm, vehicleType = 'motorbike') {
  const estimatedMinutes = estimateTravelTime(distanceKm, vehicleType);
  const now = new Date();
  
  const etaStart = new Date(now.getTime() + estimatedMinutes * 60 * 1000);
  const etaEnd = new Date(etaStart.getTime() + 30 * 60 * 1000); // +30 min buffer
  
  return {
    estimatedMinutes,
    etaStart: etaStart.toISOString(),
    etaEnd: etaEnd.toISOString(),
    display: `${formatTime(etaStart)} - ${formatTime(etaEnd)}`,
  };
}

/**
 * Format time as HH:MM
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

module.exports = {
  // Real-time location (Requirements: 4.1, 4.2)
  updateLocation,
  getCurrentLocation,
  getShipperLocation, // Alias with DB fallback
  removeCurrentLocation,
  
  // Geo queries
  findNearbyShippersGeo,
  getDistanceToPoint,
  
  // Proximity checking (Requirements: 4.5)
  checkProximity,
  checkShipmentProximity,
  
  // Proximity notification trigger (Requirements: 4.5)
  triggerProximityNotification,
  checkAndTriggerProximityNotifications,
  wasProximityNotificationSent,
  markProximityNotificationSent,
  
  // Broadcasting (Requirements: 4.2)
  broadcastLocation,
  broadcastLocationUpdate, // Legacy
  
  // History
  logLocationHistory,
  getLocationHistory,
  getShipmentLocationHistory,
  
  // Batch operations
  getMultipleLocations,
  
  // Utilities
  calculateDistance,
  estimateTravelTime,
  calculateETARange,
  
  // Constants
  PROXIMITY_THRESHOLD_METERS,
};
