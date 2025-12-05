/**
 * Payment Controller
 * Handles payment-related HTTP requests
 * 
 * Requirements: 1, 2, 3 (MoMo, VNPay, ZaloPay integration)
 */

const { sendSuccess, sendError, sendBadRequest } = require('../../shared/utils/response.util');
const { AppError } = require('../../shared/utils/error.util');
const orderRepository = require('./order.repository');

// Payment providers
const MoMoProvider = require('./services/payment/providers/momo.provider');
const VNPayProvider = require('./services/payment/providers/vnpay.provider');
const ZaloPayProvider = require('./services/payment/providers/zalopay.provider');

// Webhook handlers
const { handleMoMoCallback } = require('./services/payment/webhooks/momo.webhook');
const { handleVNPayReturn, handleVNPayIPN } = require('./services/payment/webhooks/vnpay.webhook');
const { handleZaloPayCallback } = require('./services/payment/webhooks/zalopay.webhook');

const { PAYMENT_PROVIDERS, PAYMENT_ERRORS } = require('./services/payment/payment.interface');

// Initialize providers
const providers = {
  [PAYMENT_PROVIDERS.MOMO]: new MoMoProvider(),
  [PAYMENT_PROVIDERS.VNPAY]: new VNPayProvider(),
  [PAYMENT_PROVIDERS.ZALOPAY]: new ZaloPayProvider(),
};

/**
 * Create payment session
 * POST /payments/create-session
 */
async function createPaymentSession(req, res) {
  try {
    const { orderId, provider, returnUrl } = req.body;

    // Validate provider
    if (!provider || !providers[provider]) {
      return sendBadRequest(res, PAYMENT_ERRORS.INVALID_PROVIDER.message);
    }

    // Get order
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      return sendBadRequest(res, 'Order not found');
    }

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return sendBadRequest(res, PAYMENT_ERRORS.ORDER_ALREADY_PAID.message);
    }

    // Create payment session
    const paymentProvider = providers[provider];
    const result = await paymentProvider.createPayment({
      id: order.id,
      orderNumber: order.order_number,
      amount: order.grand_total,
      currency: 'VND',
      description: `Payment for order ${order.order_number}`,
      userId: req.user?.userId,
    }, {
      returnUrl,
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    // Update order with payment info
    await orderRepository.updateOrder(orderId, {
      payment_method: provider,
      payment_provider_order_id: result.providerOrderId,
    });

    return sendSuccess(res, {
      paymentId: result.paymentId,
      payUrl: result.payUrl,
      provider: result.provider,
      expiresAt: result.expiresAt,
    }, 'Payment session created');
  } catch (error) {
    console.error('[Payment] Create session error:', error);
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * Get payment status
 * GET /payments/:orderId/status
 */
async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      return sendBadRequest(res, 'Order not found');
    }

    // If we have provider order ID, query the provider
    if (order.payment_provider_order_id && order.payment_method) {
      const provider = providers[order.payment_method];
      if (provider) {
        try {
          const status = await provider.getStatus(orderId, order.payment_provider_order_id);
          return sendSuccess(res, {
            orderId,
            paymentStatus: order.payment_status,
            providerStatus: status,
          });
        } catch {
          // Fall through to return local status
        }
      }
    }

    return sendSuccess(res, {
      orderId,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
    });
  } catch (error) {
    console.error('[Payment] Get status error:', error);
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * MoMo webhook handler
 * POST /payments/webhook/momo
 */
async function momoWebhook(req, res) {
  try {
    const result = await handleMoMoCallback(req.body);
    return res.status(204).send();
  } catch (error) {
    console.error('[Payment] MoMo webhook error:', error);
    return res.status(400).json({ error: error.message });
  }
}

/**
 * VNPay return URL handler
 * GET /payments/callback/vnpay
 */
async function vnpayReturn(req, res) {
  try {
    const result = await handleVNPayReturn(req.query);
    
    // Redirect to frontend with result
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = result.success
      ? `${frontendUrl}/payment/success?orderId=${result.orderId}`
      : `${frontendUrl}/payment/failed?orderId=${result.orderId}&error=${encodeURIComponent(result.errorMessage || 'Payment failed')}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('[Payment] VNPay return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/payment/failed?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * VNPay IPN handler
 * POST /payments/webhook/vnpay
 */
async function vnpayWebhook(req, res) {
  try {
    // VNPay sends data as query params even for POST
    const data = { ...req.query, ...req.body };
    const result = await handleVNPayIPN(data);
    return res.json(result);
  } catch (error) {
    console.error('[Payment] VNPay webhook error:', error);
    return res.json({ RspCode: '99', Message: error.message });
  }
}

/**
 * ZaloPay webhook handler
 * POST /payments/webhook/zalopay
 */
async function zalopayWebhook(req, res) {
  try {
    const result = await handleZaloPayCallback(req.body);
    return res.json(result);
  } catch (error) {
    console.error('[Payment] ZaloPay webhook error:', error);
    return res.json({ return_code: 0, return_message: error.message });
  }
}

/**
 * ZaloPay return URL handler
 * GET /payments/callback/zalopay
 */
async function zalopayReturn(req, res) {
  try {
    const { status, apptransid } = req.query;
    const orderId = apptransid ? apptransid.split('_')[1] : null;
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = status === '1'
      ? `${frontendUrl}/payment/success?orderId=${orderId}`
      : `${frontendUrl}/payment/failed?orderId=${orderId}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('[Payment] ZaloPay return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/payment/failed?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Process refund
 * POST /payments/:orderId/refund
 */
async function processRefund(req, res) {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      return sendBadRequest(res, 'Order not found');
    }

    if (order.payment_status !== 'paid') {
      return sendBadRequest(res, 'Order is not paid');
    }

    const provider = providers[order.payment_method];
    if (!provider) {
      return sendBadRequest(res, 'Refund not supported for this payment method');
    }

    // Get provider transaction ID (would be stored in payments table)
    const providerTransactionId = order.payment_provider_transaction_id;
    if (!providerTransactionId) {
      return sendBadRequest(res, 'Transaction ID not found');
    }

    const refundAmount = amount || order.grand_total;
    const result = await provider.refund(orderId, providerTransactionId, refundAmount, reason);

    if (result.success) {
      await orderRepository.updatePaymentStatus(orderId, 'refunded');
    }

    return sendSuccess(res, result, result.success ? 'Refund processed' : 'Refund failed');
  } catch (error) {
    console.error('[Payment] Refund error:', error);
    return sendError(res, error.message, error.statusCode || 500);
  }
}

module.exports = {
  createPaymentSession,
  getPaymentStatus,
  momoWebhook,
  vnpayReturn,
  vnpayWebhook,
  zalopayWebhook,
  zalopayReturn,
  processRefund,
};
