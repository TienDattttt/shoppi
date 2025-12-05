/**
 * VNPay Webhook Handler
 * Handles return URL and IPN callbacks from VNPay
 * 
 * Requirements: 2.2, 2.3, 2.4
 * - Verify vnp_SecureHash using SHA512
 * - Update payment status based on vnp_ResponseCode
 * - Publish PAYMENT_SUCCESS/PAYMENT_FAILED events
 */

const VNPayProvider = require('../providers/vnpay.provider');
const orderService = require('../../../order.service');
const { publishOrderEvent } = require('../../../../../shared/rabbitmq/rabbitmq.client');
const { PAYMENT_STATUS } = require('../payment.interface');

const vnpayProvider = new VNPayProvider();

/**
 * Handle VNPay return URL callback
 * @param {Object} data - Query params from VNPay return URL
 * @returns {Promise<Object>}
 */
async function handleVNPayReturn(data) {
  console.log('[VNPay Return] Received callback:', JSON.stringify(data));

  try {
    // Process callback through provider (includes signature verification)
    const result = await vnpayProvider.processCallback(data);

    // Update payment status in database
    await updatePaymentStatus(result);

    return {
      success: result.success,
      orderId: result.paymentId,
      message: result.success ? 'Payment successful' : 'Payment failed',
      errorMessage: result.errorMessage,
    };
  } catch (error) {
    console.error('[VNPay Return] Error:', error.message);
    throw error;
  }
}

/**
 * Handle VNPay IPN callback
 * @param {Object} data - IPN data from VNPay
 * @returns {Promise<Object>}
 */
async function handleVNPayIPN(data) {
  console.log('[VNPay IPN] Received callback:', JSON.stringify(data));

  try {
    // Process callback through provider (includes signature verification)
    const result = await vnpayProvider.processCallback(data);

    // Update payment status in database
    await updatePaymentStatus(result);

    // Publish event
    await publishPaymentEvent(result);

    // Return VNPay expected response format
    return {
      RspCode: '00',
      Message: 'Confirm Success',
    };
  } catch (error) {
    console.error('[VNPay IPN] Error:', error.message);
    
    // Return error response in VNPay format
    if (error.code === 'PAY_003') {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }
    return { RspCode: '99', Message: 'Unknown error' };
  }
}

/**
 * Update payment status in database via order service
 * @param {Object} result - Payment result from provider
 */
async function updatePaymentStatus(result) {
  const { paymentId, status, providerTransactionId, amount, errorCode, errorMessage, bankCode } = result;

  try {
    // Delegate to order service (proper module boundary)
    if (status === PAYMENT_STATUS.PAID) {
      await orderService.handlePaymentSuccess(paymentId, {
        provider: 'vnpay',
        providerTransactionId,
        amount,
        bankCode,
      });
    } else if (status === PAYMENT_STATUS.FAILED) {
      await orderService.handlePaymentFailed(paymentId, {
        provider: 'vnpay',
        providerTransactionId,
        errorCode,
        errorMessage,
      });
    }
  } catch (error) {
    console.error('[VNPay Webhook] Failed to update payment status:', error.message);
    throw error;
  }
}

/**
 * Publish payment event to RabbitMQ
 * @param {Object} result - Payment result
 */
async function publishPaymentEvent(result) {
  const { paymentId, status, amount, providerTransactionId, bankCode } = result;

  try {
    const eventType = status === PAYMENT_STATUS.PAID ? 'payment_success' : 'payment_failed';
    
    await publishOrderEvent(eventType, {
      orderId: paymentId,
      provider: 'vnpay',
      providerTransactionId,
      bankCode,
      amount,
      status,
      timestamp: new Date().toISOString(),
    });

    console.log(`[VNPay Webhook] Published ${eventType} event for order ${paymentId}`);
  } catch (error) {
    console.error('[VNPay Webhook] Failed to publish event:', error.message);
  }
}

module.exports = {
  handleVNPayReturn,
  handleVNPayIPN,
};
