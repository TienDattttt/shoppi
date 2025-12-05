/**
 * Payment Provider Interface
 * Base interface that all payment providers must implement
 * 
 * Requirements: 1, 2, 3 (MoMo, VNPay, ZaloPay integration)
 */

/**
 * @typedef {Object} PaymentSession
 * @property {string} paymentId - Internal payment ID
 * @property {string} providerOrderId - Provider's order/transaction ID
 * @property {string} payUrl - URL to redirect user for payment
 * @property {string} provider - Provider name (momo, vnpay, zalopay)
 * @property {number} amount - Payment amount
 * @property {string} status - Payment status
 * @property {Date} expiresAt - Payment session expiration
 */

/**
 * @typedef {Object} PaymentResult
 * @property {boolean} success - Whether payment was successful
 * @property {string} paymentId - Internal payment ID
 * @property {string} providerTransactionId - Provider's transaction ID
 * @property {number} amount - Paid amount
 * @property {string} status - Final status
 * @property {string} [errorCode] - Error code if failed
 * @property {string} [errorMessage] - Error message if failed
 */

/**
 * @typedef {Object} RefundResult
 * @property {boolean} success - Whether refund was successful
 * @property {string} refundId - Refund transaction ID
 * @property {number} amount - Refunded amount
 * @property {string} status - Refund status
 * @property {string} [errorCode] - Error code if failed
 * @property {string} [errorMessage] - Error message if failed
 */

/**
 * Payment Provider Interface
 * All payment providers must implement these methods
 */
class PaymentProviderInterface {
  /**
   * Provider name
   * @type {string}
   */
  get name() {
    throw new Error('Provider must implement name getter');
  }

  /**
   * Create a payment session
   * @param {Object} order - Order data
   * @param {string} order.id - Order ID
   * @param {string} order.orderNumber - Order number for display
   * @param {number} order.amount - Total amount to pay
   * @param {string} order.currency - Currency code (VND)
   * @param {string} order.description - Payment description
   * @param {Object} [options] - Additional options
   * @returns {Promise<PaymentSession>}
   */
  async createPayment(order, options = {}) {
    throw new Error('Provider must implement createPayment method');
  }

  /**
   * Verify webhook/callback signature
   * @param {Object} data - Webhook data from provider
   * @param {string} signature - Signature to verify
   * @returns {boolean} - True if signature is valid
   */
  verifySignature(data, signature) {
    throw new Error('Provider must implement verifySignature method');
  }

  /**
   * Process webhook callback
   * @param {Object} data - Webhook data from provider
   * @returns {Promise<PaymentResult>}
   */
  async processCallback(data) {
    throw new Error('Provider must implement processCallback method');
  }

  /**
   * Get payment status from provider
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerOrderId - Provider's order ID
   * @returns {Promise<PaymentResult>}
   */
  async getStatus(paymentId, providerOrderId) {
    throw new Error('Provider must implement getStatus method');
  }

  /**
   * Process refund
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerTransactionId - Provider's transaction ID
   * @param {number} amount - Amount to refund
   * @param {string} [reason] - Refund reason
   * @returns {Promise<RefundResult>}
   */
  async refund(paymentId, providerTransactionId, amount, reason) {
    throw new Error('Provider must implement refund method');
  }
}

// Payment status constants
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
};

// Payment provider constants
const PAYMENT_PROVIDERS = {
  COD: 'cod',
  MOMO: 'momo',
  VNPAY: 'vnpay',
  ZALOPAY: 'zalopay',
  WALLET: 'wallet',
};

// Payment error codes
const PAYMENT_ERRORS = {
  INVALID_PROVIDER: { code: 'PAY_001', message: 'Invalid payment provider' },
  PAYMENT_NOT_FOUND: { code: 'PAY_002', message: 'Payment not found' },
  SIGNATURE_INVALID: { code: 'PAY_003', message: 'Invalid signature' },
  PAYMENT_FAILED: { code: 'PAY_004', message: 'Payment failed' },
  REFUND_FAILED: { code: 'PAY_005', message: 'Refund failed' },
  ORDER_ALREADY_PAID: { code: 'PAY_006', message: 'Order already paid' },
  AMOUNT_MISMATCH: { code: 'PAY_007', message: 'Amount mismatch' },
  PROVIDER_ERROR: { code: 'PAY_008', message: 'Payment provider error' },
  TIMEOUT: { code: 'PAY_009', message: 'Payment timeout' },
};

module.exports = {
  PaymentProviderInterface,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PAYMENT_ERRORS,
};
