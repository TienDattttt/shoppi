/**
 * Shipment Event Consumer
 * Handles SHIPMENT_STATUS_CHANGED and related events
 * 
 * Requirements: Event-driven architecture, order status sync
 */

const rabbitmqClient = require('../rabbitmq.client');

// Event types this consumer handles
const HANDLED_EVENTS = [
  'SHIPMENT_CREATED',
  'SHIPMENT_ASSIGNED',
  'SHIPMENT_STATUS_CHANGED',
  'SHIPMENT_CREATE_REQUEST',
];

// Queue name for shipment events
const QUEUE_NAME = 'shipment_events';

// Shipment status to order status mapping
const STATUS_MAPPING = {
  'assigned': 'processing',
  'picked_up': 'shipped',
  'delivering': 'shipped',
  'delivered': 'delivered',
  'failed': 'delivery_failed',
  'returned': 'returned',
};

/**
 * Initialize shipment consumer
 */
async function initialize() {
  const channel = await rabbitmqClient.getChannel();
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Bind to events exchange
  for (const event of HANDLED_EVENTS) {
    await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.EVENTS, event);
  }
  
  console.log('[ShipmentConsumer] Initialized, listening for:', HANDLED_EVENTS.join(', '));
}

/**
 * Start consuming shipment events
 */
async function start() {
  await initialize();
  
  await rabbitmqClient.consume(QUEUE_NAME, async (message) => {
    const { event, data, timestamp } = message;
    
    console.log(`[ShipmentConsumer] Received event: ${event}`, { shipmentId: data?.shipmentId });
    
    try {
      switch (event) {
        case 'SHIPMENT_CREATED':
          await handleShipmentCreated(data, timestamp);
          break;
        case 'SHIPMENT_ASSIGNED':
          await handleShipmentAssigned(data, timestamp);
          break;
        case 'SHIPMENT_STATUS_CHANGED':
          await handleShipmentStatusChanged(data, timestamp);
          break;
        case 'SHIPMENT_CREATE_REQUEST':
          await handleShipmentCreateRequest(data, timestamp);
          break;
        default:
          console.warn(`[ShipmentConsumer] Unknown event: ${event}`);
      }
    } catch (error) {
      console.error(`[ShipmentConsumer] Error handling ${event}:`, error.message);
      throw error;
    }
  });
}

/**
 * Handle SHIPMENT_CREATED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentCreated(data, timestamp) {
  const { shipmentId, trackingNumber, subOrderId, orderId } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_CREATED for shipment ${shipmentId}`);
  
  // 1. Update sub-order with tracking number
  await updateSubOrderTracking(subOrderId, trackingNumber);
  
  // 2. Notify customer with tracking info
  await notifyCustomerTrackingCreated(orderId, trackingNumber);
  
  // 3. Log analytics
  await logShipmentAnalytics('shipment_created', {
    shipmentId,
    trackingNumber,
    subOrderId,
    orderId,
    timestamp,
  });
  
  console.log(`[ShipmentConsumer] SHIPMENT_CREATED processed for shipment ${shipmentId}`);
}

/**
 * Handle SHIPMENT_ASSIGNED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentAssigned(data, timestamp) {
  const { shipmentId, trackingNumber, shipperId, shipperName, orderId, customerId } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_ASSIGNED for shipment ${shipmentId}`);
  
  // 1. Update order status
  await updateOrderStatus(orderId, 'processing');
  
  // 2. Notify customer
  await notifyCustomer(customerId, {
    type: 'SHIPPER_ASSIGNED',
    orderId,
    trackingNumber,
    shipperName,
    message: `Shipper ${shipperName} đã nhận đơn hàng của bạn`,
    timestamp,
  });
  
  // 3. Notify shipper
  await notifyShipper(shipperId, {
    type: 'NEW_SHIPMENT',
    shipmentId,
    trackingNumber,
    message: 'Bạn có đơn giao hàng mới',
    timestamp,
  });
  
  console.log(`[ShipmentConsumer] SHIPMENT_ASSIGNED processed for shipment ${shipmentId}`);
}

/**
 * Handle SHIPMENT_STATUS_CHANGED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentStatusChanged(data, timestamp) {
  const { 
    shipmentId, 
    trackingNumber, 
    subOrderId, 
    orderId, 
    customerId,
    shipperId,
    previousStatus, 
    status,
  } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_STATUS_CHANGED: ${previousStatus} -> ${status}`);
  
  // 1. Update order status based on shipment status
  const orderStatus = STATUS_MAPPING[status];
  if (orderStatus) {
    await updateOrderStatus(orderId, orderStatus);
  }
  
  // 2. Send notification based on status
  const notificationConfig = getNotificationConfig(status);
  if (notificationConfig) {
    await notifyCustomer(customerId, {
      type: notificationConfig.type,
      orderId,
      trackingNumber,
      message: notificationConfig.message,
      timestamp,
    });
  }
  
  // 3. Handle specific status actions
  switch (status) {
    case 'picked_up':
      await handlePickedUp(data);
      break;
    case 'delivered':
      await handleDelivered(data);
      break;
    case 'failed':
      await handleDeliveryFailed(data);
      break;
  }
  
  // 4. Log analytics
  await logShipmentAnalytics('shipment_status_changed', {
    shipmentId,
    trackingNumber,
    previousStatus,
    status,
    orderId,
    timestamp,
  });
  
  console.log(`[ShipmentConsumer] SHIPMENT_STATUS_CHANGED processed for shipment ${shipmentId}`);
}

/**
 * Handle SHIPMENT_CREATE_REQUEST event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleShipmentCreateRequest(data, timestamp) {
  const { subOrderId, orderId } = data;
  
  console.log(`[ShipmentConsumer] Processing SHIPMENT_CREATE_REQUEST for sub-order ${subOrderId}`);
  
  // This would typically call shipment service to create shipment
  // For now, just log it
  console.log(`[ShipmentConsumer] Would create shipment for sub-order ${subOrderId}`);
  
  // In real implementation:
  // const shipmentService = require('../../../modules/shipper/shipment.service');
  // await shipmentService.createShipment(subOrderData, deliveryInfo);
}

// ============================================
// STATUS-SPECIFIC HANDLERS
// ============================================

/**
 * Handle picked up status
 */
async function handlePickedUp(data) {
  const { orderId, partnerId } = data;
  
  // Notify partner that order was picked up
  if (partnerId) {
    await notifyPartner(partnerId, {
      type: 'ORDER_PICKED_UP',
      orderId,
      message: 'Đơn hàng đã được shipper lấy',
    });
  }
}

/**
 * Handle delivered status
 */
async function handleDelivered(data) {
  const { orderId, shipperId, customerId } = data;
  
  // 1. Mark order as completed
  await updateOrderStatus(orderId, 'completed');
  
  // 2. Trigger review request after delay
  await scheduleReviewRequest(customerId, orderId);
}

/**
 * Handle delivery failed status
 */
async function handleDeliveryFailed(data) {
  const { orderId, customerId, failureReason } = data;
  
  // Notify customer about failed delivery
  await notifyCustomer(customerId, {
    type: 'DELIVERY_FAILED',
    orderId,
    reason: failureReason,
    message: `Giao hàng không thành công: ${failureReason}`,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get notification config for status
 */
function getNotificationConfig(status) {
  const configs = {
    'picked_up': {
      type: 'SHIPMENT_PICKED_UP',
      message: 'Shipper đã lấy hàng và đang trên đường giao',
    },
    'delivering': {
      type: 'SHIPMENT_DELIVERING',
      message: 'Đơn hàng đang được giao đến bạn',
    },
    'delivered': {
      type: 'SHIPMENT_DELIVERED',
      message: 'Đơn hàng đã được giao thành công',
    },
    'failed': {
      type: 'SHIPMENT_FAILED',
      message: 'Giao hàng không thành công',
    },
  };
  
  return configs[status];
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId, status) {
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'ORDER_STATUS_UPDATE_REQUEST',
      {
        event: 'ORDER_STATUS_UPDATE_REQUEST',
        data: { orderId, status, source: 'shipment' },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to update order status:', error.message);
  }
}

/**
 * Update sub-order tracking
 */
async function updateSubOrderTracking(subOrderId, trackingNumber) {
  try {
    await rabbitmqClient.publishToExchange(
      rabbitmqClient.EXCHANGES.EVENTS,
      'SUBORDER_TRACKING_UPDATE',
      {
        event: 'SUBORDER_TRACKING_UPDATE',
        data: { subOrderId, trackingNumber },
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to update tracking:', error.message);
  }
}

/**
 * Notify customer about tracking created
 */
async function notifyCustomerTrackingCreated(orderId, trackingNumber) {
  // Would fetch customer ID from order
  console.log(`[ShipmentConsumer] Would notify customer about tracking ${trackingNumber}`);
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
    console.error('[ShipmentConsumer] Failed to notify customer:', error.message);
  }
}

/**
 * Send notification to shipper
 */
async function notifyShipper(shipperId, notification) {
  try {
    await rabbitmqClient.publishNotification('push', {
      userId: shipperId,
      userRole: 'shipper',
      ...notification,
    });
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to notify shipper:', error.message);
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
    console.error('[ShipmentConsumer] Failed to notify partner:', error.message);
  }
}

/**
 * Schedule review request
 */
async function scheduleReviewRequest(customerId, orderId) {
  // Would schedule a delayed notification
  console.log(`[ShipmentConsumer] Would schedule review request for order ${orderId}`);
}

/**
 * Log shipment analytics
 */
async function logShipmentAnalytics(eventName, data) {
  try {
    await rabbitmqClient.publishAnalyticsEvent(eventName, data);
  } catch (error) {
    console.error('[ShipmentConsumer] Failed to log analytics:', error.message);
  }
}

/**
 * Stop consumer
 */
async function stop() {
  console.log('[ShipmentConsumer] Stopping...');
}

module.exports = {
  initialize,
  start,
  stop,
  QUEUE_NAME,
  HANDLED_EVENTS,
};
