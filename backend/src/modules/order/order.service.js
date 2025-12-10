/**
 * Order Service
 * Business logic for order operations
 */

const orderRepository = require('./order.repository');
const orderDTO = require('./order.dto');
const trackingService = require('./services/tracking.service');
const { AppError } = require('../../shared/utils/error.util');
const rabbitmq = require('../../shared/rabbitmq/rabbitmq.client');
const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * Helper to get shop_id from partner_id
 * Auto-creates shop if not exists
 */
async function getShopIdFromPartner(partnerId) {
  try {
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('partner_id', partnerId)
      .single();
    
    if (!error && shop) {
      return shop.id;
    }
    
    // Shop not found, try to auto-create
    console.log(`[OrderService] Shop not found for partner ${partnerId}, auto-creating...`);
    
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name, email, phone')
      .eq('id', partnerId)
      .single();
    
    // Generate unique shop name and slug
    const timestamp = Date.now();
    const shopName = user?.full_name ? `${user.full_name}'s Shop` : `Shop ${timestamp}`;
    const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + timestamp;
    
    const { data: newShop, error: createError } = await supabaseAdmin
      .from('shops')
      .insert({
        partner_id: partnerId,
        shop_name: shopName,
        slug: slug,
        email: user?.email,
        phone: user?.phone,
        status: 'active',
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error('[OrderService] Failed to auto-create shop:', createError.message, createError.details);
      // Return null instead of throwing - will return empty orders
      return null;
    }
    
    console.log(`[OrderService] Auto-created shop ${newShop.id} for partner ${partnerId}`);
    return newShop.id;
  } catch (err) {
    console.error('[OrderService] Error in getShopIdFromPartner:', err.message);
    return null;
  }
}

/**
 * Publish order status changed event
 */
async function publishStatusChangedEvent(orderId, subOrderId, oldStatus, newStatus, changedBy) {
  try {
    await rabbitmq.publishOrderEvent('status_changed', {
      orderId,
      subOrderId,
      oldStatus,
      newStatus,
      changedBy,
      changedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to publish ORDER_STATUS_CHANGED event:', error.message);
  }
}

// Order status constants
const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_FAILED: 'payment_failed',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

// SubOrder status constants
const SUB_ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  READY_TO_SHIP: 'ready_to_ship',
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RETURN_REQUESTED: 'return_requested',
  RETURN_APPROVED: 'return_approved',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
};

// Valid status transitions
const VALID_TRANSITIONS = {
  [SUB_ORDER_STATUS.PENDING]: [SUB_ORDER_STATUS.CONFIRMED, SUB_ORDER_STATUS.CANCELLED],
  [SUB_ORDER_STATUS.CONFIRMED]: [SUB_ORDER_STATUS.PROCESSING, SUB_ORDER_STATUS.CANCELLED],
  [SUB_ORDER_STATUS.PROCESSING]: [SUB_ORDER_STATUS.READY_TO_SHIP, SUB_ORDER_STATUS.CANCELLED],
  [SUB_ORDER_STATUS.READY_TO_SHIP]: [SUB_ORDER_STATUS.SHIPPING],
  [SUB_ORDER_STATUS.SHIPPING]: [SUB_ORDER_STATUS.DELIVERED],
  [SUB_ORDER_STATUS.DELIVERED]: [SUB_ORDER_STATUS.COMPLETED, SUB_ORDER_STATUS.RETURN_REQUESTED],
  [SUB_ORDER_STATUS.RETURN_REQUESTED]: [SUB_ORDER_STATUS.RETURN_APPROVED, SUB_ORDER_STATUS.COMPLETED],
  [SUB_ORDER_STATUS.RETURN_APPROVED]: [SUB_ORDER_STATUS.RETURNED],
  [SUB_ORDER_STATUS.RETURNED]: [SUB_ORDER_STATUS.REFUNDED],
};

/**
 * Validate status transition
 */
function isValidTransition(currentStatus, newStatus) {
  const validNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
  return validNextStatuses.includes(newStatus);
}

/**
 * Get order by ID
 */
async function getOrderById(orderId, userId) {
  const order = await orderRepository.findOrderById(orderId);
  
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Check ownership
  if (order.user_id !== userId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  return orderDTO.serializeOrder(order);
}

/**
 * Get user's orders with filters
 */
async function getOrders(userId, filters = {}) {
  const { status, startDate, endDate, page = 1, limit = 10 } = filters;
  
  const result = await orderRepository.findOrdersByUser(userId, {
    status,
    startDate,
    endDate,
    page: parseInt(page),
    limit: parseInt(limit),
  });
  
  return {
    orders: result.orders.map(orderDTO.serializeOrder),
    pagination: result.pagination,
  };
}

/**
 * Get partner's orders
 */
async function getPartnerOrders(partnerId, filters = {}) {
  const { status, page = 1, limit = 10 } = filters;
  
  const shopId = await getShopIdFromPartner(partnerId);
  
  if (!shopId) {
    return {
      orders: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0,
      },
    };
  }
  
  const result = await orderRepository.findSubOrdersByShop(shopId, {
    status,
    page: parseInt(page),
    limit: parseInt(limit),
  });
  
  return {
    orders: result.orders.map(orderDTO.serializeSubOrder),
    pagination: result.pagination,
  };
}

/**
 * Cancel order (Customer)
 */
async function cancelOrder(orderId, userId, reason) {
  const order = await orderRepository.findOrderById(orderId);
  
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (order.user_id !== userId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Check if order can be cancelled
  const cancellableStatuses = [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CONFIRMED];
  if (!cancellableStatuses.includes(order.status)) {
    throw new AppError('ORDER_CANNOT_CANCEL', 'Order cannot be cancelled at this stage', 400);
  }
  
  // Check sub-orders status - reject if any is shipping
  const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
  const hasShippingOrder = subOrders.some(so => so.status === SUB_ORDER_STATUS.SHIPPING);
  
  if (hasShippingOrder) {
    throw new AppError('ORDER_CANNOT_CANCEL', 'Cannot cancel order that is already shipping', 400);
  }
  
  // Cancel order and release stock
  const updatedOrder = await orderRepository.cancelOrder(orderId, reason);
  
  // Add tracking event
  for (const subOrder of subOrders) {
    await trackingService.addTrackingEvent(subOrder.id, {
      eventType: 'cancelled',
      description: `Order cancelled by customer: ${reason}`,
      createdBy: userId,
    });
  }
  
  return orderDTO.serializeOrder(updatedOrder);
}

/**
 * Confirm receipt (Customer)
 */
async function confirmReceipt(orderId, userId) {
  const order = await orderRepository.findOrderById(orderId);
  
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (order.user_id !== userId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Get sub-orders and confirm each delivered one
  const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
  
  for (const subOrder of subOrders) {
    if (subOrder.status === SUB_ORDER_STATUS.DELIVERED) {
      await orderRepository.updateSubOrderStatus(subOrder.id, SUB_ORDER_STATUS.COMPLETED);
      
      await trackingService.addTrackingEvent(subOrder.id, {
        eventType: 'completed',
        description: 'Receipt confirmed by customer',
        createdBy: userId,
      });
    }
  }
  
  // Check if all sub-orders are completed
  const allCompleted = subOrders.every(so => 
    so.status === SUB_ORDER_STATUS.COMPLETED || so.status === SUB_ORDER_STATUS.CANCELLED
  );
  
  if (allCompleted) {
    await orderRepository.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);
  }
  
  return orderDTO.serializeOrder(await orderRepository.findOrderById(orderId));
}

/**
 * Confirm order (Partner)
 */
async function confirmOrder(subOrderId, partnerId) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Verify shop ownership via partner_id
  const shopId = await getShopIdFromPartner(partnerId);
  if (!shopId || subOrder.shop_id !== shopId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== SUB_ORDER_STATUS.PENDING) {
    throw new AppError('INVALID_STATUS_TRANSITION', 'Order cannot be confirmed at this stage', 400);
  }
  
  const updatedSubOrder = await orderRepository.updateSubOrderStatus(subOrderId, SUB_ORDER_STATUS.PROCESSING);
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'confirmed',
    description: 'Order confirmed by seller',
    createdBy: partnerId,
  });
  
  // Publish status changed event
  await publishStatusChangedEvent(subOrder.order_id, subOrderId, SUB_ORDER_STATUS.PENDING, SUB_ORDER_STATUS.PROCESSING, partnerId);
  
  return orderDTO.serializeSubOrder(updatedSubOrder);
}

/**
 * Pack order (Partner)
 */
async function packOrder(subOrderId, partnerId) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Verify shop ownership via partner_id
  const shopId = await getShopIdFromPartner(partnerId);
  if (!shopId || subOrder.shop_id !== shopId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== SUB_ORDER_STATUS.PROCESSING) {
    throw new AppError('INVALID_STATUS_TRANSITION', 'Order must be in processing status to pack', 400);
  }
  
  const updatedSubOrder = await orderRepository.updateSubOrderStatus(subOrderId, SUB_ORDER_STATUS.READY_TO_SHIP);
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'packed',
    description: 'Order packed and ready for pickup',
    createdBy: partnerId,
  });
  
  // Publish status changed event
  await publishStatusChangedEvent(subOrder.order_id, subOrderId, SUB_ORDER_STATUS.PROCESSING, SUB_ORDER_STATUS.READY_TO_SHIP, partnerId);
  
  return orderDTO.serializeSubOrder(updatedSubOrder);
}

/**
 * Cancel by partner
 */
async function cancelByPartner(subOrderId, partnerId, reason) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Verify shop ownership via partner_id
  const shopId = await getShopIdFromPartner(partnerId);
  if (!shopId || subOrder.shop_id !== shopId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  const cancellableStatuses = [SUB_ORDER_STATUS.PENDING, SUB_ORDER_STATUS.CONFIRMED, SUB_ORDER_STATUS.PROCESSING];
  if (!cancellableStatuses.includes(subOrder.status)) {
    throw new AppError('ORDER_CANNOT_CANCEL', 'Order cannot be cancelled at this stage', 400);
  }
  
  const oldStatus = subOrder.status;
  const updatedSubOrder = await orderRepository.cancelSubOrder(subOrderId, reason);
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'cancelled',
    description: `Order cancelled by seller: ${reason}`,
    createdBy: partnerId,
  });
  
  // Publish status changed event
  await publishStatusChangedEvent(subOrder.order_id, subOrderId, oldStatus, SUB_ORDER_STATUS.CANCELLED, partnerId);
  
  return orderDTO.serializeSubOrder(updatedSubOrder);
}

/**
 * Pickup order (Shipper)
 */
async function pickupOrder(subOrderId, shipperId) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== SUB_ORDER_STATUS.READY_TO_SHIP) {
    throw new AppError('INVALID_STATUS_TRANSITION', 'Order must be ready to ship for pickup', 400);
  }
  
  const updatedSubOrder = await orderRepository.updateSubOrderForShipping(subOrderId, shipperId);
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'picked_up',
    description: 'Package picked up by shipper',
    createdBy: shipperId,
  });
  
  // Publish status changed event
  await publishStatusChangedEvent(subOrder.order_id, subOrderId, SUB_ORDER_STATUS.READY_TO_SHIP, SUB_ORDER_STATUS.SHIPPING, shipperId);
  
  return orderDTO.serializeSubOrder(updatedSubOrder);
}

/**
 * Deliver order (Shipper)
 */
async function deliverOrder(subOrderId, shipperId, proofOfDelivery) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.shipper_id !== shipperId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== SUB_ORDER_STATUS.SHIPPING) {
    throw new AppError('INVALID_STATUS_TRANSITION', 'Order must be in shipping status', 400);
  }
  
  const updatedSubOrder = await orderRepository.markAsDelivered(subOrderId, proofOfDelivery);
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'delivered',
    description: 'Package delivered successfully',
    createdBy: shipperId,
  });
  
  // Publish status changed event
  await publishStatusChangedEvent(subOrder.order_id, subOrderId, SUB_ORDER_STATUS.SHIPPING, SUB_ORDER_STATUS.DELIVERED, shipperId);
  
  return orderDTO.serializeSubOrder(updatedSubOrder);
}

/**
 * Fail delivery (Shipper)
 */
async function failDelivery(subOrderId, shipperId, reason) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.shipper_id !== shipperId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== SUB_ORDER_STATUS.SHIPPING) {
    throw new AppError('INVALID_STATUS_TRANSITION', 'Order must be in shipping status', 400);
  }
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'delivery_failed',
    description: `Delivery failed: ${reason}`,
    createdBy: shipperId,
  });
  
  return orderDTO.serializeSubOrder(subOrder);
}

// ============================================
// PAYMENT HANDLING (Called by webhooks via service layer)
// ============================================

/**
 * Handle successful payment
 * Called by payment webhooks after payment verification
 * @param {string} orderId - Order ID
 * @param {object} transactionData - Payment transaction details
 * @returns {Promise<object>}
 */
async function handlePaymentSuccess(orderId, transactionData) {
  const { provider, providerTransactionId, amount } = transactionData;
  
  console.log(`[OrderService] Processing payment success for order ${orderId}`);
  
  // Update order payment status
  await orderRepository.updatePaymentStatus(orderId, 'paid');
  
  // Update sub-orders to pending (waiting for partner confirmation)
  const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
  for (const subOrder of subOrders) {
    await orderRepository.updateSubOrderStatus(subOrder.id, SUB_ORDER_STATUS.PENDING);
    
    // Add tracking event
    await trackingService.addTrackingEvent(subOrder.id, {
      eventType: 'payment_confirmed',
      description: `Payment confirmed via ${provider}`,
      createdBy: 'system',
    });
  }
  
  // Store payment transaction details
  await storePaymentTransaction(orderId, {
    provider,
    providerTransactionId,
    amount,
    status: 'paid',
    processedAt: new Date().toISOString(),
  });
  
  console.log(`[OrderService] Payment success processed for order ${orderId}`);
  
  return { success: true, orderId };
}

/**
 * Handle failed payment
 * Called by payment webhooks after payment verification
 * @param {string} orderId - Order ID
 * @param {object} transactionData - Payment transaction details
 * @returns {Promise<object>}
 */
async function handlePaymentFailed(orderId, transactionData) {
  const { provider, providerTransactionId, errorCode, errorMessage } = transactionData;
  
  console.log(`[OrderService] Processing payment failure for order ${orderId}`);
  
  // Update order status
  await orderRepository.updatePaymentStatus(orderId, 'failed');
  await orderRepository.updateOrderStatus(orderId, ORDER_STATUS.PAYMENT_FAILED);
  
  // Release reserved stock
  await releaseReservedStock(orderId);
  
  // Store payment transaction details
  await storePaymentTransaction(orderId, {
    provider,
    providerTransactionId,
    status: 'failed',
    errorCode,
    errorMessage,
    processedAt: new Date().toISOString(),
  });
  
  console.log(`[OrderService] Payment failure processed for order ${orderId}`);
  
  return { success: true, orderId };
}

/**
 * Release reserved stock for failed/cancelled orders
 * @param {string} orderId - Order ID
 */
async function releaseReservedStock(orderId) {
  try {
    const orderItems = await orderRepository.findOrderItemsByOrderId(orderId);
    
    for (const item of orderItems) {
      // This would update product_variants.reserved_quantity
      // Implementation depends on inventory service
      console.log(`[OrderService] Releasing stock for variant ${item.variant_id}, qty: ${item.quantity}`);
    }
  } catch (error) {
    console.error(`[OrderService] Failed to release stock for order ${orderId}:`, error.message);
  }
}

/**
 * Store payment transaction details
 * @param {string} orderId - Order ID
 * @param {object} transactionData - Transaction details
 */
async function storePaymentTransaction(orderId, transactionData) {
  try {
    // This would store in a payments table
    // For now, just log
    console.log(`[OrderService] Storing transaction for order ${orderId}:`, transactionData);
  } catch (error) {
    console.error(`[OrderService] Failed to store transaction:`, error.message);
  }
}

module.exports = {
  // Constants
  ORDER_STATUS,
  SUB_ORDER_STATUS,
  VALID_TRANSITIONS,
  
  // Functions
  isValidTransition,
  getOrderById,
  getOrders,
  getPartnerOrders,
  cancelOrder,
  confirmReceipt,
  confirmOrder,
  packOrder,
  cancelByPartner,
  pickupOrder,
  deliverOrder,
  failDelivery,
  
  // Payment handling (for webhooks)
  handlePaymentSuccess,
  handlePaymentFailed,
};
