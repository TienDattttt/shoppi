/**
 * Order Controller
 * Handles HTTP requests for order operations
 */

const orderService = require('./order.service');
const cartService = require('./services/cart.service');
const checkoutService = require('./services/checkout.service');
const paymentService = require('./services/payment.service');
const returnService = require('./services/return.service');
const voucherService = require('./services/voucher.service');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');

// Helper to send success response with message
function successResponse(res, data, message = 'Success', statusCode = 200) {
  // sendSuccess expects (res, data, statusCode) - data will be wrapped in { success: true, data: {...} }
  return sendSuccess(res, data, statusCode);
}

// Helper to handle error responses
function errorResponse(res, error) {
  console.error('[OrderController] Error:', error.message || error);
  const statusCode = error.statusCode || error.status || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'An unexpected error occurred';
  return sendError(res, code, message, statusCode);
}

// ==================== CART OPERATIONS ====================

/**
 * Get user's cart
 */
async function getCart(req, res) {
  try {
    console.log('[OrderController] getCart called, user:', req.user);
    const userId = req.user.userId;
    if (!userId) {
      console.error('[OrderController] No userId in request');
      return errorResponse(res, { code: 'AUTH_ERROR', message: 'User ID not found', statusCode: 401 });
    }
    const cart = await cartService.getCart(userId);
    console.log('[OrderController] Cart retrieved successfully');
    return successResponse(res, cart, 'Cart retrieved successfully');
  } catch (error) {
    console.error('[OrderController] getCart error:', error);
    return errorResponse(res, error);
  }
}

/**
 * Add item to cart
 */
async function addToCart(req, res) {
  try {
    const userId = req.user.userId;
    const cartItem = await cartService.addItem(userId, req.body);
    return successResponse(res, cartItem, 'Item added to cart', 201);
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Update cart item quantity
 */
async function updateCartItem(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { quantity } = req.body;
    const cartItem = await cartService.updateItem(userId, id, quantity);
    return successResponse(res, cartItem, 'Cart item updated');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Remove item from cart
 */
async function removeFromCart(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    await cartService.removeItem(userId, id);
    return successResponse(res, null, 'Item removed from cart');
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ==================== ORDER OPERATIONS ====================

/**
 * Create order (checkout)
 */
async function checkout(req, res) {
  try {
    const userId = req.user.userId;
    const order = await checkoutService.createOrder(userId, req.body);
    return successResponse(res, order, 'Order created successfully', 201);
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get user's orders
 */
async function getOrders(req, res) {
  try {
    const userId = req.user.userId;
    const filters = req.query;
    const orders = await orderService.getOrders(userId, filters);
    return successResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get order detail
 */
async function getOrderById(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const order = await orderService.getOrderById(id, userId);
    return successResponse(res, order, 'Order retrieved successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Cancel order (Customer)
 */
async function cancelOrder(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;
    const order = await orderService.cancelOrder(id, userId, reason);
    return successResponse(res, order, 'Order cancelled successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Confirm receipt (Customer)
 */
async function confirmReceipt(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const order = await orderService.confirmReceipt(id, userId);
    return successResponse(res, order, 'Receipt confirmed successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Request return (Customer)
 */
async function requestReturn(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const returnRequest = await returnService.requestReturn(id, userId, req.body);
    return successResponse(res, returnRequest, 'Return request submitted', 201);
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ==================== PARTNER OPERATIONS ====================

/**
 * Get partner's orders
 */
async function getPartnerOrders(req, res) {
  try {
    const partnerId = req.user.userId;
    console.log('[OrderController] getPartnerOrders called for partnerId:', partnerId);
    const filters = req.query;
    const orders = await orderService.getPartnerOrders(partnerId, filters);
    console.log('[OrderController] getPartnerOrders result:', { orderCount: orders?.orders?.length || 0 });
    return successResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    console.error('[OrderController] getPartnerOrders error:', error);
    return errorResponse(res, error);
  }
}

/**
 * Confirm order (Partner)
 */
async function confirmOrder(req, res) {
  try {
    const partnerId = req.user.userId;
    const { id } = req.params;
    const order = await orderService.confirmOrder(id, partnerId);
    return successResponse(res, order, 'Order confirmed successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Mark order as packed (Partner)
 */
async function packOrder(req, res) {
  try {
    const partnerId = req.user.userId;
    const { id } = req.params;
    const order = await orderService.packOrder(id, partnerId);
    return successResponse(res, order, 'Order marked as packed');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Cancel order (Partner)
 */
async function cancelByPartner(req, res) {
  try {
    const partnerId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;
    const order = await orderService.cancelByPartner(id, partnerId, reason);
    return successResponse(res, order, 'Order cancelled by partner');
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ==================== SHIPPER OPERATIONS ====================

/**
 * Pickup order (Shipper)
 */
async function pickupOrder(req, res) {
  try {
    const shipperId = req.user.userId;
    const { id } = req.params;
    const order = await orderService.pickupOrder(id, shipperId);
    return successResponse(res, order, 'Order picked up');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Mark order as delivered (Shipper)
 */
async function deliverOrder(req, res) {
  try {
    const shipperId = req.user.userId;
    const { id } = req.params;
    const { proofOfDelivery } = req.body;
    const order = await orderService.deliverOrder(id, shipperId, proofOfDelivery);
    return successResponse(res, order, 'Order delivered successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Mark delivery as failed (Shipper)
 */
async function failDelivery(req, res) {
  try {
    const shipperId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;
    const order = await orderService.failDelivery(id, shipperId, reason);
    return successResponse(res, order, 'Delivery marked as failed');
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ==================== PAYMENT OPERATIONS ====================

/**
 * VNPay callback
 */
async function vnpayCallback(req, res) {
  try {
    await paymentService.handleCallback('vnpay', req.query);
    return res.redirect('/payment/success');
  } catch (error) {
    return res.redirect('/payment/failed');
  }
}

/**
 * MoMo callback
 */
async function momoCallback(req, res) {
  try {
    await paymentService.handleCallback('momo', req.body);
    return successResponse(res, null, 'Callback processed');
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ==================== VOUCHER OPERATIONS ====================

/**
 * Validate voucher
 */
async function validateVoucher(req, res) {
  try {
    const userId = req.user.userId;
    const { code, orderTotal, shopId } = req.query;
    const validation = await voucherService.validateVoucher(code, userId, parseFloat(orderTotal), shopId);
    return successResponse(res, validation, 'Voucher validated');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get available vouchers for checkout
 */
async function getAvailableVouchers(req, res) {
  try {
    const userId = req.user.userId;
    const { orderTotal, shopId } = req.query;
    const vouchers = await voucherService.getAvailableVouchers(userId, parseFloat(orderTotal) || 0, shopId);
    return successResponse(res, vouchers, 'Available vouchers retrieved');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get platform vouchers (for săn voucher page)
 */
async function getPlatformVouchers(req, res) {
  try {
    const userId = req.user?.userId;
    const vouchers = await voucherService.getPlatformVouchers(userId);
    return successResponse(res, vouchers, 'Platform vouchers retrieved');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get shop vouchers
 */
async function getShopVouchers(req, res) {
  try {
    const userId = req.user?.userId;
    const { shopId } = req.params;
    const vouchers = await voucherService.getShopVouchers(shopId, userId);
    return successResponse(res, vouchers, 'Shop vouchers retrieved');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Collect voucher to wallet
 */
async function collectVoucher(req, res) {
  try {
    const userId = req.user.userId;
    const { code } = req.body;
    const result = await voucherService.collectVoucher(userId, code);
    return successResponse(res, result, 'Voucher collected');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get user's collected vouchers (voucher wallet)
 */
async function getMyVouchers(req, res) {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    const vouchers = await voucherService.getMyVouchers(userId, status || 'all');
    return successResponse(res, vouchers, 'My vouchers retrieved');
  } catch (error) {
    return errorResponse(res, error);
  }
}

// ==================== SHIPMENT OPERATIONS ====================

/**
 * Get all shipments for an order (multi-shop orders)
 * GET /orders/:id/shipments
 * 
 * Requirements: 12.1, 12.2 - Return all shipments for multi-shop order
 */
async function getOrderShipments(req, res) {
  try {
    const { id } = req.params;
    
    // Import shipper controller to use the getOrderShipments function
    const shipperController = require('../shipper/shipper.controller');
    
    // Delegate to shipper controller
    return shipperController.getOrderShipments(req, res);
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Get order completion status for multi-shop orders
 * GET /orders/:id/completion-status
 * 
 * Requirements: 12.4 - Check all shipments delivered status
 */
async function getOrderCompletionStatus(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify order ownership
    const order = await orderService.getOrderById(id, userId);
    if (!order) {
      return errorResponse(res, { code: 'ORDER_NOT_FOUND', message: 'Order not found', statusCode: 404 });
    }
    
    const completionStatus = await orderService.getOrderCompletionStatus(id);
    
    return successResponse(res, {
      orderId: id,
      ...completionStatus,
    });
  } catch (error) {
    return errorResponse(res, error);
  }
}

module.exports = {
  // Cart
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  
  // Order
  checkout,
  getOrders,
  getOrderById,
  cancelOrder,
  confirmReceipt,
  requestReturn,
  getOrderShipments,
  getOrderCompletionStatus,
  
  // Partner
  getPartnerOrders,
  confirmOrder,
  packOrder,
  cancelByPartner,
  
  // Shipper
  pickupOrder,
  deliverOrder,
  failDelivery,
  
  // Payment
  vnpayCallback,
  momoCallback,
  
  // Voucher
  validateVoucher,
  getAvailableVouchers,
  getPlatformVouchers,
  getShopVouchers,
  collectVoucher,
  getMyVouchers,
};
