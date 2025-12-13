/**
 * Order Event Consumer
 * Handles ORDER_CREATED and ORDER_STATUS_CHANGED events
 * 
 * Requirements: Event-driven architecture, notifications
 */

const rabbitmqClient = require('../rabbitmq.client');
const cassandraClient = require('../../cassandra/cassandra.client');

// Routing keys this consumer handles (must match what publisher sends)
const ROUTING_KEYS = [
  'order.created',
  'order.status_changed',
  'order.cancelled',
  'order.payment_success',
  'order.payment_failed',
];

// Queue name for order events
const QUEUE_NAME = 'order_events';

/**
 * Initialize order consumer
 */
async function initialize() {
  const channel = await rabbitmqClient.getChannel();
  if (!channel) {
    console.warn('[OrderConsumer] RabbitMQ not available, skipping initialization');
    return false;
  }
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Bind to events exchange with correct routing keys
  for (const routingKey of ROUTING_KEYS) {
    await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.EVENTS, routingKey);
  }
  
  console.log('[OrderConsumer] Initialized, listening for:', ROUTING_KEYS.join(', '));
  return true;
}

/**
 * Start consuming order events
 */
async function start() {
  const initialized = await initialize();
  if (!initialized) return;
  
  await rabbitmqClient.consume(QUEUE_NAME, async (message) => {
    const { event, data, timestamp } = message;
    
    console.log(`[OrderConsumer] Received event: ${event}`, { orderId: data?.orderId });
    
    try {
      // Event format is "order.created", "order.cancelled", etc.
      switch (event) {
        case 'order.created':
          await handleOrderCreated(data, timestamp);
          break;
        case 'order.status_changed':
          await handleOrderStatusChanged(data, timestamp);
          break;
        case 'order.cancelled':
          await handleOrderCancelled(data, timestamp);
          break;
        case 'order.payment_success':
          await handlePaymentSuccess(data, timestamp);
          break;
        case 'order.payment_failed':
          await handlePaymentFailed(data, timestamp);
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
 * Handle order.created event
 * @param {Object} data - Event data from checkout service
 * @param {string} timestamp - Event timestamp
 */
async function handleOrderCreated(data, timestamp) {
  // Data from checkout service: { orderId, userId, grandTotal, paymentMethod, subOrders, createdAt }
  const { orderId, userId, grandTotal, subOrders } = data;
  
  console.log(`[OrderConsumer] Processing order.created for order ${orderId}`);
  
  // 1. Log to Cassandra for analytics
  await logOrderEvent(orderId, 'CREATED', userId, 'customer', {
    totalAmount: String(grandTotal),
    subOrderCount: String(subOrders?.length || 0),
  });
  
  // 2. Send notification to each partner (shop owner)
  for (const subOrder of (subOrders || [])) {
    // Get partner ID from shop
    const partnerId = await getPartnerIdFromShop(subOrder.shopId);
    if (partnerId) {
      await notifyPartner(partnerId, {
        type: 'NEW_ORDER',
        orderId,
        subOrderId: subOrder.id,
        totalAmount: subOrder.total,
        timestamp,
      });
    }
  }
  
  // 3. Send confirmation to customer
  await notifyCustomer(userId, {
    type: 'ORDER_CONFIRMED',
    orderId,
    totalAmount: grandTotal,
    timestamp,
  });
  
  console.log(`[OrderConsumer] order.created processed for order ${orderId}`);
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
 * Get partner ID from shop ID
 */
async function getPartnerIdFromShop(shopId) {
  if (!shopId) return null;
  
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    const { data, error } = await supabaseAdmin
      .from('shops')
      .select('partner_id')
      .eq('id', shopId)
      .single();
    
    if (error || !data) return null;
    return data.partner_id;
  } catch (error) {
    console.error('[OrderConsumer] Failed to get partner ID:', error.message);
    return null;
  }
}

/**
 * Handle order.payment_success event
 */
async function handlePaymentSuccess(data, timestamp) {
  const { orderId, provider, amount, transactionId } = data;
  
  console.log(`[OrderConsumer] Processing order.payment_success for order ${orderId}`);
  
  // Log to Cassandra
  await logOrderEvent(orderId, 'PAYMENT_SUCCESS', null, 'system', {
    provider,
    amount: String(amount),
    transactionId,
  });
  
  // Get order details to notify customer
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('user_id, grand_total')
      .eq('id', orderId)
      .single();
    
    if (order) {
      await notifyCustomer(order.user_id, {
        type: 'ORDER_CONFIRMED',
        orderId,
        totalAmount: order.grand_total,
        message: 'Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.',
        timestamp,
      });
    }
  } catch (error) {
    console.error('[OrderConsumer] Failed to notify payment success:', error.message);
  }
  
  console.log(`[OrderConsumer] order.payment_success processed for order ${orderId}`);
}

/**
 * Handle order.payment_failed event
 */
async function handlePaymentFailed(data, timestamp) {
  const { orderId, provider, reason } = data;
  
  console.log(`[OrderConsumer] Processing order.payment_failed for order ${orderId}`);
  
  // Log to Cassandra
  await logOrderEvent(orderId, 'PAYMENT_FAILED', null, 'system', {
    provider,
    reason,
  });
  
  // Get order details to notify customer
  try {
    const { supabaseAdmin } = require('../../supabase/supabase.client');
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single();
    
    if (order) {
      await notifyCustomer(order.user_id, {
        type: 'ORDER_CANCELLED',
        orderId,
        reason: reason || 'Thanh toán không thành công',
        timestamp,
      });
    }
  } catch (error) {
    console.error('[OrderConsumer] Failed to notify payment failed:', error.message);
  }
  
  console.log(`[OrderConsumer] order.payment_failed processed for order ${orderId}`);
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
  ROUTING_KEYS,
};
