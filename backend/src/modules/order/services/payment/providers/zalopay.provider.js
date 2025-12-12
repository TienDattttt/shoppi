/**
 * ZaloPay Payment Provider
 * Integration with ZaloPay Payment Gateway
 * 
 * Requirements: 3 (ZaloPay Integration)
 * - Create order with ZaloPay API
 * - Verify callback mac using HMAC-SHA256
 * - Process refund requests
 */

const BasePaymentProvider = require('../base.provider');
const { PAYMENT_STATUS, PAYMENT_ERRORS } = require('../payment.interface');
const { AppError } = require('../../../../../shared/utils/error.util');

// ZaloPay API endpoints
const ZALOPAY_ENDPOINTS = {
  SANDBOX: 'https://sb-openapi.zalopay.vn/v2',
  PRODUCTION: 'https://openapi.zalopay.vn/v2',
};

// ZaloPay return codes
const ZALOPAY_RETURN_CODES = {
  SUCCESS: 1,
  FAILED: 2,
  PROCESSING: 3,
};

class ZaloPayProvider extends BasePaymentProvider {
  constructor() {
    super({
      baseUrl: process.env.ZALOPAY_ENDPOINT || ZALOPAY_ENDPOINTS.SANDBOX,
      timeout: 30000,
    });

    this.appId = process.env.ZALOPAY_APP_ID;
    this.key1 = process.env.ZALOPAY_KEY1;
    this.key2 = process.env.ZALOPAY_KEY2;

    if (!this.appId || !this.key1 || !this.key2) {
      console.warn('[ZaloPay] Missing configuration. Payment will not work.');
    }
  }

  get name() {
    return 'zalopay';
  }

  /**
   * Format date for ZaloPay (yyMMdd)
   * @param {Date} date - Date to format
   * @returns {string}
   */
  formatDate(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return [
      date.getFullYear().toString().slice(-2),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ].join('');
  }

  /**
   * Generate app_trans_id
   * Format: yyMMdd_xxxxxx (max 40 chars, no special chars except underscore)
   * @param {string} orderId - Order ID
   * @returns {string}
   */
  generateAppTransId(orderId) {
    const date = this.formatDate(new Date());
    // Use timestamp + random to ensure uniqueness (ZaloPay doesn't allow UUID format)
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${date}_${timestamp}${random}`;
  }

  /**
   * Create ZaloPay payment
   * @param {Object} order - Order data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async createPayment(order, options = {}) {
    this.validateOrder(order);
    this.logEvent('createPayment', { orderId: order.id, amount: order.amount });

    const appTransId = this.generateAppTransId(order.id);
    const amount = this.formatAmount(order.amount);
    const appTime = Date.now();
    const description = this.buildOrderInfo(order);
    const callbackUrl = options.callbackUrl || this.getNotifyUrl('zalopay');

    // Frontend return URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/payment/success?orderId=${order.id}`;

    // Embed data for callback - must include redirecturl for ZaloPay to redirect after payment
    const embedData = JSON.stringify({
      redirecturl: returnUrl,
      orderId: order.id,
    });

    // Item data (required by ZaloPay) - empty array is fine
    const items = JSON.stringify([]);

    // Build mac string - MUST follow exact order per ZaloPay docs
    // Format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const macData = `${this.appId}|${appTransId}|${order.userId || 'anonymous'}|${amount}|${appTime}|${embedData}|${items}`;
    
    console.log('[ZaloPay] MAC data:', macData);
    
    const mac = this.generateHmacSha256(macData, this.key1);

    const requestBody = {
      app_id: parseInt(this.appId, 10),
      app_user: order.userId || 'anonymous',
      app_trans_id: appTransId,
      app_time: appTime,
      amount,
      item: items,
      description,
      embed_data: embedData,
      bank_code: options.bankCode || '',
      callback_url: callbackUrl,
      mac,
    };

    try {
      console.log('[ZaloPay] Request URL:', `${this.baseUrl}/create`);
      console.log('[ZaloPay] Request body:', requestBody);
      
      const response = await this.makeRequest(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      console.log('[ZaloPay] Response:', response);

      if (response.return_code !== ZALOPAY_RETURN_CODES.SUCCESS) {
        throw new AppError(
          PAYMENT_ERRORS.PROVIDER_ERROR.code,
          response.return_message || response.sub_return_message || 'ZaloPay payment creation failed',
          400
        );
      }

      return {
        paymentId: order.id,
        providerOrderId: appTransId,
        zpTransToken: response.zp_trans_token,
        payUrl: response.order_url,
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
   * Verify ZaloPay callback mac
   * @param {Object} data - Callback data
   * @returns {boolean}
   */
  verifySignature(data) {
    const { data: callbackData, mac } = data;
    const expectedMac = this.generateHmacSha256(callbackData, this.key2);
    return mac === expectedMac;
  }

  /**
   * Process ZaloPay callback
   * @param {Object} data - Callback data
   * @returns {Promise<Object>}
   */
  async processCallback(data) {
    this.logEvent('processCallback', data);

    // Verify mac
    if (!this.verifySignature(data)) {
      throw new AppError(
        PAYMENT_ERRORS.SIGNATURE_INVALID.code,
        PAYMENT_ERRORS.SIGNATURE_INVALID.message,
        400
      );
    }

    // Parse callback data
    const callbackData = JSON.parse(data.data);
    const {
      app_trans_id,
      zp_trans_id,
      amount,
      embed_data,
    } = callbackData;

    // Extract original order ID from embed_data
    let originalOrderId = app_trans_id.split('_')[1]; // Default extraction
    try {
      const embedDataObj = JSON.parse(embed_data);
      if (embedDataObj.orderId) {
        originalOrderId = embedDataObj.orderId;
      }
    } catch {
      // Use default extraction
    }

    return {
      success: true,
      paymentId: originalOrderId,
      providerOrderId: app_trans_id,
      providerTransactionId: zp_trans_id,
      amount: parseInt(amount, 10),
      status: PAYMENT_STATUS.PAID,
      rawData: callbackData,
    };
  }

  /**
   * Query payment status from ZaloPay
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerOrderId - ZaloPay app_trans_id
   * @returns {Promise<Object>}
   */
  async getStatus(paymentId, providerOrderId) {
    const macData = `${this.appId}|${providerOrderId}|${this.key1}`;
    const mac = this.generateHmacSha256(macData, this.key1);

    const requestBody = {
      app_id: parseInt(this.appId, 10),
      app_trans_id: providerOrderId,
      mac,
    };

    try {
      const response = await this.makeRequest(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      const isSuccess = response.return_code === ZALOPAY_RETURN_CODES.SUCCESS;
      const isPending = response.return_code === ZALOPAY_RETURN_CODES.PROCESSING;

      let status = PAYMENT_STATUS.FAILED;
      if (isSuccess) status = PAYMENT_STATUS.PAID;
      else if (isPending) status = PAYMENT_STATUS.PENDING;

      return {
        success: isSuccess,
        paymentId,
        providerOrderId,
        providerTransactionId: response.zp_trans_id,
        amount: response.amount,
        status,
        errorCode: isSuccess ? null : `ZALOPAY_${response.return_code}`,
        errorMessage: isSuccess ? null : response.return_message,
      };
    } catch (error) {
      this.logEvent('getStatus:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Process refund via ZaloPay
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerTransactionId - ZaloPay zp_trans_id
   * @param {number} amount - Amount to refund
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>}
   */
  async refund(paymentId, providerTransactionId, amount, reason = '') {
    const timestamp = Date.now();
    const uid = `${timestamp}${Math.floor(Math.random() * 1000000)}`;
    const description = reason || `Refund for order ${paymentId}`;

    const macData = [
      this.appId,
      providerTransactionId,
      amount,
      description,
      timestamp,
    ].join('|');

    const mac = this.generateHmacSha256(macData, this.key1);

    const requestBody = {
      app_id: parseInt(this.appId, 10),
      zp_trans_id: providerTransactionId,
      amount,
      description,
      timestamp,
      m_refund_id: `${this.formatDate(new Date())}_${this.appId}_${uid}`,
      mac,
    };

    try {
      const response = await this.makeRequest(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestBody).toString(),
      });

      const isSuccess = response.return_code === ZALOPAY_RETURN_CODES.SUCCESS;

      return {
        success: isSuccess,
        refundId: response.refund_id,
        amount,
        status: isSuccess ? 'completed' : 'failed',
        errorCode: isSuccess ? null : `ZALOPAY_${response.return_code}`,
        errorMessage: isSuccess ? null : response.return_message,
      };
    } catch (error) {
      this.logEvent('refund:error', { error: error.message });
      throw error;
    }
  }
}

module.exports = ZaloPayProvider;
