/**
 * Cassandra Client
 * NoSQL database for analytics, logs, and time-series data
 */

const cassandra = require('cassandra-driver');

let client = null;

// Keyspace name
const KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'ecommerce';

// Table names
const TABLES = {
  USER_ACTIVITY: 'user_activity',
  PRODUCT_VIEWS: 'product_views',
  ORDER_EVENTS: 'order_events',
  SEARCH_LOGS: 'search_logs',
  NOTIFICATION_LOGS: 'notification_logs',
  API_LOGS: 'api_logs',
  SHIPPER_LOCATION_HISTORY: 'shipper_location_history',
  CHAT_MESSAGES: 'chat_messages',
};

/**
 * Get Cassandra client
 * @returns {cassandra.Client}
 */
function getClient() {
  if (client) return client;

  const contactPoints = (process.env.CASSANDRA_HOSTS || 'localhost').split(',');
  const localDataCenter = process.env.CASSANDRA_DATACENTER || 'datacenter1';

  client = new cassandra.Client({
    contactPoints,
    localDataCenter,
    keyspace: KEYSPACE,
    credentials: process.env.CASSANDRA_USERNAME ? {
      username: process.env.CASSANDRA_USERNAME,
      password: process.env.CASSANDRA_PASSWORD,
    } : undefined,
  });

  client.on('log', (level, className, message) => {
    if (level === 'error') {
      console.error('Cassandra:', message);
    }
  });

  return client;
}

/**
 * Connect to Cassandra
 */
async function connect() {
  const c = getClient();
  try {
    await c.connect();
    console.log('Cassandra: Connected');
    return c;
  } catch (error) {
    console.error('Failed to connect to Cassandra:', error.message);
    throw error;
  }
}

/**
 * Initialize keyspace and tables
 */
async function initialize() {
  const c = getClient();
  
  // Create keyspace if not exists
  await c.execute(`
    CREATE KEYSPACE IF NOT EXISTS ${KEYSPACE}
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
  `);

  // Create tables
  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.USER_ACTIVITY} (
      user_id uuid,
      activity_date date,
      activity_time timestamp,
      activity_type text,
      metadata map<text, text>,
      PRIMARY KEY ((user_id, activity_date), activity_time)
    ) WITH CLUSTERING ORDER BY (activity_time DESC)
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.PRODUCT_VIEWS} (
      product_id uuid,
      view_date date,
      view_time timestamp,
      user_id uuid,
      session_id text,
      source text,
      PRIMARY KEY ((product_id, view_date), view_time)
    ) WITH CLUSTERING ORDER BY (view_time DESC)
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.ORDER_EVENTS} (
      order_id uuid,
      event_time timestamp,
      event_type text,
      actor_id uuid,
      actor_role text,
      metadata map<text, text>,
      PRIMARY KEY (order_id, event_time)
    ) WITH CLUSTERING ORDER BY (event_time DESC)
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.SEARCH_LOGS} (
      search_date date,
      search_time timestamp,
      user_id uuid,
      query text,
      filters map<text, text>,
      results_count int,
      PRIMARY KEY (search_date, search_time)
    ) WITH CLUSTERING ORDER BY (search_time DESC)
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.NOTIFICATION_LOGS} (
      notification_date date,
      sent_time timestamp,
      notification_id uuid,
      user_id uuid,
      channel text,
      status text,
      error_message text,
      PRIMARY KEY (notification_date, sent_time)
    ) WITH CLUSTERING ORDER BY (sent_time DESC)
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.API_LOGS} (
      log_date date,
      log_time timestamp,
      request_id uuid,
      method text,
      path text,
      status_code int,
      response_time_ms int,
      user_id uuid,
      ip_address text,
      PRIMARY KEY (log_date, log_time)
    ) WITH CLUSTERING ORDER BY (log_time DESC)
  `);

  // Shipper location history table
  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.SHIPPER_LOCATION_HISTORY} (
      shipper_id uuid,
      location_date date,
      location_time timestamp,
      lat double,
      lng double,
      accuracy double,
      speed double,
      heading double,
      shipment_id uuid,
      PRIMARY KEY ((shipper_id, location_date), location_time)
    ) WITH CLUSTERING ORDER BY (location_time DESC)
  `);

  // Chat messages table for high-volume storage
  await c.execute(`
    CREATE TABLE IF NOT EXISTS ${KEYSPACE}.${TABLES.CHAT_MESSAGES} (
      room_id uuid,
      message_date date,
      message_time timestamp,
      message_id uuid,
      sender_id uuid,
      content text,
      message_type text,
      metadata map<text, text>,
      PRIMARY KEY ((room_id, message_date), message_time)
    ) WITH CLUSTERING ORDER BY (message_time DESC)
  `);

  console.log('Cassandra: Tables initialized');
}


// ==================== LOGGING FUNCTIONS ====================

/**
 * Log user activity
 */
async function logUserActivity(userId, activityType, metadata = {}) {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.USER_ACTIVITY} 
     (user_id, activity_date, activity_time, activity_type, metadata) 
     VALUES (?, ?, ?, ?, ?)`,
    [userId, now, now, activityType, metadata],
    { prepare: true }
  );
}

/**
 * Log product view
 */
async function logProductView(productId, userId, sessionId, source = 'direct') {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.PRODUCT_VIEWS} 
     (product_id, view_date, view_time, user_id, session_id, source) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, now, now, userId, sessionId, source],
    { prepare: true }
  );
}

/**
 * Log order event
 */
async function logOrderEvent(orderId, eventType, actorId, actorRole, metadata = {}) {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.ORDER_EVENTS} 
     (order_id, event_time, event_type, actor_id, actor_role, metadata) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [orderId, now, eventType, actorId, actorRole, metadata],
    { prepare: true }
  );
}

/**
 * Log search query
 */
async function logSearch(userId, query, filters = {}, resultsCount = 0) {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.SEARCH_LOGS} 
     (search_date, search_time, user_id, query, filters, results_count) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [now, now, userId, query, filters, resultsCount],
    { prepare: true }
  );
}

/**
 * Log notification
 */
async function logNotification(notificationId, userId, channel, status, errorMessage = null) {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.NOTIFICATION_LOGS} 
     (notification_date, sent_time, notification_id, user_id, channel, status, error_message) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [now, now, notificationId, userId, channel, status, errorMessage],
    { prepare: true }
  );
}

/**
 * Log API request
 */
async function logApiRequest(requestId, method, path, statusCode, responseTimeMs, userId, ipAddress) {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.API_LOGS} 
     (log_date, log_time, request_id, method, path, status_code, response_time_ms, user_id, ip_address) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [now, now, requestId, method, path, statusCode, responseTimeMs, userId, ipAddress],
    { prepare: true }
  );
}

// ==================== QUERY FUNCTIONS ====================

/**
 * Get user activity for date range
 */
async function getUserActivity(userId, startDate, endDate) {
  const c = getClient();
  
  const result = await c.execute(
    `SELECT * FROM ${KEYSPACE}.${TABLES.USER_ACTIVITY} 
     WHERE user_id = ? AND activity_date >= ? AND activity_date <= ?`,
    [userId, startDate, endDate],
    { prepare: true }
  );
  
  return result.rows;
}

/**
 * Get product views for date
 */
async function getProductViews(productId, date) {
  const c = getClient();
  
  const result = await c.execute(
    `SELECT * FROM ${KEYSPACE}.${TABLES.PRODUCT_VIEWS} 
     WHERE product_id = ? AND view_date = ?`,
    [productId, date],
    { prepare: true }
  );
  
  return result.rows;
}

/**
 * Get order events
 */
async function getOrderEvents(orderId) {
  const c = getClient();
  
  const result = await c.execute(
    `SELECT * FROM ${KEYSPACE}.${TABLES.ORDER_EVENTS} WHERE order_id = ?`,
    [orderId],
    { prepare: true }
  );
  
  return result.rows;
}

// ==================== SHIPPER LOCATION FUNCTIONS ====================

/**
 * Log shipper location
 * @param {string} shipperId
 * @param {Object} locationData
 */
async function logShipperLocation(shipperId, locationData) {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.SHIPPER_LOCATION_HISTORY} 
     (shipper_id, location_date, location_time, lat, lng, accuracy, speed, heading, shipment_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      shipperId,
      now,
      now,
      locationData.lat,
      locationData.lng,
      locationData.accuracy || null,
      locationData.speed || null,
      locationData.heading || null,
      locationData.shipmentId || null,
    ],
    { prepare: true }
  );
}

/**
 * Get shipper location history
 * @param {string} shipperId
 * @param {Date} startTime
 * @param {Date} endTime
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function getShipperLocationHistory(shipperId, startTime, endTime, limit = 100) {
  const c = getClient();
  
  // Get dates between start and end
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  
  const result = await c.execute(
    `SELECT * FROM ${KEYSPACE}.${TABLES.SHIPPER_LOCATION_HISTORY} 
     WHERE shipper_id = ? AND location_date >= ? AND location_date <= ?
     LIMIT ?`,
    [shipperId, startDate, endDate, limit],
    { prepare: true }
  );
  
  return result.rows.map(row => ({
    shipperId: row.shipper_id,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy,
    speed: row.speed,
    heading: row.heading,
    shipmentId: row.shipment_id,
    timestamp: row.location_time,
  }));
}

/**
 * Get location history for a specific shipment
 * @param {string} shipmentId
 * @param {string} shipperId
 * @returns {Promise<Object[]>}
 */
async function getShipmentLocationHistory(shipmentId, shipperId) {
  const c = getClient();
  
  // Query last 24 hours by default
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  
  const result = await c.execute(
    `SELECT * FROM ${KEYSPACE}.${TABLES.SHIPPER_LOCATION_HISTORY} 
     WHERE shipper_id = ? AND location_date >= ? AND location_date <= ?
     AND shipment_id = ?
     ALLOW FILTERING`,
    [shipperId, startDate, endDate, shipmentId],
    { prepare: true }
  );
  
  return result.rows.map(row => ({
    lat: row.lat,
    lng: row.lng,
    speed: row.speed,
    timestamp: row.location_time,
  }));
}

// ==================== CHAT MESSAGE FUNCTIONS ====================

/**
 * Save chat message to Cassandra
 * @param {Object} message
 */
async function saveChatMessage(message) {
  const c = getClient();
  const now = new Date();
  
  await c.execute(
    `INSERT INTO ${KEYSPACE}.${TABLES.CHAT_MESSAGES} 
     (room_id, message_date, message_time, message_id, sender_id, content, message_type, metadata) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      message.roomId,
      now,
      now,
      message.id,
      message.senderId,
      message.content,
      message.type || 'text',
      message.metadata || {},
    ],
    { prepare: true }
  );
}

/**
 * Get chat history from Cassandra
 * @param {string} roomId
 * @param {Date} beforeTime
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
async function getChatHistory(roomId, beforeTime = new Date(), limit = 50) {
  const c = getClient();
  
  // Get messages from last 30 days
  const endDate = new Date(beforeTime);
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const result = await c.execute(
    `SELECT * FROM ${KEYSPACE}.${TABLES.CHAT_MESSAGES} 
     WHERE room_id = ? AND message_date >= ? AND message_date <= ?
     LIMIT ?`,
    [roomId, startDate, endDate, limit],
    { prepare: true }
  );
  
  return result.rows.map(row => ({
    id: row.message_id,
    roomId: row.room_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.message_type,
    metadata: row.metadata,
    createdAt: row.message_time,
  }));
}

/**
 * Close connection
 */
async function close() {
  if (client) {
    await client.shutdown();
    client = null;
  }
}

module.exports = {
  // Connection
  getClient,
  connect,
  initialize,
  close,
  
  // Logging
  logUserActivity,
  logProductView,
  logOrderEvent,
  logSearch,
  logNotification,
  logApiRequest,
  
  // Queries
  getUserActivity,
  getProductViews,
  getOrderEvents,
  
  // Shipper location
  logShipperLocation,
  getShipperLocationHistory,
  getShipmentLocationHistory,
  
  // Chat messages
  saveChatMessage,
  getChatHistory,
  
  // Constants
  KEYSPACE,
  TABLES,
};
