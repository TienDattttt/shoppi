/**
 * Shipper Location Cache
 * Real-time shipper location caching using Redis GEO
 * 
 * Requirements: Real-time tracking, nearby shipper search
 */

const { getRedisClient } = require('./redis.client');

// Redis keys
const GEO_KEY = 'shipper:geo:locations';
const LOCATION_PREFIX = 'shipper:location:';
const ONLINE_SET = 'shipper:online';
const AVAILABLE_SET = 'shipper:available';

// TTL for location data (5 minutes)
const LOCATION_TTL = 300;

// ============================================
// LOCATION STORAGE
// ============================================

/**
 * Set shipper's current location
 * @param {string} shipperId
 * @param {number} lat
 * @param {number} lng
 * @param {Object} metadata - Additional data (speed, heading, etc.)
 * @returns {Promise<boolean>}
 */
async function setLocation(shipperId, lat, lng, metadata = {}) {
  try {
    const client = await getRedisClient();
    const timestamp = Date.now();
    
    // Store in GEO index for spatial queries
    await client.geoAdd(GEO_KEY, {
      longitude: lng,
      latitude: lat,
      member: shipperId,
    });
    
    // Store detailed location data
    const locationData = {
      shipperId,
      lat,
      lng,
      accuracy: metadata.accuracy,
      speed: metadata.speed,
      heading: metadata.heading,
      shipmentId: metadata.shipmentId,
      timestamp,
      updatedAt: new Date(timestamp).toISOString(),
    };
    
    await client.setEx(
      `${LOCATION_PREFIX}${shipperId}`,
      LOCATION_TTL,
      JSON.stringify(locationData)
    );
    
    return true;
  } catch (error) {
    console.error(`Set location error for shipper ${shipperId}:`, error.message);
    return false;
  }
}

/**
 * Get shipper's current location
 * @param {string} shipperId
 * @returns {Promise<Object|null>}
 */
async function getLocation(shipperId) {
  try {
    const client = await getRedisClient();
    
    // Get detailed location data
    const data = await client.get(`${LOCATION_PREFIX}${shipperId}`);
    
    if (data) {
      return JSON.parse(data);
    }
    
    // Fallback to GEO index
    const positions = await client.geoPos(GEO_KEY, shipperId);
    
    if (positions && positions[0]) {
      return {
        shipperId,
        lng: parseFloat(positions[0].longitude),
        lat: parseFloat(positions[0].latitude),
        source: 'geo_index',
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Get location error for shipper ${shipperId}:`, error.message);
    return null;
  }
}

/**
 * Remove shipper's location from cache
 * @param {string} shipperId
 * @returns {Promise<boolean>}
 */
async function removeLocation(shipperId) {
  try {
    const client = await getRedisClient();
    
    // Remove from GEO index
    await client.zRem(GEO_KEY, shipperId);
    
    // Remove detailed location
    await client.del(`${LOCATION_PREFIX}${shipperId}`);
    
    return true;
  } catch (error) {
    console.error(`Remove location error for shipper ${shipperId}:`, error.message);
    return false;
  }
}

// ============================================
// NEARBY SEARCH (REDIS GEO)
// ============================================

/**
 * Get shippers within radius
 * @param {number} lat - Center latitude
 * @param {number} lng - Center longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @param {Object} options
 * @returns {Promise<Object[]>}
 */
async function getNearbyShippers(lat, lng, radiusKm = 5, options = {}) {
  const { limit = 10, unit = 'km', withDistance = true, withCoord = true } = options;
  
  try {
    const client = await getRedisClient();
    
    // Use GEOSEARCH (Redis 6.2+) or GEORADIUS
    const results = await client.geoSearchWith(
      GEO_KEY,
      { longitude: lng, latitude: lat },
      { radius: radiusKm, unit },
      ['WITHDIST', 'WITHCOORD'],
      { COUNT: limit, SORT: 'ASC' }
    );
    
    if (!results || results.length === 0) {
      return [];
    }
    
    // Parse results
    const shippers = results.map(result => ({
      shipperId: result.member,
      distanceKm: parseFloat(result.distance),
      lat: result.coordinates.latitude,
      lng: result.coordinates.longitude,
    }));
    
    // Filter by online/available status if needed
    if (options.onlineOnly || options.availableOnly) {
      const shipperIds = shippers.map(s => s.shipperId);
      const statuses = await getShippersStatus(shipperIds);
      
      return shippers.filter(s => {
        const status = statuses[s.shipperId];
        if (options.onlineOnly && !status?.online) return false;
        if (options.availableOnly && !status?.available) return false;
        return true;
      });
    }
    
    return shippers;
  } catch (error) {
    console.error('Get nearby shippers error:', error.message);
    
    // Fallback to GEORADIUS for older Redis versions
    try {
      return await getNearbyShippersLegacy(lat, lng, radiusKm, options);
    } catch (fallbackError) {
      console.error('Fallback nearby search error:', fallbackError.message);
      return [];
    }
  }
}

/**
 * Legacy nearby search using GEORADIUS (for Redis < 6.2)
 */
async function getNearbyShippersLegacy(lat, lng, radiusKm, options = {}) {
  const { limit = 10 } = options;
  
  const client = await getRedisClient();
  
  const results = await client.sendCommand([
    'GEORADIUS',
    GEO_KEY,
    lng.toString(),
    lat.toString(),
    radiusKm.toString(),
    'km',
    'WITHDIST',
    'WITHCOORD',
    'ASC',
    'COUNT',
    limit.toString(),
  ]);
  
  if (!results || results.length === 0) {
    return [];
  }
  
  return results.map(result => ({
    shipperId: result[0],
    distanceKm: parseFloat(result[1]),
    lng: parseFloat(result[2][0]),
    lat: parseFloat(result[2][1]),
  }));
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
    const client = await getRedisClient();
    
    // Add temporary point
    const tempMember = `temp:${Date.now()}`;
    await client.geoAdd(GEO_KEY, {
      longitude: lng,
      latitude: lat,
      member: tempMember,
    });
    
    // Get distance
    const distance = await client.geoDist(GEO_KEY, shipperId, tempMember, 'km');
    
    // Remove temporary point
    await client.zRem(GEO_KEY, tempMember);
    
    return distance ? parseFloat(distance) : null;
  } catch (error) {
    console.error(`Get distance error for shipper ${shipperId}:`, error.message);
    return null;
  }
}

/**
 * Get distance between two shippers
 * @param {string} shipperId1
 * @param {string} shipperId2
 * @returns {Promise<number|null>} Distance in km
 */
async function getDistanceBetweenShippers(shipperId1, shipperId2) {
  try {
    const client = await getRedisClient();
    const distance = await client.geoDist(GEO_KEY, shipperId1, shipperId2, 'km');
    return distance ? parseFloat(distance) : null;
  } catch (error) {
    console.error('Get distance between shippers error:', error.message);
    return null;
  }
}

// ============================================
// ONLINE/AVAILABLE STATUS
// ============================================

/**
 * Set shipper online status
 * @param {string} shipperId
 * @param {boolean} online
 * @returns {Promise<boolean>}
 */
async function setOnlineStatus(shipperId, online) {
  try {
    const client = await getRedisClient();
    
    if (online) {
      await client.sAdd(ONLINE_SET, shipperId);
    } else {
      await client.sRem(ONLINE_SET, shipperId);
      // Also remove from available when going offline
      await client.sRem(AVAILABLE_SET, shipperId);
      // Remove location
      await removeLocation(shipperId);
    }
    
    return true;
  } catch (error) {
    console.error(`Set online status error for shipper ${shipperId}:`, error.message);
    return false;
  }
}

/**
 * Set shipper available status
 * @param {string} shipperId
 * @param {boolean} available
 * @returns {Promise<boolean>}
 */
async function setAvailableStatus(shipperId, available) {
  try {
    const client = await getRedisClient();
    
    if (available) {
      await client.sAdd(AVAILABLE_SET, shipperId);
    } else {
      await client.sRem(AVAILABLE_SET, shipperId);
    }
    
    return true;
  } catch (error) {
    console.error(`Set available status error for shipper ${shipperId}:`, error.message);
    return false;
  }
}

/**
 * Check if shipper is online
 * @param {string} shipperId
 * @returns {Promise<boolean>}
 */
async function isOnline(shipperId) {
  try {
    const client = await getRedisClient();
    return await client.sIsMember(ONLINE_SET, shipperId);
  } catch (error) {
    console.error(`Check online error for shipper ${shipperId}:`, error.message);
    return false;
  }
}

/**
 * Check if shipper is available
 * @param {string} shipperId
 * @returns {Promise<boolean>}
 */
async function isAvailable(shipperId) {
  try {
    const client = await getRedisClient();
    return await client.sIsMember(AVAILABLE_SET, shipperId);
  } catch (error) {
    console.error(`Check available error for shipper ${shipperId}:`, error.message);
    return false;
  }
}

/**
 * Get status for multiple shippers
 * @param {string[]} shipperIds
 * @returns {Promise<Object>}
 */
async function getShippersStatus(shipperIds) {
  try {
    const client = await getRedisClient();
    const result = {};
    
    for (const shipperId of shipperIds) {
      const [online, available] = await Promise.all([
        client.sIsMember(ONLINE_SET, shipperId),
        client.sIsMember(AVAILABLE_SET, shipperId),
      ]);
      
      result[shipperId] = { online, available };
    }
    
    return result;
  } catch (error) {
    console.error('Get shippers status error:', error.message);
    return {};
  }
}

/**
 * Get all online shippers
 * @returns {Promise<string[]>}
 */
async function getOnlineShippers() {
  try {
    const client = await getRedisClient();
    return await client.sMembers(ONLINE_SET);
  } catch (error) {
    console.error('Get online shippers error:', error.message);
    return [];
  }
}

/**
 * Get all available shippers
 * @returns {Promise<string[]>}
 */
async function getAvailableShippers() {
  try {
    const client = await getRedisClient();
    return await client.sMembers(AVAILABLE_SET);
  } catch (error) {
    console.error('Get available shippers error:', error.message);
    return [];
  }
}

/**
 * Get count of online/available shippers
 * @returns {Promise<{online: number, available: number}>}
 */
async function getShipperCounts() {
  try {
    const client = await getRedisClient();
    const [online, available] = await Promise.all([
      client.sCard(ONLINE_SET),
      client.sCard(AVAILABLE_SET),
    ]);
    
    return { online, available };
  } catch (error) {
    console.error('Get shipper counts error:', error.message);
    return { online: 0, available: 0 };
  }
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Get locations for multiple shippers
 * @param {string[]} shipperIds
 * @returns {Promise<Object>}
 */
async function getMultipleLocations(shipperIds) {
  try {
    const client = await getRedisClient();
    const pipeline = client.multi();
    
    shipperIds.forEach(id => {
      pipeline.get(`${LOCATION_PREFIX}${id}`);
    });
    
    const results = await pipeline.exec();
    const locations = {};
    
    results.forEach((result, index) => {
      if (result) {
        locations[shipperIds[index]] = JSON.parse(result);
      }
    });
    
    return locations;
  } catch (error) {
    console.error('Get multiple locations error:', error.message);
    return {};
  }
}

/**
 * Update multiple shipper locations
 * @param {Object[]} updates - Array of {shipperId, lat, lng, metadata}
 * @returns {Promise<boolean>}
 */
async function setMultipleLocations(updates) {
  try {
    const client = await getRedisClient();
    const pipeline = client.multi();
    const timestamp = Date.now();
    
    // Add to GEO index
    const geoMembers = updates.map(u => ({
      longitude: u.lng,
      latitude: u.lat,
      member: u.shipperId,
    }));
    
    if (geoMembers.length > 0) {
      pipeline.geoAdd(GEO_KEY, geoMembers);
    }
    
    // Store detailed data
    updates.forEach(u => {
      const locationData = {
        shipperId: u.shipperId,
        lat: u.lat,
        lng: u.lng,
        ...u.metadata,
        timestamp,
        updatedAt: new Date(timestamp).toISOString(),
      };
      
      pipeline.setEx(
        `${LOCATION_PREFIX}${u.shipperId}`,
        LOCATION_TTL,
        JSON.stringify(locationData)
      );
    });
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('Set multiple locations error:', error.message);
    return false;
  }
}

module.exports = {
  // Location storage
  setLocation,
  getLocation,
  removeLocation,
  
  // Nearby search
  getNearbyShippers,
  getDistanceToPoint,
  getDistanceBetweenShippers,
  
  // Online/Available status
  setOnlineStatus,
  setAvailableStatus,
  isOnline,
  isAvailable,
  getShippersStatus,
  getOnlineShippers,
  getAvailableShippers,
  getShipperCounts,
  
  // Batch operations
  getMultipleLocations,
  setMultipleLocations,
  
  // Constants
  GEO_KEY,
  LOCATION_PREFIX,
  ONLINE_SET,
  AVAILABLE_SET,
  LOCATION_TTL,
};
