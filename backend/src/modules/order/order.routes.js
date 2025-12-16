/**
 * Order Routes
 * API endpoints for order operations
 */

const express = require('express');
const orderController = require('./order.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// Cart Router
const cartRouter = express.Router();

cartRouter.use(authenticate);
cartRouter.use(authorize('customer'));

cartRouter.get('/', orderController.getCart);
cartRouter.post('/items', orderController.addToCart);
cartRouter.put('/items/:id', orderController.updateCartItem);
cartRouter.delete('/items/:id', orderController.removeFromCart);

// Order Router (Customer)
const orderRouter = express.Router();

orderRouter.use(authenticate);

orderRouter.post('/checkout', authorize('customer'), orderController.checkout);
orderRouter.get('/', authorize('customer'), orderController.getOrders);
orderRouter.get('/:id', authorize('customer'), orderController.getOrderById);
orderRouter.get('/:id/shipments', authorize('customer'), orderController.getOrderShipments);
orderRouter.get('/:id/completion-status', authorize('customer'), orderController.getOrderCompletionStatus);
orderRouter.post('/:id/cancel', authorize('customer'), orderController.cancelOrder);
orderRouter.post('/:id/confirm-receipt', authorize('customer'), orderController.confirmReceipt);
orderRouter.post('/:id/return', authorize('customer'), orderController.requestReturn);

// Partner Order Router
const partnerOrderRouter = express.Router();

partnerOrderRouter.use(authenticate);
partnerOrderRouter.use(authorize('partner'));

partnerOrderRouter.get('/', orderController.getPartnerOrders);
partnerOrderRouter.get('/:id', orderController.getPartnerOrderById);
partnerOrderRouter.post('/:id/confirm', orderController.confirmOrder);
partnerOrderRouter.post('/:id/pack', orderController.packOrder);
partnerOrderRouter.post('/:id/cancel', orderController.cancelByPartner);


// Shipper Order Router
const shipperOrderRouter = express.Router();

shipperOrderRouter.use(authenticate);
shipperOrderRouter.use(authorize('shipper'));

shipperOrderRouter.post('/:id/pickup', orderController.pickupOrder);
shipperOrderRouter.post('/:id/deliver', orderController.deliverOrder);
shipperOrderRouter.post('/:id/fail', orderController.failDelivery);

// Payment Router - Import from dedicated payment routes
const paymentRouter = require('./payment.routes');

// Voucher Router
const voucherRouter = express.Router();

// Public routes (optional auth for checking collected status)
voucherRouter.get('/platform', authenticate, orderController.getPlatformVouchers);
voucherRouter.get('/shop/:shopId', authenticate, orderController.getShopVouchers);

// Protected routes
voucherRouter.get('/validate', authenticate, orderController.validateVoucher);
voucherRouter.get('/available', authenticate, orderController.getAvailableVouchers);
voucherRouter.get('/my-vouchers', authenticate, orderController.getMyVouchers);
voucherRouter.post('/collect', authenticate, orderController.collectVoucher);

module.exports = {
  cartRouter,
  orderRouter,
  partnerOrderRouter,
  shipperOrderRouter,
  paymentRouter,
  voucherRouter,
};
