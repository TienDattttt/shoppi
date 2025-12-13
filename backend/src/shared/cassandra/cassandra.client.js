/**
 * Cassandra Client
 * Connection and operations for chat messages storage
 */

const cassandra = require('cassandra-driver');

let client = null;
let isConnected = false;

/**
 * Get Cassandra client configuration
 */
function getConfig() {
  const hosts = (process.env.CASSANDRA_HOSTS || 'localhost').split(',');
  const port = parseInt(process.env.CASSANDRA_PORT || '9042');
  const datacenter = process.env.CASSANDRA_DATACENTER || 'datacenter1';
  const keyspace = process.env.CASSANDRA_KEYSPACE || 'ecommerce_chat';
  const username = process.env.CASSANDRA_USERNAME;
  const password = process.env.CASSANDRA_PASSWORD;

  const config = {
    contactPoints: hosts,
    localDataCenter: datacenter,
    protocolOptions: { port },
  };

  // Add authentication if provided
  if (username && password) {
    config.credentials = { username, password };
  }

  return { config, keyspace };
}

/**
 * Initialize Cassandra connection and create keyspace/tables
 */
async function connect() {
  if (isConnected && client) {
    return client;
  }

  const { config, keyspace } = getConfig();

  try {
    // First connect without keyspace to create it if needed
    client = new cassandra.Client(config);
    await client.connect();
    console.log('[Cassandra] Connected to cluster');

    // Create keyspace if not exists
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS ${keyspace}
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);
    console.log(`[Cassandra] Keyspace ${keyspace} ready`);

    // Reconnect with keyspace
    await client.shutdown();
    client = new cassandra.Client({
      ...config,
      keyspace,
    });
    await client.connect();

    // Create tables
    await createTables();

    isConnected = true;
    console.log('[Cassandra] Initialization complete');
    return client;
  } catch (error) {
    console.error('[Cassandra] Connection failed:', error.message);
    isConnected = false;
    throw error;
  }
}

/**
 * Create tables optimized for time-series queries
 */
async function createTables() {
  // Chat messages table - partitioned by room_id, clustered by created_at DESC
  await client.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      room_id UUID,
      message_id UUID,
      sender_id UUID,
      message_type TEXT,
      content TEXT,
      metadata TEXT,
      is_read BOOLEAN,
      read_at TIMESTAMP,
      is_deleted BOOLEAN,
      deleted_at TIMESTAMP,
      reply_to_id UUID,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      PRIMARY KEY (room_id, created_at, message_id)
    ) WITH CLUSTERING ORDER BY (created_at DESC, message_id DESC)
  `);
  console.log('[Cassandra] Table chat_messages ready');

  // Index for querying by message_id
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_id 
    ON chat_messages (message_id)
  `);

  // Notification logs table - partitioned by user_id, clustered by created_at DESC
  await client.execute(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id UUID,
      user_id UUID,
      notification_type TEXT,
      channel TEXT,
      payload TEXT,
      status TEXT,
      error_message TEXT,
      created_at TIMESTAMP,
      PRIMARY KEY (user_id, created_at, id)
    ) WITH CLUSTERING ORDER BY (created_at DESC, id DESC)
  `);
  console.log('[Cassandra] Table notification_logs ready');

  // Order events table - for analytics and audit trail
  await client.execute(`
    CREATE TABLE IF NOT EXISTS order_events (
      order_id UUID,
      event_id UUID,
      event_type TEXT,
      actor_id UUID,
      actor_role TEXT,
      metadata TEXT,
      created_at TIMESTAMP,
      PRIMARY KEY (order_id, created_at, event_id)
    ) WITH CLUSTERING ORDER BY (created_at DESC, event_id DESC)
  `);
  console.log('[Cassandra] Table order_events ready');
}

/**
 * Get Cassandra client
 */
function getClient() {
  if (!client || !isConnected) {
    throw new Error('Cassandra client not initialized. Call connect() first.');
  }
  return client;
}

/**
 * Check if connected
 */
function isClientConnected() {
  return isConnected && client !== null;
}

/**
 * Disconnect from Cassandra
 */
async function disconnect() {
  if (client) {
    await client.shutdown();
    client = null;
    isConnected = false;
    console.log('[Cassandra] Disconnected');
  }
}

/**
 * Execute a query
 */
async function execute(query, params = [], options = {}) {
  const c = getClient();
  return c.execute(query, params, { prepare: true, ...options });
}

/**
 * Generate a time-based UUID (for message IDs)
 */
function generateTimeUuid() {
  return cassandra.types.TimeUuid.now();
}

/**
 * Convert UUID to string
 */
function uuidToString(uuid) {
  return uuid ? uuid.toString() : null;
}

/**
 * Log order event to Cassandra
 */
async function logOrderEvent(orderId, eventType, actorId, actorRole, metadata = {}) {
  if (!isConnected) {
    return; // Cassandra not available
  }
  
  try {
    await execute(
      `INSERT INTO order_events (
        order_id, event_id, event_type, actor_id, actor_role, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cassandra.types.Uuid.fromString(orderId),
        cassandra.types.Uuid.random(),
        eventType,
        actorId ? cassandra.types.Uuid.fromString(actorId) : null,
        actorRole,
        JSON.stringify(metadata),
        new Date(),
      ]
    );
  } catch (error) {
    console.error('[Cassandra] Failed to log order event:', error.message);
  }
}

/**
 * Get order events from Cassandra
 */
async function getOrderEvents(orderId, limit = 50) {
  if (!isConnected) {
    return [];
  }
  
  try {
    const result = await execute(
      `SELECT * FROM order_events WHERE order_id = ? LIMIT ?`,
      [cassandra.types.Uuid.fromString(orderId), limit]
    );
    
    return result.rows.map(row => ({
      id: uuidToString(row.event_id),
      orderId: uuidToString(row.order_id),
      eventType: row.event_type,
      actorId: uuidToString(row.actor_id),
      actorRole: row.actor_role,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('[Cassandra] Failed to get order events:', error.message);
    return [];
  }
}

module.exports = {
  connect,
  disconnect,
  getClient,
  isClientConnected,
  execute,
  generateTimeUuid,
  uuidToString,
  logOrderEvent,
  getOrderEvents,
  types: cassandra.types,
};
