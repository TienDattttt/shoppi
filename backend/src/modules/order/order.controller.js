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
const { sendSuccess: successResponse, sendError: errorResponse } = require('../../shared/utils/response.util');

// ==================== CART OPERATIONS ====================

/**
 * Get user's cart
 */
async function getCart(req, res) {
  try {
    const userId = req.user.id;
    const cart = await cartService.getCart(userId);
    return successResponse(res, cart, 'Cart retrieved successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Add item to cart
 */
async function addToCart(req, res) {
  try {
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const userId = req.user.id;
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
    const filters = req.query;
    const orders = await orderService.getPartnerOrders(partnerId, filters);
    return successResponse(res, orders, 'Orders retrieved successfully');
  } catch (error) {
    return errorResponse(res, error);
  }
}

/**
 * Confirm order (Partner)
 */
async function confirmOrder(req, res) {
  try {
    const partnerId = req.user.id;
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
    const partnerId = req.user.id;
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
    const partnerId = req.user.id;
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
    const shipperId = req.user.id;
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
    const shipperId = req.user.id;
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
    const shipperId = req.user.id;
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
    const userId = req.user.id;
    const { code, orderTotal, shopId } = req.query;
    const validation = await voucherService.validateVoucher(code, userId, parseFloat(orderTotal), shopId);
    return successResponse(res, validation, 'Voucher validated');
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
};
