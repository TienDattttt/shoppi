/**
 * Order Module - Public API
 * 
 * This file defines the public interface for the order module.
 * Other modules should only import from this file, not from internal files.
 */

// Services (Public API)
const orderService = require('./order.service');
const cartService = require('./services/cart.service');
const checkoutService = require('./services/checkout.service');
const paymentService = require('./services/payment.service');
const voucherService = require('./services/voucher.service');
const returnService = require('./services/return.service');

// Routes
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');

// Module initialization
const orderModule = require('./order.module');

// DTOs (for serialization)
const orderDTO = require('./order.dto');

// Constants
const { ORDER_STATUS, SUB_ORDER_STATUS } = orderService;

module.exports = {
  // Services
  orderService,
  cartService,
  checkoutService,
  paymentService,
  voucherService,
  returnService,
  
  // Routes
  routes: orderRoutes,
  paymentRoutes,
  
  // Module
  initialize: orderModule.initializeModule,
  
  // DTOs
  orderDTO,
  
  // Constants
  ORDER_STATUS,
  SUB_ORDER_STATUS,
};
