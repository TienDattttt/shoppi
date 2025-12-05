/**
 * Order Module Entry Point
 * Exports all order-related components for use in the application
 */

// Routes
const { 
  cartRouter, 
  orderRouter, 
  partnerOrderRouter, 
  shipperOrderRouter,
  paymentRouter,
  voucherRouter 
} = require('./order.routes');

// Controller
const orderController = require('./order.controller');

// Services
const orderService = require('./order.service');
const cartService = require('./services/cart.service');
const checkoutService = require('./services/checkout.service');
const paymentService = require('./services/payment.service');
const shippingService = require('./services/shipping.service');
const voucherService = require('./services/voucher.service');
const returnService = require('./services/return.service');
const trackingService = require('./services/tracking.service');

// Repository
const orderRepository = require('./order.repository');
const cartRepository = require('./cart.repository');
const voucherRepository = require('./voucher.repository');

// DTOs
const orderDTO = require('./order.dto');

// Validators
const orderValidator = require('./order.validator');

/**
 * Initialize order module
 * @param {Express} app - Express application instance
 */
function initializeModule(app) {
  // Mount routes
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/partner/orders', partnerOrderRouter);
  app.use('/api/shipper/orders', shipperOrderRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/vouchers', voucherRouter);
  
  console.log('Order module initialized');
}

module.exports = {
  // Initialize
  initializeModule,
  
  // Routes
  cartRouter,
  orderRouter,
  partnerOrderRouter,
  shipperOrderRouter,
  paymentRouter,
  voucherRouter,
  
  // Controller
  orderController,
  
  // Services
  orderService,
  cartService,
  checkoutService,
  paymentService,
  shippingService,
  voucherService,
  returnService,
  trackingService,
  
  // Repository
  orderRepository,
  cartRepository,
  voucherRepository,
  
  // DTOs
  orderDTO,
  
  // Validators
  orderValidator,
};
