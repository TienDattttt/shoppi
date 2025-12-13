/**
 * RabbitMQ Client
 * Message queue for async processing (notifications, emails, order processing)
 */

const amqp = require('amqplib');

let connection = null;
let channel = null;

// Queue names
const QUEUES = {
  NOTIFICATIONS: 'notifications',
  EMAILS: 'emails',
  SMS: 'sms',
  ORDER_PROCESSING: 'order_processing',
  INVENTORY_UPDATES: 'inventory_updates',
  ANALYTICS: 'analytics',
};

// Exchange names
const EXCHANGES = {
  EVENTS: 'events',
  NOTIFICATIONS: 'notifications',
  ORDERS: 'orders',
};

// Track if RabbitMQ is available
let isAvailable = true;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Connect to RabbitMQ
 * @returns {Promise<amqp.Connection|null>}
 */
async function connect() {
  if (connection) return connection;
  
  // Skip if we've exceeded reconnect attempts
  if (!isAvailable && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    return null;
  }

  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
  
  try {
    connection = await amqp.connect(url);
    isAvailable = true;
    reconnectAttempts = 0;
    
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err.message);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    console.log('RabbitMQ: Connected to', url.replace(/:[^:@]+@/, ':***@'));
    return connection;
  } catch (error) {
    reconnectAttempts++;
    console.warn(`[RabbitMQ] Connection failed (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      isAvailable = false;
      console.warn('[RabbitMQ] Max reconnect attempts reached. RabbitMQ features disabled.');
    }
    return null;
  }
}

/**
 * Get or create channel
 * @returns {Promise<amqp.Channel|null>}
 */
async function getChannel() {
  // Check if channel is still valid
  if (channel) {
    try {
      // Test if channel is still open
      await channel.checkQueue(QUEUES.NOTIFICATIONS);
      return channel;
    } catch {
      // Channel is closed, reset
      channel = null;
      connection = null;
    }
  }

  const conn = await connect();
  if (!conn) {
    return null; // RabbitMQ not available
  }
  
  channel = await conn.createChannel();
  
  // Handle channel errors
  channel.on('error', (err) => {
    console.error('RabbitMQ channel error:', err.message);
    channel = null;
  });

  channel.on('close', () => {
    console.log('RabbitMQ channel closed');
    channel = null;
  });
  
  // Setup exchanges
  await channel.assertExchange(EXCHANGES.EVENTS, 'topic', { durable: true });
  await channel.assertExchange(EXCHANGES.NOTIFICATIONS, 'direct', { durable: true });
  await channel.assertExchange(EXCHANGES.ORDERS, 'direct', { durable: true });

  // Setup queues
  for (const queue of Object.values(QUEUES)) {
    await channel.assertQueue(queue, { durable: true });
  }

  // Bind queues to exchanges
  await channel.bindQueue(QUEUES.NOTIFICATIONS, EXCHANGES.NOTIFICATIONS, 'push');
  await channel.bindQueue(QUEUES.EMAILS, EXCHANGES.NOTIFICATIONS, 'email');
  await channel.bindQueue(QUEUES.SMS, EXCHANGES.NOTIFICATIONS, 'sms');
  await channel.bindQueue(QUEUES.ORDER_PROCESSING, EXCHANGES.ORDERS, 'process');

  return channel;
}


/**
 * Publish message to queue
 * @param {string} queue - Queue name
 * @param {object} message - Message payload
 * @param {object} options - Message options
 */
async function publishToQueue(queue, message, options = {}) {
  const ch = await getChannel();
  if (!ch) {
    return false; // RabbitMQ not available
  }
  
  const content = Buffer.from(JSON.stringify(message));
  return ch.sendToQueue(queue, content, {
    persistent: true,
    ...options,
  });
}

/**
 * Publish message to exchange
 * @param {string} exchange - Exchange name
 * @param {string} routingKey - Routing key
 * @param {object} message - Message payload
 */
async function publishToExchange(exchange, routingKey, message) {
  const ch = await getChannel();
  if (!ch) {
    return false; // RabbitMQ not available
  }
  
  const content = Buffer.from(JSON.stringify(message));
  return ch.publish(exchange, routingKey, content, { persistent: true });
}

/**
 * Consume messages from queue
 * @param {string} queue - Queue name
 * @param {Function} handler - Message handler function
 * @param {object} options - Consumer options
 */
async function consume(queue, handler, options = {}) {
  const ch = await getChannel();
  if (!ch) {
    console.warn(`[RabbitMQ] Cannot consume from ${queue} - not connected`);
    return;
  }
  
  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    
    try {
      const content = JSON.parse(msg.content.toString());
      await handler(content, msg);
      ch.ack(msg);
    } catch (error) {
      console.error(`Error processing message from ${queue}:`, error);
      // Reject and requeue on failure
      ch.nack(msg, false, !options.noRequeue);
    }
  }, options);
}

/**
 * Publish notification event
 * @param {string} type - 'push', 'email', or 'sms'
 * @param {object} payload - Notification payload
 */
async function publishNotification(type, payload) {
  try {
    return await publishToExchange(EXCHANGES.NOTIFICATIONS, type, {
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't throw - notifications are non-critical
    console.warn(`[RabbitMQ] Failed to publish notification ${type}:`, error.message);
    return false;
  }
}

/**
 * Publish order event
 * @param {string} eventType - Event type (created, updated, cancelled, etc.)
 * @param {object} orderData - Order data
 */
async function publishOrderEvent(eventType, orderData) {
  try {
    return await publishToExchange(EXCHANGES.EVENTS, `order.${eventType}`, {
      event: `order.${eventType}`,
      data: orderData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't throw - RabbitMQ is optional for order processing
    console.warn(`[RabbitMQ] Failed to publish order event ${eventType}:`, error.message);
    return false;
  }
}

/**
 * Publish inventory update event
 * @param {object} inventoryData - Inventory update data
 */
async function publishInventoryUpdate(inventoryData) {
  return publishToQueue(QUEUES.INVENTORY_UPDATES, {
    ...inventoryData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Publish analytics event
 * @param {string} eventName - Event name
 * @param {object} eventData - Event data
 */
async function publishAnalyticsEvent(eventName, eventData) {
  return publishToQueue(QUEUES.ANALYTICS, {
    event: eventName,
    data: eventData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Close connection
 */
async function close() {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
}

/**
 * Check if connected
 * @returns {boolean}
 */
function isConnected() {
  return connection !== null && channel !== null;
}

module.exports = {
  // Connection
  connect,
  getChannel,
  close,
  isConnected,
  
  // Publishing
  publishToQueue,
  publishToExchange,
  publishNotification,
  publishOrderEvent,
  publishInventoryUpdate,
  publishAnalyticsEvent,
  
  // Consuming
  consume,
  
  // Constants
  QUEUES,
  EXCHANGES,
};
