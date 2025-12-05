/**
 * Return Service
 * Business logic for order returns and refunds
 */

const orderRepository = require('../order.repository');
const trackingService = require('./tracking.service');
const orderDTO = require('../order.dto');
const { AppError } = require('../../../shared/utils/error.util');

/**
 * Request return for an order
 */
async function requestReturn(orderId, userId, returnData) {
  const order = await orderRepository.findOrderById(orderId);
  
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (order.user_id !== userId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Get sub-orders
  const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
  
  // Check if any sub-order can be returned
  const returnableSubOrders = subOrders.filter(so => {
    if (so.status !== 'delivered') return false;
    
    // Check return window
    if (so.return_deadline) {
      const deadline = new Date(so.return_deadline);
      if (new Date() > deadline) return false;
    }
    
    return true;
  });
  
  if (returnableSubOrders.length === 0) {
    throw new AppError('ORDER_CANNOT_RETURN', 
      'No items eligible for return. Return window may have expired.', 400);
  }
  
  // Update sub-orders to return_requested
  for (const subOrder of returnableSubOrders) {
    await orderRepository.updateSubOrderStatus(subOrder.id, 'return_requested');
    
    await trackingService.addTrackingEvent(subOrder.id, {
      eventType: 'return_requested',
      description: `Return requested: ${returnData.reason} - ${returnData.description}`,
      createdBy: userId,
    });
  }
  
  return {
    message: 'Return request submitted successfully',
    returnableItems: returnableSubOrders.length,
  };
}

/**
 * Approve return request (Partner)
 */
async function approveReturn(subOrderId, partnerId) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.shop_id !== partnerId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== 'return_requested') {
    throw new AppError('INVALID_STATUS', 'Order is not in return requested status', 400);
  }
  
  await orderRepository.updateSubOrderStatus(subOrderId, 'return_approved');
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'return_approved',
    description: 'Return request approved by seller',
    createdBy: partnerId,
  });
  
  return orderDTO.serializeSubOrder(await orderRepository.findSubOrderById(subOrderId));
}


/**
 * Reject return request (Partner)
 */
async function rejectReturn(subOrderId, partnerId, reason) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.shop_id !== partnerId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== 'return_requested') {
    throw new AppError('INVALID_STATUS', 'Order is not in return requested status', 400);
  }
  
  // Reject return - set back to delivered or completed
  await orderRepository.updateSubOrderStatus(subOrderId, 'completed');
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'return_rejected',
    description: `Return request rejected: ${reason}`,
    createdBy: partnerId,
  });
  
  return orderDTO.serializeSubOrder(await orderRepository.findSubOrderById(subOrderId));
}

/**
 * Process refund for returned order
 */
async function processRefund(subOrderId, partnerId) {
  const subOrder = await orderRepository.findSubOrderById(subOrderId);
  
  if (!subOrder) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.shop_id !== partnerId) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  if (subOrder.status !== 'returned') {
    throw new AppError('INVALID_STATUS', 'Order must be in returned status', 400);
  }
  
  // Process refund (placeholder - would integrate with payment gateway)
  await orderRepository.updateSubOrderStatus(subOrderId, 'refunded');
  
  await trackingService.addTrackingEvent(subOrderId, {
    eventType: 'refunded',
    description: 'Refund processed successfully',
    createdBy: partnerId,
  });
  
  return orderDTO.serializeSubOrder(await orderRepository.findSubOrderById(subOrderId));
}

/**
 * Check if return window is valid
 */
function isReturnWindowValid(subOrder) {
  if (!subOrder.return_deadline) return false;
  
  const deadline = new Date(subOrder.return_deadline);
  return new Date() <= deadline;
}

module.exports = {
  requestReturn,
  approveReturn,
  rejectReturn,
  processRefund,
  isReturnWindowValid,
};
