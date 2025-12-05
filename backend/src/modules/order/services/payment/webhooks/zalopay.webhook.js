/**
 * ZaloPay Webhook Handler
 * Handles callbacks from ZaloPay
 * 
 * Requirements: 3.2, 3.3, 3.4
 * - Verify mac using HMAC-SHA256
 * - Update payment status based on return_code
 * - Publish PAYMENT_SUCCESS/PAYMENT_FAILED events
 */

const ZaloPayProvider = require('../providers/zalopay.provider');
const orderService = require('../../../order.service');
const { publishOrderEvent } = require('../../../../../shared/rabbitmq/rabbitmq.client');
const { PAYMENT_STATUS } = require('../payment.interface');

const zalopayProvider = new ZaloPayProvider();

/**
 * Handle ZaloPay callback
 * @param {Object} data - Callback data from ZaloPay
 * @returns {Promise<Object>}
 */
async function handleZaloPayCallback(data) {
  console.log('[ZaloPay Webhook] Received callback:', JSON.stringify(data));

  try {
    // Process callback through provider (includes mac verification)
    const result = await zalopayProvider.processCallback(data);

    // Update payment status in database
    await updatePaymentStatus(result);

    // Publish event
    await publishPaymentEvent(result);

    // Return ZaloPay expected response format
    return {
      return_code: 1,
      return_message: 'success',
    };
  } catch (error) {
    console.error('[ZaloPay Webhook] Error:', error.message);
    
    // Return error response in ZaloPay format
    if (error.code === 'PAY_003') {
      return { return_code: -1, return_message: 'mac not equal' };
    }
    return { return_code: 0, return_message: error.message };
  }
}

/**
 * Update payment status in database via order service
 * @param {Object} result - Payment result from provider
 */
async function updatePaymentStatus(result) {
  const { paymentId, status, providerTransactionId, amount, errorCode, errorMessage } = result;

  try {
    // Delegate to order service (proper module boundary)
    if (status === PAYMENT_STATUS.PAID) {
      await orderService.handlePaymentSuccess(paymentId, {
        provider: 'zalopay',
        providerTransactionId,
        amount,
      });
    } else if (status === PAYMENT_STATUS.FAILED) {
      await orderService.handlePaymentFailed(paymentId, {
        provider: 'zalopay',
        providerTransactionId,
        errorCode,
        errorMessage,
      });
    }
  } catch (error) {
    console.error('[ZaloPay Webhook] Failed to update payment status:', error.message);
    throw error;
  }
}

/**
 * Publish payment event to RabbitMQ
 * @param {Object} result - Payment result
 */
async function publishPaymentEvent(result) {
  const { paymentId, status, amount, providerTransactionId } = result;

  try {
    const eventType = status === PAYMENT_STATUS.PAID ? 'payment_success' : 'payment_failed';
    
    await publishOrderEvent(eventType, {
      orderId: paymentId,
      provider: 'zalopay',
      providerTransactionId,
      amount,
      status,
      timestamp: new Date().toISOString(),
    });

    console.log(`[ZaloPay Webhook] Published ${eventType} event for order ${paymentId}`);
  } catch (error) {
    console.error('[ZaloPay Webhook] Failed to publish event:', error.message);
  }
}

module.exports = {
  handleZaloPayCallback,
};
