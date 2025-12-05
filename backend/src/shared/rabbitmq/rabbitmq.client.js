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

/**
 * Connect to RabbitMQ
 * @returns {Promise<amqp.Connection>}
 */
async function connect() {
  if (connection) return connection;

  const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  
  try {
    connection = await amqp.connect(url);
    
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

    console.log('RabbitMQ: Connected');
    return connection;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error.message);
    throw error;
  }
}

/**
 * Get or create channel
 * @returns {Promise<amqp.Channel>}
 */
async function getChannel() {
  if (channel) return channel;

  const conn = await connect();
  channel = await conn.createChannel();
  
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
  return publishToExchange(EXCHANGES.NOTIFICATIONS, type, {
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Publish order event
 * @param {string} eventType - Event type (created, updated, cancelled, etc.)
 * @param {object} orderData - Order data
 */
async function publishOrderEvent(eventType, orderData) {
  return publishToExchange(EXCHANGES.EVENTS, `order.${eventType}`, {
    event: `order.${eventType}`,
    data: orderData,
    timestamp: new Date().toISOString(),
  });
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
