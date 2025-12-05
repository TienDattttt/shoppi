/**
 * Payment Event Consumer
 * Handles PAYMENT_SUCCESS and PAYMENT_FAILED events
 * 
 * Requirements: Event-driven architecture, shipment creation
 */

const rabbitmqClient = require('../rabbitmq.client');

// Event types this consumer handles
const HANDLED_EVENTS = [
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'PAYMENT_REFUNDED',
];

// Queue name for payment events
const QUEUE_NAME = 'payment_events';

/**
 * Initialize payment consumer
 */
async function initialize() {
  const channel = await rabbitmqClient.getChannel();
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Bind to events exchange
  for (const event of HANDLED_EVENTS) {
    await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.EVENTS, event);
  }
  
  console.log('[PaymentConsumer] Initialized, listening for:', HANDLED_EVENTS.join(', '));
}

/**
 * Start consuming payment events
 */
async function start() {
  await initialize();
  
  await rabbitmqClient.consume(QUEUE_NAME, async (message) => {
    const { event, data, timestamp } = message;
    
    console.log(`[PaymentConsumer] Received event: ${event}`, { orderId: data?.orderId });
    
    try {
      switch (event) {
        case 'PAYMENT_SUCCESS':
          await handlePaymentSuccess(data, timestamp);
          break;
        case 'PAYMENT_FAILED':
          await handlePaymentFailed(data, timestamp);
          break;
        case 'PAYMENT_REFUNDED':
          await handlePaymentRefunded(data, timestamp);
          break;
        default:
          console.warn(`[PaymentConsumer] Unknown event: ${event}`);
      }
    } catch (error) {
      console.error(`[PaymentConsumer] Error handling ${event}:`, error.message);
      throw error;
    }
  });
}

/**
 * Handle PAYMENT_SUCCESS event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handlePaymentSuccess(data, timestamp) {
  const { orderId, subOrderId, amount, transactionId, provider, customerId } = data;
  
  console.log(`[PaymentConsumer] Processing PAYMENT_SUCCESS for order ${orderId}`);
  
  // 1. Create shipment automatically
  await createShipment(subOrderId, orderId);
  
  // 2. Update order status to 'paid'
  await updateOrderStatus(orderId, 'paid');
  
  // 3. Notify customer
  await notifyCustomer(customerId, {
    type: 'PAYMENT_SUCCESS',
    orderId,
    amount,
    transactionId,
    provider,
    message: `Thanh toán ${formatAmount(amount)} thành công`,
    timestamp,
  });
  
  // 4. Notify partner(s) about new paid order
  await notifyPartnerNewPaidOrder(orderId);
  
  // 5. Log analytics
  await logPaymentAnalytics('payment_success', {
    orderId,
    amount,
    provider,
    transactionId,
    timestamp,
  });
  
  console.log(`[PaymentConsumer] PAYMENT_SUCCESS processed for order ${orderId}`);
}

/**
 * Handle PAYMENT_FAILED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handlePaymentFailed(data, timestamp) {
  const { orderId, customerId, errorCode, errorMessage, provider } = data;
  
  console.log(`[PaymentConsumer] Processing PAYMENT_FAILED for order ${orderId}`);
  
  // 1. Update order payment status
  await updateOrderPaymentStatus(orderId, 'failed', errorCode);
  
  // 2. Notify customer
  await notifyCustomer(customerId, {
    type: 'PAYMENT_FAILED',
    orderId,
    errorCode,
    errorMessage,
    message: 'Thanh toán không thành công. Vui lòng thử lại.',
    timestamp,
  });
  
  // 3. Log analytics
  await logPaymentAnalytics('payment_failed', {
    orderId,
    errorCode,
    errorMessage,
    provider,
    timestamp,
  });
  
  console.log(`[PaymentConsumer] PAYMENT_FAILED processed for order ${orderId}`);
}

/**
 * Handle PAYMENT_REFUNDED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handlePaymentRefunded(data, timestamp) {
  const { orderId, customerId, refundAmount, refundId, reason } = data;
  
  console.log(`[PaymentConsumer] Processing PAYMENT_REFUNDED for order ${orderId}`);
  
  // 1. Update order status
  await updateOrderStatus(orderId, 'refunded');
  
  // 2. Notify customer
  await notifyCustomer(customerId, {
    type: 'PAYMENT_REFUNDED',
    orderId,
    refundAmount,
    refundId,
    message: `Hoàn tiền ${formatAmount(refundAmount)} thành công`,
    timestamp,
  });
  
  // 3. Log analytics
  await logPaymentAnalytics('payment_refunded', {
    orderId,
    refundAmount,
    refundId,
    reason,
    timestamp,
  });
  
  console.log(`[PaymentConsumer] PAYMENT_REFUNDED processed for order ${orderId}`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create shipment for sub-order
 */
async function createShipment(subOrderId, orderId) {
  try {
    // Publish event to create shipment
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'SHIPMENT_CREATE_REQUEST',
      {
        event: 'SHIPMENT_CREATE_REQUEST',
        data: { subOrderId, orderId },
        timestamp: new Date().toISOString(),
      }
    );
    console.log(`[PaymentConsumer] Shipment creation requested for sub-order ${subOrderId}`);
  } catch (error) {
    console.error('[PaymentConsumer] Failed to create shipment:', error.message);
  }
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId, status) {
  try {
    // This would typically call order service
    // For now, publish an event
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'ORDER_STATUS_UPDATE_REQUEST',
      {
        event: 'ORDER_STATUS_UPDATE_REQUEST',
        data: { orderId, status },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[PaymentConsumer] Failed to update order status:', error.message);
  }
}

/**
 * Update order payment status
 */
async function updateOrderPaymentStatus(orderId, paymentStatus, errorCode = null) {
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'ORDER_PAYMENT_STATUS_UPDATE',
      {
        event: 'ORDER_PAYMENT_STATUS_UPDATE',
        data: { orderId, paymentStatus, errorCode },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[PaymentConsumer] Failed to update payment status:', error.message);
  }
}

/**
 * Notify partner about new paid order
 */
async function notifyPartnerNewPaidOrder(orderId) {
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'PARTNER_NEW_PAID_ORDER',
      {
        event: 'PARTNER_NEW_PAID_ORDER',
        data: { orderId },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[PaymentConsumer] Failed to notify partner:', error.message);
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
    console.error('[PaymentConsumer] Failed to notify customer:', error.message);
  }
}

/**
 * Log payment analytics
 */
async function logPaymentAnalytics(eventName, data) {
  try {
    await rabbitmqClient.publishAnalyticsEvent(eventName, data);
  } catch (error) {
    console.error('[PaymentConsumer] Failed to log analytics:', error.message);
  }
}

/**
 * Format amount for display
 */
function formatAmount(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Stop consumer
 */
async function stop() {
  console.log('[PaymentConsumer] Stopping...');
}

module.exports = {
  initialize,
  start,
  stop,
  QUEUE_NAME,
  HANDLED_EVENTS,
};
