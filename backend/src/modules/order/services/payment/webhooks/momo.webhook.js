/**
 * MoMo Webhook Handler
 * Handles IPN callbacks from MoMo
 * 
 * Requirements: 1.2, 1.3, 1.4
 * - Verify signature using HMAC-SHA256
 * - Update payment status on success/failure
 * - Publish PAYMENT_SUCCESS/PAYMENT_FAILED events
 */

const MoMoProvider = require('../providers/momo.provider');
const orderService = require('../../../order.service');
const { publishOrderEvent } = require('../../../../../shared/rabbitmq/rabbitmq.client');
const { PAYMENT_STATUS } = require('../payment.interface');

const momoProvider = new MoMoProvider();

/**
 * Handle MoMo IPN callback
 * @param {Object} data - IPN data from MoMo
 * @returns {Promise<Object>}
 */
async function handleMoMoCallback(data) {
  console.log('[MoMo Webhook] Received callback:', JSON.stringify(data));

  try {
    // Process callback through provider (includes signature verification)
    const result = await momoProvider.processCallback(data);

    // Update payment status in database
    await updatePaymentStatus(result);

    // Publish event
    await publishPaymentEvent(result);

    return {
      success: true,
      message: 'Callback processed successfully',
    };
  } catch (error) {
    console.error('[MoMo Webhook] Error:', error.message);
    throw error;
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
        provider: 'momo',
        providerTransactionId,
        amount,
      });
    } else if (status === PAYMENT_STATUS.FAILED) {
      await orderService.handlePaymentFailed(paymentId, {
        provider: 'momo',
        providerTransactionId,
        errorCode,
        errorMessage,
      });
    }
  } catch (error) {
    console.error('[MoMo Webhook] Failed to update payment status:', error.message);
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
      provider: 'momo',
      providerTransactionId,
      amount,
      status,
      timestamp: new Date().toISOString(),
    });

    console.log(`[MoMo Webhook] Published ${eventType} event for order ${paymentId}`);
  } catch (error) {
    console.error('[MoMo Webhook] Failed to publish event:', error.message);
    // Don't throw - event publishing failure shouldn't fail the webhook
  }
}

module.exports = {
  handleMoMoCallback,
};
