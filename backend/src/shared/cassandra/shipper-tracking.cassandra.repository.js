/**
 * Shipper Tracking Cassandra Repository
 * Lưu lịch sử vị trí shipper (time-series data)
 * 
 * Use case:
 * - Lưu lịch sử di chuyển của shipper
 * - Replay route đã đi
 * - Analytics về thời gian giao hàng
 */

const cassandraClient = require('./cassandra.client');

// Table name
const TABLE_NAME = 'shipper_location_history';

/**
 * Khởi tạo table cho shipper location history
 */
async function initializeTable() {
  try {
    const client = cassandraClient.getClient();
    
    // Table partitioned by shipper_id và date, clustered by timestamp
    // Cho phép query theo shipper + ngày + khoảng thời gian
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        shipper_id UUID,
        date DATE,
        timestamp TIMESTAMP,
        location_id UUID,
        lat DECIMAL,
        lng DECIMAL,
        accuracy FLOAT,
        speed FLOAT,
        heading FLOAT,
        shipment_id UUID,
        event_type TEXT,
        metadata TEXT,
        PRIMARY KEY ((shipper_id, date), timestamp, location_id)
      ) WITH CLUSTERING ORDER BY (timestamp DESC, location_id DESC)
    `);
    
    console.log('[Cassandra] Table shipper_location_history ready');
    
    // Index cho query theo shipment
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_shipper_location_shipment 
      ON ${TABLE_NAME} (shipment_id)
    `);
    
    return true;
  } catch (error) {
    console.error('[Cassandra] Failed to initialize shipper_location_history:', error.message);
    return false;
  }
}

/**
 * Lưu vị trí shipper vào history
 * @param {Object} locationData
 */
async function saveLocation(locationData) {
  if (!cassandraClient.isClientConnected()) {
    return null;
  }
  
  try {
    const {
      shipperId,
      lat,
      lng,
      accuracy,
      speed,
      heading,
      shipmentId,
      eventType = 'location_update',
      metadata = {},
    } = locationData;
    
    const timestamp = new Date();
    const date = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const locationId = cassandraClient.types.Uuid.random();
    
    await cassandraClient.execute(
      `INSERT INTO ${TABLE_NAME} (
        shipper_id, date, timestamp, location_id, lat, lng, 
        accuracy, speed, heading, shipment_id, event_type, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cassandraClient.types.Uuid.fromString(shipperId),
        date,
        timestamp,
        locationId,
        lat,
        lng,
        accuracy || null,
        speed || null,
        heading || null,
        shipmentId ? cassandraClient.types.Uuid.fromString(shipmentId) : null,
        eventType,
        JSON.stringify(metadata),
      ]
    );
    
    return {
      id: cassandraClient.uuidToString(locationId),
      shipperId,
      lat,
      lng,
      timestamp,
    };
  } catch (error) {
    console.error('[Cassandra] Failed to save shipper location:', error.message);
    return null;
  }
}

/**
 * Lấy lịch sử vị trí của shipper theo ngày
 * @param {string} shipperId
 * @param {string} date - YYYY-MM-DD
 * @param {Object} options
 */
async function getLocationHistory(shipperId, date, options = {}) {
  if (!cassandraClient.isClientConnected()) {
    return [];
  }
  
  try {
    const { limit = 1000, startTime, endTime } = options;
    
    let query = `SELECT * FROM ${TABLE_NAME} WHERE shipper_id = ? AND date = ?`;
    const params = [
      cassandraClient.types.Uuid.fromString(shipperId),
      date,
    ];
    
    // Add time range filter
    if (startTime && endTime) {
      query += ` AND timestamp >= ? AND timestamp <= ?`;
      params.push(new Date(startTime), new Date(endTime));
    } else if (startTime) {
      query += ` AND timestamp >= ?`;
      params.push(new Date(startTime));
    } else if (endTime) {
      query += ` AND timestamp <= ?`;
      params.push(new Date(endTime));
    }
    
    query += ` LIMIT ?`;
    params.push(limit);
    
    const result = await cassandraClient.execute(query, params);
    
    return result.rows.map(row => ({
      id: cassandraClient.uuidToString(row.location_id),
      shipperId: cassandraClient.uuidToString(row.shipper_id),
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      accuracy: row.accuracy,
      speed: row.speed,
      heading: row.heading,
      shipmentId: cassandraClient.uuidToString(row.shipment_id),
      eventType: row.event_type,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      timestamp: row.timestamp,
    }));
  } catch (error) {
    console.error('[Cassandra] Failed to get shipper location history:', error.message);
    return [];
  }
}

/**
 * Lấy route của shipper cho một shipment cụ thể
 * @param {string} shipperId
 * @param {string} shipmentId
 * @param {string} date
 */
async function getShipmentRoute(shipperId, shipmentId, date) {
  if (!cassandraClient.isClientConnected()) {
    return [];
  }
  
  try {
    const result = await cassandraClient.execute(
      `SELECT * FROM ${TABLE_NAME} 
       WHERE shipper_id = ? AND date = ? AND shipment_id = ?
       ALLOW FILTERING`,
      [
        cassandraClient.types.Uuid.fromString(shipperId),
        date,
        cassandraClient.types.Uuid.fromString(shipmentId),
      ]
    );
    
    return result.rows.map(row => ({
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      timestamp: row.timestamp,
      speed: row.speed,
    }));
  } catch (error) {
    console.error('[Cassandra] Failed to get shipment route:', error.message);
    return [];
  }
}

/**
 * Lấy vị trí cuối cùng của shipper trong ngày
 * @param {string} shipperId
 * @param {string} date
 */
async function getLastLocation(shipperId, date) {
  if (!cassandraClient.isClientConnected()) {
    return null;
  }
  
  try {
    const result = await cassandraClient.execute(
      `SELECT * FROM ${TABLE_NAME} 
       WHERE shipper_id = ? AND date = ? 
       LIMIT 1`,
      [
        cassandraClient.types.Uuid.fromString(shipperId),
        date || new Date().toISOString().split('T')[0],
      ]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      timestamp: row.timestamp,
      shipmentId: cassandraClient.uuidToString(row.shipment_id),
    };
  } catch (error) {
    console.error('[Cassandra] Failed to get last location:', error.message);
    return null;
  }
}

/**
 * Batch save nhiều locations (cho sync từ mobile)
 * @param {Object[]} locations
 */
async function batchSaveLocations(locations) {
  if (!cassandraClient.isClientConnected() || locations.length === 0) {
    return false;
  }
  
  try {
    const queries = locations.map(loc => {
      const timestamp = new Date(loc.timestamp || Date.now());
      const date = timestamp.toISOString().split('T')[0];
      
      return {
        query: `INSERT INTO ${TABLE_NAME} (
          shipper_id, date, timestamp, location_id, lat, lng, 
          accuracy, speed, heading, shipment_id, event_type, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          cassandraClient.types.Uuid.fromString(loc.shipperId),
          date,
          timestamp,
          cassandraClient.types.Uuid.random(),
          loc.lat,
          loc.lng,
          loc.accuracy || null,
          loc.speed || null,
          loc.heading || null,
          loc.shipmentId ? cassandraClient.types.Uuid.fromString(loc.shipmentId) : null,
          loc.eventType || 'location_update',
          JSON.stringify(loc.metadata || {}),
        ],
      };
    });
    
    await cassandraClient.getClient().batch(queries, { prepare: true });
    return true;
  } catch (error) {
    console.error('[Cassandra] Failed to batch save locations:', error.message);
    return false;
  }
}

/**
 * Tính tổng quãng đường di chuyển trong ngày
 * @param {string} shipperId
 * @param {string} date
 */
async function calculateDailyDistance(shipperId, date) {
  const locations = await getLocationHistory(shipperId, date, { limit: 10000 });
  
  if (locations.length < 2) {
    return 0;
  }
  
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i];
    const curr = locations[i - 1];
    totalDistance += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
  }
  
  return totalDistance; // km
}

/**
 * Tính khoảng cách Haversine giữa 2 điểm
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  initializeTable,
  saveLocation,
  getLocationHistory,
  getShipmentRoute,
  getLastLocation,
  batchSaveLocations,
  calculateDailyDistance,
};
