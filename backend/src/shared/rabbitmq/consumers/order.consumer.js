/**
 * Order Event Consumer
 * Handles ORDER_CREATED and ORDER_STATUS_CHANGED events
 * 
 * Requirements: Event-driven architecture, notifications
 */

const rabbitmqClient = require('../rabbitmq.client');
const cassandraClient = require('../../cassandra/cassandra.client');

// Event types this consumer handles
const HANDLED_EVENTS = [
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'ORDER_CANCELLED',
];

// Queue name for order events
const QUEUE_NAME = 'order_events';

/**
 * Initialize order consumer
 */
async function initialize() {
  const channel = await rabbitmqClient.getChannel();
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Bind to events exchange
  for (const event of HANDLED_EVENTS) {
    await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.EVENTS, event);
  }
  
  console.log('[OrderConsumer] Initialized, listening for:', HANDLED_EVENTS.join(', '));
}

/**
 * Start consuming order events
 */
async function start() {
  await initialize();
  
  await rabbitmqClient.consume(QUEUE_NAME, async (message) => {
    const { event, data, timestamp } = message;
    
    console.log(`[OrderConsumer] Received event: ${event}`, { orderId: data?.orderId });
    
    try {
      switch (event) {
        case 'ORDER_CREATED':
          await handleOrderCreated(data, timestamp);
          break;
        case 'ORDER_STATUS_CHANGED':
          await handleOrderStatusChanged(data, timestamp);
          break;
        case 'ORDER_CANCELLED':
          await handleOrderCancelled(data, timestamp);
          break;
        default:
          console.warn(`[OrderConsumer] Unknown event: ${event}`);
      }
    } catch (error) {
      console.error(`[OrderConsumer] Error handling ${event}:`, error.message);
      throw error; // Re-throw to trigger nack
    }
  });
}

/**
 * Handle ORDER_CREATED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleOrderCreated(data, timestamp) {
  const { orderId, customerId, partnerId, totalAmount, items } = data;
  
  console.log(`[OrderConsumer] Processing ORDER_CREATED for order ${orderId}`);
  
  // 1. Log to Cassandra for analytics
  await logOrderEvent(orderId, 'CREATED', customerId, 'customer', {
    totalAmount: String(totalAmount),
    itemCount: String(items?.length || 0),
  });
  
  // 2. Send notification to partner(s)
  await notifyPartner(partnerId, {
    type: 'NEW_ORDER',
    orderId,
    totalAmount,
    itemCount: items?.length || 0,
    timestamp,
  });
  
  // 3. Send confirmation to customer
  await notifyCustomer(customerId, {
    type: 'ORDER_CONFIRMED',
    orderId,
    totalAmount,
    timestamp,
  });
  
  // 4. Update analytics
  await updateAnalytics('order_created', {
    orderId,
    customerId,
    partnerId,
    totalAmount,
    timestamp,
  });
  
  console.log(`[OrderConsumer] ORDER_CREATED processed for order ${orderId}`);
}

/**
 * Handle ORDER_STATUS_CHANGED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleOrderStatusChanged(data, timestamp) {
  const { orderId, customerId, previousStatus, newStatus, actorId, actorRole } = data;
  
  console.log(`[OrderConsumer] Processing ORDER_STATUS_CHANGED: ${previousStatus} -> ${newStatus}`);
  
  // 1. Log to Cassandra
  await logOrderEvent(orderId, `STATUS_${newStatus}`, actorId, actorRole, {
    previousStatus,
    newStatus,
  });
  
  // 2. Send notification based on new status
  const notificationMap = {
    'confirmed': { type: 'ORDER_CONFIRMED', message: 'Đơn hàng đã được xác nhận' },
    'processing': { type: 'ORDER_PROCESSING', message: 'Đơn hàng đang được xử lý' },
    'ready_for_pickup': { type: 'ORDER_READY', message: 'Đơn hàng sẵn sàng giao' },
    'shipped': { type: 'ORDER_SHIPPED', message: 'Đơn hàng đang được giao' },
    'delivered': { type: 'ORDER_DELIVERED', message: 'Đơn hàng đã giao thành công' },
    'completed': { type: 'ORDER_COMPLETED', message: 'Đơn hàng hoàn tất' },
  };
  
  const notification = notificationMap[newStatus];
  if (notification) {
    await notifyCustomer(customerId, {
      ...notification,
      orderId,
      timestamp,
    });
  }
  
  console.log(`[OrderConsumer] ORDER_STATUS_CHANGED processed for order ${orderId}`);
}

/**
 * Handle ORDER_CANCELLED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleOrderCancelled(data, timestamp) {
  const { orderId, customerId, partnerId, reason, cancelledBy } = data;
  
  console.log(`[OrderConsumer] Processing ORDER_CANCELLED for order ${orderId}`);
  
  // 1. Log to Cassandra
  await logOrderEvent(orderId, 'CANCELLED', cancelledBy, 'system', {
    reason,
  });
  
  // 2. Notify customer
  await notifyCustomer(customerId, {
    type: 'ORDER_CANCELLED',
    orderId,
    reason,
    timestamp,
  });
  
  // 3. Notify partner
  if (partnerId) {
    await notifyPartner(partnerId, {
      type: 'ORDER_CANCELLED',
      orderId,
      reason,
      timestamp,
    });
  }
  
  console.log(`[OrderConsumer] ORDER_CANCELLED processed for order ${orderId}`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log order event to Cassandra
 */
async function logOrderEvent(orderId, eventType, actorId, actorRole, metadata = {}) {
  try {
    await cassandraClient.logOrderEvent(orderId, eventType, actorId, actorRole, metadata);
  } catch (error) {
    console.error('[OrderConsumer] Failed to log order event:', error.message);
  }
}

/**
 * Send notification to partner
 */
async function notifyPartner(partnerId, notification) {
  try {
    await rabbitmqClient.publishNotification('push', {
      userId: partnerId,
      userRole: 'partner',
      ...notification,
    });
  } catch (error) {
    console.error('[OrderConsumer] Failed to notify partner:', error.message);
  }
}

/**
 * Send notification to customer
 */
async function notifyCustomer(customerId, notification) {
  try {
    await rabbitmqClient.publishNotification('push', {
      userId: customerId,
      userRole: 'customer',
      ...notification,
    });
  } catch (error) {
    console.error('[OrderConsumer] Failed to notify customer:', error.message);
  }
}

/**
 * Update analytics
 */
async function updateAnalytics(eventName, data) {
  try {
    await rabbitmqClient.publishAnalyticsEvent(eventName, data);
  } catch (error) {
    console.error('[OrderConsumer] Failed to update analytics:', error.message);
  }
}

/**
 * Stop consumer
 */
async function stop() {
  console.log('[OrderConsumer] Stopping...');
}

module.exports = {
  initialize,
  start,
  stop,
  QUEUE_NAME,
  HANDLED_EVENTS,
};
