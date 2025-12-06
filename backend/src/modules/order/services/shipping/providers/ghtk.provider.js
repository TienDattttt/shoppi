/**
 * GHTK (Giao Hang Tiet Kiem) Shipping Provider
 * Implementation for GHTK API integration
 * 
 * Feature: shipping-provider-integration
 * Requirements: 2.2, 3.2
 */

const crypto = require('crypto');
const { BaseShippingProvider, ShippingStatus } = require('../shipping.interface');
const { AppError } = require('../../../../../shared/utils/error.util');

// GHTK API endpoints
const GHTK_ENDPOINTS = {
  sandbox: 'https://services.ghtklab.com',
  production: 'https://services.giaohangtietkiem.vn',
};

// GHTK status mapping to unified status
const GHTK_STATUS_MAP = {
  '-1': ShippingStatus.CANCELLED,
  '1': ShippingStatus.CREATED,
  '2': ShippingStatus.PICKED_UP,
  '3': ShippingStatus.DELIVERING,
  '4': ShippingStatus.DELIVERED,
  '5': ShippingStatus.RETURNED,
  '6': ShippingStatus.RETURNING,
  '7': ShippingStatus.ASSIGNED,
  '8': ShippingStatus.FAILED,
  '9': ShippingStatus.DELIVERING, // Đang giao lại
  '10': ShippingStatus.RETURNING, // Đang trả hàng
  '11': ShippingStatus.FAILED, // Giao thất bại
  '12': ShippingStatus.RETURNED, // Đã trả hàng
  '13': ShippingStatus.CANCELLED, // Hủy
};

class GHTKProvider extends BaseShippingProvider {
  constructor(config = {}) {
    super(config);
    this.providerCode = 'ghtk';
    this.providerName = 'Giao Hàng Tiết Kiệm';
    this.apiToken = config.apiToken || process.env.GHTK_API_TOKEN;
    this.sandbox = config.sandbox ?? (process.env.GHTK_SANDBOX === 'true');
    this.baseUrl = this.sandbox ? GHTK_ENDPOINTS.sandbox : GHTK_ENDPOINTS.production;
    this.webhookSecret = config.webhookSecret || process.env.GHTK_WEBHOOK_SECRET;
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiToken;
  }

  /**
   * Make API request to GHTK
   */
  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Token': this.apiToken,
        'Content-Type': 'application/json',
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    this.logApiCall(method, endpoint, data);

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!result.success) {
        throw new AppError(
          result.message || 'GHTK API error',
          response.status,
          'GHTK_API_ERROR'
        );
      }

      return result;
    } catch (error) {
      this.handleApiError(error, `${method} ${endpoint}`);
      throw error;
    }
  }

  /**
   * Calculate shipping fee
   * @param {Object} params
   */
  async calculateFee(params) {
    const { pickup, delivery, items, codAmount = 0 } = params;

    const weight = this.calculateTotalWeight(items);
    const value = this.calculateTotalValue(items);

    const requestData = {
      pick_province: pickup.province,
      pick_district: pickup.district,
      pick_ward: pickup.ward,
      pick_address: pickup.address,
      province: delivery.province,
      district: delivery.district,
      ward: delivery.ward,
      address: delivery.address,
      weight: weight,
      value: value,
      transport: 'road', // road or fly
      deliver_option: 'none', // none, xteam
    };

    const result = await this.makeRequest('POST', '/services/shipment/fee', requestData);

    return {
      fee: result.fee?.fee || 0,
      insuranceFee: result.fee?.insurance_fee || 0,
      estimatedDays: this.estimateDeliveryDays(pickup.province, delivery.province),
      serviceName: 'GHTK Standard',
      breakdown: {
        baseFee: result.fee?.fee || 0,
        insuranceFee: result.fee?.insurance_fee || 0,
        codFee: codAmount > 0 ? Math.round(codAmount * 0.01) : 0, // 1% COD fee
      },
    };
  }

  /**
   * Create shipping order
   * @param {Object} orderData
   */
  async createOrder(orderData) {
    const {
      orderId,
      pickup,
      delivery,
      items,
      codAmount = 0,
      note = '',
    } = orderData;

    const weight = this.calculateTotalWeight(items);
    const value = this.calculateTotalValue(items);

    const requestData = {
      products: items.map(item => ({
        name: item.name,
        weight: item.weight || 0.5,
        quantity: item.quantity || 1,
        product_code: item.sku || item.id,
      })),
      order: {
        id: orderId,
        pick_name: pickup.name,
        pick_address: pickup.address,
        pick_province: pickup.province,
        pick_district: pickup.district,
        pick_ward: pickup.ward,
        pick_tel: pickup.phone,
        
        name: delivery.name,
        address: delivery.address,
        province: delivery.province,
        district: delivery.district,
        ward: delivery.ward,
        tel: delivery.phone,
        email: delivery.email || '',
        
        hamlet: 'Khác',
        is_freeship: codAmount === 0 ? 1 : 0,
        pick_money: codAmount,
        note: note,
        value: value,
        transport: 'road',
      },
    };

    const result = await this.makeRequest('POST', '/services/shipment/order', requestData);

    return {
      trackingNumber: result.order?.label || result.order?.tracking_id,
      providerOrderId: result.order?.partner_id || result.order?.order_id,
      fee: result.order?.fee || 0,
      estimatedPickup: result.order?.estimated_pick_time,
      estimatedDelivery: result.order?.estimated_deliver_time,
    };
  }

  /**
   * Cancel shipping order
   * @param {string} trackingNumber
   */
  async cancelOrder(trackingNumber) {
    try {
      const result = await this.makeRequest(
        'POST',
        `/services/shipment/cancel/${trackingNumber}`
      );

      return {
        success: result.success === true,
        message: result.message || 'Order cancelled successfully',
      };
    } catch (error) {
      // Check if already picked up
      if (error.message?.includes('picked') || error.message?.includes('đã lấy')) {
        return {
          success: false,
          message: 'Cannot cancel: order already picked up',
          reason: 'ALREADY_PICKED_UP',
        };
      }
      throw error;
    }
  }

  /**
   * Get tracking information
   * @param {string} trackingNumber
   */
  async getTracking(trackingNumber) {
    const result = await this.makeRequest(
      'GET',
      `/services/shipment/v2/${trackingNumber}`
    );

    const order = result.order || {};
    const statusCode = String(order.status);

    return {
      trackingNumber,
      status: GHTK_STATUS_MAP[statusCode] || ShippingStatus.CREATED,
      providerStatus: statusCode,
      statusMessage: order.status_text || this.getStatusText(statusCode),
      estimatedDelivery: order.estimated_deliver_time 
        ? new Date(order.estimated_deliver_time) 
        : null,
      history: this.parseTrackingHistory(order.logs || []),
      details: {
        pickupTime: order.pick_date,
        deliveryTime: order.deliver_date,
        shipper: order.ship_name,
        shipperPhone: order.ship_tel,
      },
    };
  }

  /**
   * Validate webhook signature
   * @param {Object} payload
   * @param {string} signature
   */
  validateWebhook(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('[GHTK] Webhook secret not configured, skipping validation');
      return true;
    }

    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payloadString)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Parse webhook payload
   * @param {Object} payload
   */
  parseWebhookPayload(payload) {
    const statusCode = String(payload.status_id || payload.status);

    return {
      trackingNumber: payload.label_id || payload.tracking_number,
      providerOrderId: payload.partner_id,
      status: GHTK_STATUS_MAP[statusCode] || ShippingStatus.CREATED,
      providerStatus: statusCode,
      statusMessage: payload.status_name || this.getStatusText(statusCode),
      timestamp: payload.update_time ? new Date(payload.update_time) : new Date(),
      data: {
        reason: payload.reason,
        weight: payload.weight,
        fee: payload.fee,
        shipperName: payload.ship_name,
        shipperPhone: payload.ship_tel,
      },
    };
  }

  /**
   * Test connection to GHTK API
   */
  async testConnection() {
    try {
      // Use fee calculation as a test endpoint
      await this.makeRequest('POST', '/services/shipment/fee', {
        pick_province: 'Hồ Chí Minh',
        pick_district: 'Quận 1',
        province: 'Hồ Chí Minh',
        district: 'Quận 3',
        weight: 500,
        value: 100000,
      });

      return {
        success: true,
        message: 'GHTK connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: `GHTK connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Parse tracking history from GHTK logs
   */
  parseTrackingHistory(logs) {
    return logs.map(log => ({
      status: GHTK_STATUS_MAP[String(log.status)] || log.status,
      providerStatus: String(log.status),
      message: log.status_text || log.note,
      timestamp: log.time ? new Date(log.time) : null,
      location: log.location,
    }));
  }

  /**
   * Get status text from status code
   */
  getStatusText(statusCode) {
    const statusTexts = {
      '-1': 'Đã hủy',
      '1': 'Chưa tiếp nhận',
      '2': 'Đã tiếp nhận',
      '3': 'Đang giao hàng',
      '4': 'Đã giao hàng',
      '5': 'Đã đối soát',
      '6': 'Đang trả hàng',
      '7': 'Đã phân công',
      '8': 'Giao thất bại',
      '9': 'Đang giao lại',
      '10': 'Đang trả hàng',
      '11': 'Giao thất bại',
      '12': 'Đã trả hàng',
      '13': 'Đã hủy',
    };
    return statusTexts[statusCode] || 'Không xác định';
  }

  /**
   * Estimate delivery days based on provinces
   */
  estimateDeliveryDays(fromProvince, toProvince) {
    // Same province: 1-2 days
    if (fromProvince === toProvince) {
      return 2;
    }

    // Major cities: 2-3 days
    const majorCities = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];
    if (majorCities.includes(fromProvince) && majorCities.includes(toProvince)) {
      return 3;
    }

    // Other: 3-5 days
    return 5;
  }
}

module.exports = GHTKProvider;
