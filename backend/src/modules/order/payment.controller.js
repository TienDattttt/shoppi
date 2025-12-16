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
    });
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = result.success
      ? `${frontendUrl}/payment/success?orderId=${result.orderId}`
      : `${frontendUrl}/payment/failed?orderId=${result.orderId}&error=${encodeURIComponent(result.errorMessage || 'Payment failed')}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('[Payment] VNPay return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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
 * Note: ZaloPay may redirect directly to frontend via embed_data.redirecturl
 * This handler is for cases where ZaloPay uses callback_url
 */
async function zalopayReturn(req, res) {
  try {
    const { status, apptransid } = req.query;
    
    console.log('[Payment] ZaloPay return:', { status, apptransid, query: req.query });
    
    // Extract order ID - ZaloPay app_trans_id format: yyMMdd_timestamp+random
    // We need to get orderId from database using app_trans_id
    let orderId = null;
    
    if (apptransid) {
      // Find order by payment_provider_order_id
      const order = await orderRepository.findOrderByProviderOrderId(apptransid);
      if (order) {
        orderId = order.id;
      }
    }
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // status === '1' means success in ZaloPay
    if (status === '1' && orderId) {
      // Query ZaloPay to confirm and update payment status
      try {
        const provider = providers[PAYMENT_PROVIDERS.ZALOPAY];
        const queryResult = await provider.getStatus(orderId, apptransid);
        
        console.log('[Payment] ZaloPay query result:', queryResult);
        
        if (queryResult.success || queryResult.status === 'paid') {
          await orderRepository.updatePaymentStatus(orderId, 'paid');
          await orderRepository.updateOrderStatus(orderId, 'processing');
          
          // Update sub-orders to pending
          const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
          for (const subOrder of subOrders) {
            await orderRepository.updateSubOrderStatus(subOrder.id, 'pending');
          }
          
          console.log('[Payment] ZaloPay payment success, updated order:', orderId);
        }
      } catch (queryError) {
        console.error('[Payment] ZaloPay query error:', queryError.message);
      }
      
      return res.redirect(`${frontendUrl}/payment/success?orderId=${orderId}`);
    } else {
      // Payment failed
      if (orderId) {
        try {
          await orderRepository.updatePaymentStatus(orderId, 'failed');
          await orderRepository.updateOrderStatus(orderId, 'payment_failed');
        } catch (updateError) {
          console.error('[Payment] Failed to update failed status:', updateError.message);
        }
      }
      
      return res.redirect(`${frontendUrl}/payment/failed?orderId=${orderId || ''}`);
    }
  } catch (error) {
    console.error('[Payment] ZaloPay return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/payment/failed?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Confirm payment status (called by frontend after redirect from payment gateway)
 * POST /payments/:orderId/confirm
 * Used when webhook doesn't reach localhost (sandbox environment)
 */
async function confirmPayment(req, res) {
  try {
    const { orderId } = req.params;
    console.log('[Payment] confirmPayment called for order:', orderId);
    
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      console.log('[Payment] Order not found:', orderId);
      return sendBadRequest(res, 'Order not found');
    }
    
    console.log('[Payment] Order found:', {
      id: order.id,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      payment_provider_order_id: order.payment_provider_order_id,
    });
    
    // Already paid, no need to confirm
    if (order.payment_status === 'paid') {
      return sendSuccess(res, {
        orderId,
        paymentStatus: 'paid',
        message: 'Payment already confirmed',
      });
    }
    
    // Check if we have provider order ID to query
    if (!order.payment_provider_order_id || !order.payment_method) {
      console.log('[Payment] No payment session found for order:', orderId);
      return sendBadRequest(res, 'No payment session found for this order');
    }
    
    const provider = providers[order.payment_method];
    if (!provider) {
      console.log('[Payment] Provider not supported:', order.payment_method);
      return sendBadRequest(res, 'Payment provider not supported');
    }
    
    // Query payment status from provider
    try {
      console.log('[Payment] Querying provider for order:', orderId, 'provider_order_id:', order.payment_provider_order_id);
      const status = await provider.getStatus(orderId, order.payment_provider_order_id);
      console.log('[Payment] Provider status result:', status);
      
      if (status.success || status.status === 'paid') {
        // Update payment status in database
        await orderRepository.updatePaymentStatus(orderId, 'paid');
        
        // Also update order status to processing
        await orderRepository.updateOrderStatus(orderId, 'processing');
        
        // Update sub-orders to pending
        const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
        console.log('[Payment] Updating', subOrders.length, 'sub-orders to pending');
        for (const subOrder of subOrders) {
          await orderRepository.updateSubOrderStatus(subOrder.id, 'pending');
        }
        
        console.log('[Payment] Payment confirmed via provider query:', orderId);
        
        return sendSuccess(res, {
          orderId,
          paymentStatus: 'paid',
          providerTransactionId: status.providerTransactionId,
          message: 'Payment confirmed successfully',
        });
      } else if (status.status === 'pending') {
        return sendSuccess(res, {
          orderId,
          paymentStatus: 'pending',
          message: 'Payment is still processing',
        });
      } else {
        // Payment failed
        console.log('[Payment] Payment failed:', status.errorMessage);
        await orderRepository.updatePaymentStatus(orderId, 'failed');
        await orderRepository.updateOrderStatus(orderId, 'payment_failed');
        
        return sendSuccess(res, {
          orderId,
          paymentStatus: 'failed',
          errorMessage: status.errorMessage,
        });
      }
    } catch (providerError) {
      console.error('[Payment] Provider query error:', providerError.message, providerError.stack);
      // Return current status from database
      return sendSuccess(res, {
        orderId,
        paymentStatus: order.payment_status,
        message: 'Could not verify with provider, returning local status',
      });
    }
  } catch (error) {
    console.error('[Payment] Confirm payment error:', error);
    return sendError(res, error.message, error.statusCode || 500);
  }
}

/**
 * MoMo return URL handler (user redirected back from MoMo)
 * GET /payments/callback/momo
 */
async function momoReturn(req, res) {
  try {
    const { orderId, resultCode, message, transId } = req.query;
    
    console.log('[Payment] MoMo return:', { orderId, resultCode, message, transId });
    
    // Extract original order ID (remove timestamp suffix)
    const originalOrderId = orderId ? orderId.split('_')[0] : null;
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // resultCode 0 = success
    if (resultCode === '0' && originalOrderId) {
      // Update payment status in database (since webhook may not reach localhost)
      try {
        await orderRepository.updatePaymentStatus(originalOrderId, 'paid');
        
        // Update sub-orders to pending
        const subOrders = await orderRepository.findSubOrdersByOrderId(originalOrderId);
        for (const subOrder of subOrders) {
          await orderRepository.updateSubOrderStatus(subOrder.id, 'pending');
        }
        
        console.log('[Payment] MoMo payment success, updated order:', originalOrderId);
      } catch (updateError) {
        console.error('[Payment] Failed to update payment status:', updateError.message);
      }
      
      return res.redirect(`${frontendUrl}/payment/success?orderId=${originalOrderId}`);
    } else {
      // Payment failed - update status
      if (originalOrderId) {
        try {
          await orderRepository.updatePaymentStatus(originalOrderId, 'failed');
          await orderRepository.updateOrderStatus(originalOrderId, 'payment_failed');
        } catch (updateError) {
          console.error('[Payment] Failed to update failed status:', updateError.message);
        }
      }
      
      const errorMsg = message || 'Payment failed';
      return res.redirect(`${frontendUrl}/payment/failed?orderId=${originalOrderId}&error=${encodeURIComponent(errorMsg)}`);
    }
  } catch (error) {
    console.error('[Payment] MoMo return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
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

    return sendSuccess(res, result);
  } catch (error) {
    console.error('[Payment] Refund error:', error);
    return sendError(res, error.message, error.statusCode || 500);
  }
}

module.exports = {
  createPaymentSession,
  getPaymentStatus,
  momoWebhook,
  momoReturn,
  vnpayReturn,
  vnpayWebhook,
  zalopayWebhook,
  zalopayReturn,
  confirmPayment,
  processRefund,
};
