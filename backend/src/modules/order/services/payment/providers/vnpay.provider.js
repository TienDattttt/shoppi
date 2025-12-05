/**
 * VNPay Payment Provider
 * Integration with VNPay Payment Gateway
 * 
 * Requirements: 2 (VNPay Integration)
 * - Create payment URL with vnp_SecureHash
 * - Verify callback signature using SHA512
 * - Process refund requests
 */

const BasePaymentProvider = require('../base.provider');
const { PAYMENT_STATUS, PAYMENT_ERRORS } = require('../payment.interface');
const { AppError } = require('../../../../../shared/utils/error.util');

// VNPay API endpoints
const VNPAY_ENDPOINTS = {
  SANDBOX: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  PRODUCTION: 'https://pay.vnpay.vn/vpcpay.html',
};

// VNPay API endpoints for queries
const VNPAY_API_ENDPOINTS = {
  SANDBOX: 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
  PRODUCTION: 'https://pay.vnpay.vn/merchant_webapi/api/transaction',
};

// VNPay response codes
const VNPAY_RESPONSE_CODES = {
  SUCCESS: '00',
  SUSPECTED_FRAUD: '07',
  NOT_REGISTERED: '09',
  INVALID_CARD: '10',
  EXPIRED_CARD: '11',
  LOCKED_CARD: '12',
  WRONG_OTP: '13',
  CANCELLED: '24',
  INSUFFICIENT_BALANCE: '51',
  EXCEEDED_LIMIT: '65',
  BANK_MAINTENANCE: '75',
  WRONG_PASSWORD: '79',
  OTHER_ERROR: '99',
};

class VNPayProvider extends BasePaymentProvider {
  constructor() {
    super({
      baseUrl: process.env.VNPAY_URL || VNPAY_ENDPOINTS.SANDBOX,
      timeout: 30000,
    });

    this.tmnCode = process.env.VNPAY_TMN_CODE;
    this.hashSecret = process.env.VNPAY_HASH_SECRET;
    this.apiUrl = process.env.VNPAY_API_URL || VNPAY_API_ENDPOINTS.SANDBOX;

    if (!this.tmnCode || !this.hashSecret) {
      console.warn('[VNPay] Missing configuration. Payment will not work.');
    }
  }

  get name() {
    return 'vnpay';
  }

  /**
   * Sort object keys alphabetically
   * @param {Object} obj - Object to sort
   * @returns {Object}
   */
  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      if (obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
        sorted[key] = obj[key];
      }
    }
    return sorted;
  }

  /**
   * Build query string from object
   * @param {Object} obj - Object to convert
   * @returns {string}
   */
  buildQueryString(obj) {
    return Object.entries(obj)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Format date for VNPay (yyyyMMddHHmmss)
   * @param {Date} date - Date to format
   * @returns {string}
   */
  formatDate(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('');
  }

  /**
   * Create VNPay payment URL
   * @param {Object} order - Order data
   * @param {Object} options - Additional options
   * @returns {Promise<Object>}
   */
  async createPayment(order, options = {}) {
    this.validateOrder(order);
    this.logEvent('createPayment', { orderId: order.id, amount: order.amount });

    const createDate = new Date();
    const expireDate = new Date(createDate.getTime() + 15 * 60 * 1000); // 15 minutes
    const orderId = `${order.id}_${Date.now()}`;
    const amount = this.formatAmount(order.amount) * 100; // VNPay requires amount * 100
    const orderInfo = this.buildOrderInfo(order);
    const returnUrl = options.returnUrl || this.getReturnUrl('vnpay');
    const ipAddr = options.ipAddress || '127.0.0.1';

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: options.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: options.orderType || 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: this.formatDate(createDate),
      vnp_ExpireDate: this.formatDate(expireDate),
    };

    // Add bank code if specified
    if (options.bankCode) {
      vnpParams.vnp_BankCode = options.bankCode;
    }

    // Sort and build query string
    const sortedParams = this.sortObject(vnpParams);
    const signData = this.buildQueryString(sortedParams);
    const signature = this.generateSha512(this.hashSecret + signData);

    sortedParams.vnp_SecureHash = signature;

    const payUrl = `${this.baseUrl}?${this.buildQueryString(sortedParams)}`;

    return {
      paymentId: order.id,
      providerOrderId: orderId,
      payUrl,
      provider: this.name,
      amount: order.amount,
      status: PAYMENT_STATUS.PENDING,
      expiresAt: expireDate,
    };
  }

  /**
   * Verify VNPay callback signature
   * @param {Object} data - Callback data
   * @returns {boolean}
   */
  verifySignature(data) {
    const secureHash = data.vnp_SecureHash;
    
    // Remove hash fields from data
    const verifyData = { ...data };
    delete verifyData.vnp_SecureHash;
    delete verifyData.vnp_SecureHashType;

    // Sort and build query string
    const sortedParams = this.sortObject(verifyData);
    const signData = this.buildQueryString(sortedParams);
    const expectedHash = this.generateSha512(this.hashSecret + signData);

    return secureHash === expectedHash;
  }

  /**
   * Process VNPay callback
   * @param {Object} data - Callback data
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

    const {
      vnp_TxnRef,
      vnp_Amount,
      vnp_ResponseCode,
      vnp_TransactionNo,
      vnp_TransactionStatus,
      vnp_BankCode,
      vnp_PayDate,
    } = data;

    // Extract original order ID
    const originalOrderId = vnp_TxnRef.split('_')[0];
    const isSuccess = vnp_ResponseCode === VNPAY_RESPONSE_CODES.SUCCESS &&
                      vnp_TransactionStatus === '00';

    return {
      success: isSuccess,
      paymentId: originalOrderId,
      providerOrderId: vnp_TxnRef,
      providerTransactionId: vnp_TransactionNo,
      amount: parseInt(vnp_Amount, 10) / 100, // Convert back from VNPay format
      status: isSuccess ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED,
      bankCode: vnp_BankCode,
      payDate: vnp_PayDate,
      errorCode: isSuccess ? null : `VNPAY_${vnp_ResponseCode}`,
      errorMessage: isSuccess ? null : this.getErrorMessage(vnp_ResponseCode),
      rawData: data,
    };
  }

  /**
   * Get error message from response code
   * @param {string} code - VNPay response code
   * @returns {string}
   */
  getErrorMessage(code) {
    const messages = {
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
      '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
      '11': 'Đã hết hạn chờ thanh toán',
      '12': 'Thẻ/Tài khoản bị khóa',
      '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
      '24': 'Khách hàng hủy giao dịch',
      '51': 'Tài khoản không đủ số dư',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
      '75': 'Ngân hàng thanh toán đang bảo trì',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
      '99': 'Lỗi không xác định',
    };
    return messages[code] || 'Lỗi không xác định';
  }

  /**
   * Query payment status from VNPay
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerOrderId - VNPay order ID
   * @returns {Promise<Object>}
   */
  async getStatus(paymentId, providerOrderId) {
    const requestDate = this.formatDate(new Date());
    const ipAddr = '127.0.0.1';

    const queryParams = {
      vnp_RequestId: this.generateRequestId(),
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: this.tmnCode,
      vnp_TxnRef: providerOrderId,
      vnp_OrderInfo: `Query order ${providerOrderId}`,
      vnp_TransactionDate: requestDate,
      vnp_CreateDate: requestDate,
      vnp_IpAddr: ipAddr,
    };

    const sortedParams = this.sortObject(queryParams);
    const signData = this.buildQueryString(sortedParams);
    const signature = this.generateSha512(this.hashSecret + signData);

    queryParams.vnp_SecureHash = signature;

    try {
      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(queryParams),
      });

      const isSuccess = response.vnp_ResponseCode === VNPAY_RESPONSE_CODES.SUCCESS;

      return {
        success: isSuccess,
        paymentId,
        providerOrderId,
        providerTransactionId: response.vnp_TransactionNo,
        amount: response.vnp_Amount ? parseInt(response.vnp_Amount, 10) / 100 : 0,
        status: isSuccess ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
        errorCode: isSuccess ? null : `VNPAY_${response.vnp_ResponseCode}`,
        errorMessage: isSuccess ? null : response.vnp_Message,
      };
    } catch (error) {
      this.logEvent('getStatus:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Process refund via VNPay
   * @param {string} paymentId - Internal payment ID
   * @param {string} providerTransactionId - VNPay transaction ID
   * @param {number} amount - Amount to refund
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>}
   */
  async refund(paymentId, providerTransactionId, amount, reason = '') {
    const requestDate = this.formatDate(new Date());
    const ipAddr = '127.0.0.1';

    const refundParams = {
      vnp_RequestId: this.generateRequestId(),
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: this.tmnCode,
      vnp_TransactionType: '02', // Full refund
      vnp_TxnRef: `refund_${paymentId}_${Date.now()}`,
      vnp_Amount: amount * 100,
      vnp_OrderInfo: reason || `Refund for order ${paymentId}`,
      vnp_TransactionNo: providerTransactionId,
      vnp_TransactionDate: requestDate,
      vnp_CreateDate: requestDate,
      vnp_CreateBy: 'system',
      vnp_IpAddr: ipAddr,
    };

    const sortedParams = this.sortObject(refundParams);
    const signData = this.buildQueryString(sortedParams);
    const signature = this.generateSha512(this.hashSecret + signData);

    refundParams.vnp_SecureHash = signature;

    try {
      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(refundParams),
      });

      const isSuccess = response.vnp_ResponseCode === VNPAY_RESPONSE_CODES.SUCCESS;

      return {
        success: isSuccess,
        refundId: response.vnp_TransactionNo,
        amount,
        status: isSuccess ? 'completed' : 'failed',
        errorCode: isSuccess ? null : `VNPAY_${response.vnp_ResponseCode}`,
        errorMessage: isSuccess ? null : response.vnp_Message,
      };
    } catch (error) {
      this.logEvent('refund:error', { error: error.message });
      throw error;
    }
  }
}

module.exports = VNPayProvider;
