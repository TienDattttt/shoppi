/**
 * MoMo Payment Provider
 * Integration with MoMo Payment Gateway API v2
 * 
 * Requirements: 1 (MoMo Integration)
 * - Create payment session with MoMo API
 * - Verify IPN callback signature using HMAC-SHA256
 * - Process refund requests
 */

const BasePaymentProvider = require('../base.provider');
const { PAYMENT_STATUS, PAYMENT_ERRORS } = require('../payment.interface');
const { AppError } = require('../../../../../shared/utils/error.util');

// MoMo API endpoints
const MOMO_ENDPOINTS = {
  SANDBOX: 'https://test-payment.momo.vn/v2/gateway/api',
  PRODUCTION: 'https://payment.momo.vn/v2/gateway/api',
};

// MoMo result codes
const MOMO_RESULT_CODES = {
  SUCCESS: 0,
  PENDING: 1000,
  FAILED: 1001,
  INVALID_SIGNATURE: 1002,
  INVALID_AMOUNT: 1003,
  INVALID_ORDER: 1004,
  TRANSACTION_DENIED: 1005,
  TRANSACTION_TIMEOUT: 1006,
};

class MoMoProvider extends BasePaymentProvider {
  constructor() {
    super({
      baseUrl: process.env.MOMO_ENDPOINT || MOMO_ENDPOINTS.SANDBOX,
      timeout: 30000,
    });

    this.partnerCode = process.env.MOMO_PARTNER_CODE;
    this.accessKey = process.env.MOMO_ACCESS_KEY;
    this.secretKey = process.env.MOMO_SECRET_KEY;

    if (!this.partnerCode || !this.accessKey || !this.secretKey) {
      console.warn('[MoMo] Missing configuration. Payment will not work.');
    }
  }

  get name() {
    return 'momo';
  }

  /**
   * Create MoMo payment
   * @param {Object} order - Order data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async createPayment(order, options = {}) {
    this.validateOrder(order);
    this.logEvent('createPayment', { orderId: order.id, amount: order.amount });

    const requestId = this.generateRequestId();
    const orderId = `${order.id}_${Date.now()}`;
    const amount = this.formatAmount(order.amount);
    const orderInfo = this.buildOrderInfo(order);
    const returnUrl = options.returnUrl || this.getReturnUrl('momo');
    const notifyUrl = options.notifyUrl || this.getNotifyUrl('momo');
    const requestType = options.requestType || 'payWithMethod';
    const extraData = options.extraData || '';

    // Build raw signature string
    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${notifyUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${this.partnerCode}`,
      `redirectUrl=${returnUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = this.generateHmacSha256(rawSignature, this.secretKey);

    const requestBody = {
      partnerCode: this.partnerCode,
      partnerName: options.partnerName || 'E-Commerce Platform',
      storeId: options.storeId || this.partnerCode,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      lang: options.lang || 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };

    try {
      const response = await this.makeRequest(`${this.baseUrl}/create`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (response.resultCode !== 0) {
        throw new AppError(
          PAYMENT_ERRORS.PROVIDER_ERROR.code,
          response.message || 'MoMo payment creation failed',
          400
        );
      }

      return {
        paymentId: order.id,
        providerOrderId: orderId,
        providerRequestId: requestId,
        payUrl: response.payUrl,
        deeplink: response.deeplink,
        qrCodeUrl: response.qrCodeUrl,
        provider: this.name,
        amount,
        status: PAYMENT_STATUS.PENDING,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        rawResponse: response,
      };
    } catch (error) {
      this.logEvent('createPayment:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify MoMo IPN signature
   * @param {Object} data - IPN data
   * @returns {boolean}
   */
  verifySignature(data) {
    const {
      accessKey,
      amount,
      extraData,
      message,
      orderId,
      orderInfo,
      orderType,
      partnerCode,
      payType,
      requestId,
      responseTime,
      resultCode,
      transId,
      signature,
    } = data;

    const rawSignature = [
      `accessKey=${accessKey || this.accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData || ''}`,
      `message=${message}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `orderType=${orderType}`,
      `partnerCode=${partnerCode}`,
      `payType=${payType}`,
      `requestId=${requestId}`,
      `responseTime=${responseTime}`,
      `resultCode=${resultCode}`,
      `transId=${transId}`,
    ].join('&');

    const expectedSignature = this.generateHmacSha256(rawSignature, this.secretKey);
    return signature === expectedSignature;
  }

  /**
   * Process MoMo IPN callback
   * @param {Object} data - IPN data
   * @returns {Promise<Object>}
   */
  async processCallback(data) {
    this.logEvent('processCallback', data);

    // Verify signature
    if (!this.verifySignature(data)) {
      throw new AppError(
        PAYMENT_ERRORS.SIGNATURE_INVALID.code,
        PAYMENT_ERRORS.SIGNATURE_INVALID.message,
        400
      );
    }

    const { orderId, transId, amount, resultCode, message } = data;

    // Extract original order ID (remove timestamp suffix)
    const originalOrderId = orderId.split('_')[0];

    const isSuccess = resultCode === MOMO_RESULT_CODES.SUCCESS;

    return {
      success: isSuccess,
      paymentId: originalOrderId,
      providerOrderId: orderId,
      providerTransactionId: transId,
      amount: parseInt(amount, 10),
      status: isSuccess ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED,
      errorCode: isSuccess ? null : `MOMO_${resultCode}`,
      errorMessage: isSuccess ? null : message,
      rawData: data,
    };
  }

  /**
   * Query payment status from MoMo
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerOrderId - MoMo order ID
   * @returns {Promise<Object>}
   */
  async getStatus(paymentId, providerOrderId) {
    const requestId = this.generateRequestId();

    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `orderId=${providerOrderId}`,
      `partnerCode=${this.partnerCode}`,
      `requestId=${requestId}`,
    ].join('&');

    const signature = this.generateHmacSha256(rawSignature, this.secretKey);

    const requestBody = {
      partnerCode: this.partnerCode,
      requestId,
      orderId: providerOrderId,
      signature,
      lang: 'vi',
    };

    try {
      const response = await this.makeRequest(`${this.baseUrl}/query`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const isSuccess = response.resultCode === MOMO_RESULT_CODES.SUCCESS;

      return {
        success: isSuccess,
        paymentId,
        providerOrderId,
        providerTransactionId: response.transId,
        amount: response.amount,
        status: isSuccess ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
        errorCode: isSuccess ? null : `MOMO_${response.resultCode}`,
        errorMessage: isSuccess ? null : response.message,
      };
    } catch (error) {
      this.logEvent('getStatus:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Process refund via MoMo
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerTransactionId - MoMo transaction ID
   * @param {number} amount - Amount to refund
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>}
   */
  async refund(paymentId, providerTransactionId, amount, reason = '') {
    const requestId = this.generateRequestId();
    const orderId = `refund_${paymentId}_${Date.now()}`;
    const description = reason || `Refund for order ${paymentId}`;

    const rawSignature = [
      `accessKey=${this.accessKey}`,
      `amount=${amount}`,
      `description=${description}`,
      `orderId=${orderId}`,
      `partnerCode=${this.partnerCode}`,
      `requestId=${requestId}`,
      `transId=${providerTransactionId}`,
    ].join('&');

    const signature = this.generateHmacSha256(rawSignature, this.secretKey);

    const requestBody = {
      partnerCode: this.partnerCode,
      orderId,
      requestId,
      amount,
      transId: providerTransactionId,
      lang: 'vi',
      description,
      signature,
    };

    try {
      const response = await this.makeRequest(`${this.baseUrl}/refund`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const isSuccess = response.resultCode === MOMO_RESULT_CODES.SUCCESS;

      return {
        success: isSuccess,
        refundId: response.transId,
        amount,
        status: isSuccess ? 'completed' : 'failed',
        errorCode: isSuccess ? null : `MOMO_${response.resultCode}`,
        errorMessage: isSuccess ? null : response.message,
      };
    } catch (error) {
      this.logEvent('refund:error', { error: error.message });
      throw error;
    }
  }
}

module.exports = MoMoProvider;
