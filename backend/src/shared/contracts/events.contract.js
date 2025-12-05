/**
 * Event Contracts
 * 
 * Defines the structure of events published between modules.
 * This serves as documentation and can be used for validation.
 */

// ============================================
// ORDER EVENTS
// ============================================

/**
 * @typedef {Object} OrderCreatedEvent
 * @property {string} event - 'order.created'
 * @property {string} orderId - Order ID
 * @property {string} userId - User ID
 * @property {number} grandTotal - Total amount
 * @property {string} paymentMethod - Payment method
 * @property {Array<{id: string, shopId: string, total: number}>} subOrders - Sub-orders
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} OrderStatusChangedEvent
 * @property {string} event - 'order.status_changed'
 * @property {string} orderId - Order ID
 * @property {string} subOrderId - Sub-order ID
 * @property {string} oldStatus - Previous status
 * @property {string} newStatus - New status
 * @property {string} changedBy - User ID who made the change
 * @property {string} changedAt - ISO timestamp
 */

/**
 * @typedef {Object} PaymentSuccessEvent
 * @property {string} event - 'order.payment_success'
 * @property {string} orderId - Order ID
 * @property {string} provider - Payment provider (momo, vnpay, zalopay)
 * @property {string} providerTransactionId - Provider's transaction ID
 * @property {number} amount - Payment amount
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} PaymentFailedEvent
 * @property {string} event - 'order.payment_failed'
 * @property {string} orderId - Order ID
 * @property {string} provider - Payment provider
 * @property {string} errorCode - Error code
 * @property {string} errorMessage - Error message
 * @property {string} timestamp - ISO timestamp
 */

// ============================================
// PRODUCT EVENTS
// ============================================

/**
 * @typedef {Object} ProductCreatedEvent
 * @property {string} event - 'product.created'
 * @property {string} productId - Product ID
 * @property {string} shopId - Shop ID
 * @property {string} name - Product name
 * @property {string} slug - Product slug
 * @property {string} categoryId - Category ID
 * @property {string} status - Product status
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} ProductUpdatedEvent
 * @property {string} event - 'product.updated'
 * @property {string} productId - Product ID
 * @property {string} shopId - Shop ID
 * @property {string} name - Product name
 * @property {string} slug - Product slug
 * @property {string} categoryId - Category ID
 * @property {string} status - Product status
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} ProductDeletedEvent
 * @property {string} event - 'product.deleted'
 * @property {string} productId - Product ID
 * @property {string} shopId - Shop ID
 * @property {string} timestamp - ISO timestamp
 */

// ============================================
// SHOP EVENTS
// ============================================

/**
 * @typedef {Object} ShopApprovedEvent
 * @property {string} event - 'shop.approved'
 * @property {string} shopId - Shop ID
 * @property {string} partnerId - Partner user ID
 * @property {string} shopName - Shop name
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} ShopRejectedEvent
 * @property {string} event - 'shop.rejected'
 * @property {string} shopId - Shop ID
 * @property {string} partnerId - Partner user ID
 * @property {string} shopName - Shop name
 * @property {string} reason - Rejection reason
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} ShopRevisionRequiredEvent
 * @property {string} event - 'shop.revision_required'
 * @property {string} shopId - Shop ID
 * @property {string} partnerId - Partner user ID
 * @property {string} shopName - Shop name
 * @property {string} requiredChanges - Required changes description
 * @property {string} timestamp - ISO timestamp
 */

// ============================================
// SHIPMENT EVENTS
// ============================================

/**
 * @typedef {Object} ShipmentCreatedEvent
 * @property {string} event - 'SHIPMENT_CREATED'
 * @property {string} shipmentId - Shipment ID
 * @property {string} trackingNumber - Tracking number
 * @property {string} subOrderId - Sub-order ID
 * @property {string} status - Shipment status
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} ShipmentStatusChangedEvent
 * @property {string} event - 'SHIPMENT_STATUS_CHANGED'
 * @property {string} shipmentId - Shipment ID
 * @property {string} trackingNumber - Tracking number
 * @property {string} subOrderId - Sub-order ID
 * @property {string} shipperId - Shipper ID
 * @property {string} status - New status
 * @property {string} previousStatus - Previous status
 * @property {string} timestamp - ISO timestamp
 */

// ============================================
// EVENT ROUTING KEYS
// ============================================

const EVENT_ROUTING_KEYS = {
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  PAYMENT_SUCCESS: 'order.payment_success',
  PAYMENT_FAILED: 'order.payment_failed',
  
  // Product events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  
  // Shop events
  SHOP_APPROVED: 'shop.approved',
  SHOP_REJECTED: 'shop.rejected',
  SHOP_REVISION_REQUIRED: 'shop.revision_required',
  
  // Shipment events
  SHIPMENT_CREATED: 'shipment.shipment_created',
  SHIPMENT_ASSIGNED: 'shipment.shipment_assigned',
  SHIPMENT_STATUS_CHANGED: 'shipment.shipment_status_changed',
};

// ============================================
// QUEUE BINDINGS
// ============================================

const QUEUE_BINDINGS = {
  // Order consumer listens to order events
  order_events: ['order.created'],
  
  // Payment consumer listens to payment events
  payment_events: ['order.payment_success', 'order.payment_failed'],
  
  // Shipment consumer listens to shipment events
  shipment_events: ['shipment.*'],
  
  // Search consumer listens to product events
  search_events: ['product.created', 'product.updated', 'product.deleted'],
  
  // Shop consumer listens to shop events
  shop_events: ['shop.approved', 'shop.rejected', 'shop.revision_required'],
};

module.exports = {
  EVENT_ROUTING_KEYS,
  QUEUE_BINDINGS,
};
