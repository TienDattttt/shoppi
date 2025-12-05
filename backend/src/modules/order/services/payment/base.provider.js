/**
 * Base Payment Provider
 * Common functionality for all payment providers
 * 
 * Requirements: 1, 2, 3 (MoMo, VNPay, ZaloPay integration)
 */

const crypto = require('crypto');
const { PaymentProviderInterface, PAYMENT_STATUS, PAYMENT_ERRORS } = require('./payment.interface');
const { AppError } = require('../../../../shared/utils/error.util');

/**
 * Base Payment Provider with common functionality
 */
class BasePaymentProvider extends PaymentProviderInterface {
  constructor(config = {}) {
    super();
    this.config = config;
    this.baseUrl = config.baseUrl || '';
    this.timeout = config.timeout || 30000; // 30 seconds default
  }

  /**
   * Generate HMAC-SHA256 signature
   * @param {string} data - Data to sign
   * @param {string} secretKey - Secret key
   * @returns {string} - Hex signature
   */
  generateHmacSha256(data, secretKey) {
    return crypto
      .createHmac('sha256', secretKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Generate SHA512 hash
   * @param {string} data - Data to hash
   * @returns {string} - Hex hash
   */
  generateSha512(data) {
    return crypto
      .createHash('sha512')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate SHA256 hash
   * @param {string} data - Data to hash
   * @returns {string} - Hex hash
   */
  generateSha256(data) {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate MD5 hash
   * @param {string} data - Data to hash
   * @returns {string} - Hex hash
   */
  generateMd5(data) {
    return crypto
      .createHash('md5')
      .update(data)
      .digest('hex');
  }

  /**
   * Make HTTP request to payment provider
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>}
   */
  async makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.error(`[${this.name}] API Error:`, data);
        throw new AppError(
          PAYMENT_ERRORS.PROVIDER_ERROR.code,
          data.message || PAYMENT_ERRORS.PROVIDER_ERROR.message,
          response.status
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new AppError(
          PAYMENT_ERRORS.TIMEOUT.code,
          PAYMENT_ERRORS.TIMEOUT.message,
          408
        );
      }

      throw error;
    }
  }

  /**
   * Generate unique request ID
   * @returns {string}
   */
  generateRequestId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Format amount for provider (some require integer, some decimal)
   * @param {number} amount - Amount in VND
   * @returns {number}
   */
  formatAmount(amount) {
    return Math.round(amount);
  }

  /**
   * Get return URL for payment callback
   * @param {string} provider - Provider name
   * @returns {string}
   */
  getReturnUrl(provider) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/payments/callback/${provider}`;
  }

  /**
   * Get IPN/Webhook URL
   * @param {string} provider - Provider name
   * @returns {string}
   */
  getNotifyUrl(provider) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/payments/webhook/${provider}`;
  }

  /**
   * Log payment event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  logEvent(event, data) {
    console.log(`[${this.name}] ${event}:`, JSON.stringify(data, null, 2));
  }

  /**
   * Validate order data
   * @param {Object} order - Order data
   * @throws {AppError} if validation fails
   */
  validateOrder(order) {
    if (!order.id) {
      throw new AppError('VALIDATION_ERROR', 'Order ID is required', 400);
    }
    if (!order.amount || order.amount <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Valid amount is required', 400);
    }
  }

  /**
   * Build order info string for display
   * @param {Object} order - Order data
   * @returns {string}
   */
  buildOrderInfo(order) {
    return order.description || `Payment for order ${order.orderNumber || order.id}`;
  }

  /**
   * Parse provider response to standard format
   * @param {Object} response - Provider response
   * @returns {Object} - Standardized response
   */
  parseResponse(response) {
    // Override in specific providers
    return response;
  }
}

module.exports = BasePaymentProvider;
