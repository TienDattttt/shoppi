/**
 * Payment Routes
 * API endpoints for payment operations
 * 
 * Requirements: 1, 2, 3 (MoMo, VNPay, ZaloPay integration)
 */

const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authenticate, requireAdmin } = require('../auth/auth.middleware');

// ============================================
// PAYMENT SESSION ROUTES
// ============================================

/**
 * Create payment session
 * POST /payments/create-session
 * Body: { orderId, provider: 'momo' | 'vnpay' | 'zalopay', returnUrl? }
 */
router.post('/create-session', authenticate, paymentController.createPaymentSession);

/**
 * Get payment status
 * GET /payments/:orderId/status
 */
router.get('/:orderId/status', authenticate, paymentController.getPaymentStatus);

/**
 * Process refund (Admin only)
 * POST /payments/:orderId/refund
 * Body: { amount?, reason? }
 */
router.post('/:orderId/refund', authenticate, requireAdmin, paymentController.processRefund);

// ============================================
// WEBHOOK ROUTES (No authentication - called by payment providers)
// ============================================

/**
 * MoMo IPN webhook
 * POST /payments/webhook/momo
 */
router.post('/webhook/momo', paymentController.momoWebhook);

/**
 * VNPay IPN webhook
 * POST /payments/webhook/vnpay
 * GET /payments/webhook/vnpay (VNPay sometimes uses GET)
 */
router.post('/webhook/vnpay', paymentController.vnpayWebhook);
router.get('/webhook/vnpay', paymentController.vnpayWebhook);

/**
 * ZaloPay callback webhook
 * POST /payments/webhook/zalopay
 */
router.post('/webhook/zalopay', paymentController.zalopayWebhook);

// ============================================
// CALLBACK/RETURN ROUTES (User redirected back from payment gateway)
// ============================================

/**
 * VNPay return URL
 * GET /payments/callback/vnpay
 */
router.get('/callback/vnpay', paymentController.vnpayReturn);

/**
 * ZaloPay return URL
 * GET /payments/callback/zalopay
 */
router.get('/callback/zalopay', paymentController.zalopayReturn);

/**
 * MoMo return URL (user redirected back from MoMo)
 * GET /payments/callback/momo
 */
router.get('/callback/momo', paymentController.momoReturn);

module.exports = router;
