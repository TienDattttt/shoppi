/**
 * Shipping Provider Interface
 * Base interface for all shipping providers (GHTK, GHN, Viettel Post, In-house)
 * 
 * Feature: shipping-provider-integration
 * Requirements: 8.1, 8.2
 */

/**
 * Unified shipping status enum
 */
const ShippingStatus = {
  CREATED: 'created',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
  RETURNING: 'returning',
  CANCELLED: 'cancelled',
};

/**
 * Base interface for all shipping providers
 * All providers must implement these methods
 */
class ShippingProviderInterface {
  constructor(config = {}) {
    if (new.target === ShippingProviderInterface) {
      throw new Error('ShippingProviderInterface cannot be instantiated directly');
    }
    this.config = config;
    this.providerCode = 'base';
    this.providerName = 'Base Provider';
  }

  /**
   * Calculate shipping fee
   * @param {Object} params - Shipping parameters
   * @param {Object} params.pickup - Pickup address {province, district, ward, address}
   * @param {Object} params.delivery - Delivery address {province, district, ward, address}
   * @param {Array} params.items - Items to ship [{name, quantity, weight, value}]
   * @param {number} params.codAmount - COD amount (0 if prepaid)
   * @returns {Promise<{fee: number, estimatedDays: number, serviceName: string}>}
   */
  async calculateFee(params) {
    throw new Error('calculateFee must be implemented by provider');
  }

  /**
   * Create shipping order with provider
   * @param {Object} orderData - Order details
   * @param {string} orderData.orderId - Internal order ID
   * @param {Object} orderData.pickup - Pickup address and contact
   * @param {Object} orderData.delivery - Delivery address and contact
   * @param {Array} orderData.items - Items to ship
   * @param {number} orderData.codAmount - COD amount
   * @param {string} orderData.note - Delivery note
   * @returns {Promise<{trackingNumber: string, providerOrderId: string, fee: number}>}
   */
  async createOrder(orderData) {
    throw new Error('createOrder must be implemented by provider');
  }

  /**
   * Cancel shipping order
   * @param {string} trackingNumber - Tracking number to cancel
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async cancelOrder(trackingNumber) {
    throw new Error('cancelOrder must be implemented by provider');
  }

  /**
   * Get tracking information
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<{status: string, providerStatus: string, history: Array, estimatedDelivery: Date}>}
   */
  async getTracking(trackingNumber) {
    throw new Error('getTracking must be implemented by provider');
  }

  /**
   * Validate webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from header
   * @returns {boolean}
   */
  validateWebhook(payload, signature) {
    throw new Error('validateWebhook must be implemented by provider');
  }

  /**
   * Parse webhook payload to unified format
   * @param {Object} payload - Raw webhook payload
   * @returns {{trackingNumber: string, status: string, providerStatus: string, timestamp: Date, data: Object}}
   */
  parseWebhookPayload(payload) {
    throw new Error('parseWebhookPayload must be implemented by provider');
  }

  /**
   * Test provider connection/credentials
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async testConnection() {
    throw new Error('testConnection must be implemented by provider');
  }

  /**
   * Get provider code
   * @returns {string}
   */
  getProviderCode() {
    return this.providerCode;
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProviderName() {
    return this.providerName;
  }

  /**
   * Check if provider is configured
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }
}

/**
 * Base provider class with common utilities
 */
class BaseShippingProvider extends ShippingProviderInterface {
  constructor(config) {
    super(config);
  }

  /**
   * Format address for API calls
   * @param {Object} address
   * @returns {string}
   */
  formatAddress(address) {
    const parts = [
      address.address,
      address.ward,
      address.district,
      address.province,
    ].filter(Boolean);
    return parts.join(', ');
  }

  /**
   * Calculate total weight from items
   * @param {Array} items
   * @returns {number} Weight in grams
   */
  calculateTotalWeight(items) {
    return items.reduce((total, item) => {
      const weight = item.weight || 500; // Default 500g
      return total + (weight * (item.quantity || 1));
    }, 0);
  }

  /**
   * Calculate total value from items
   * @param {Array} items
   * @returns {number}
   */
  calculateTotalValue(items) {
    return items.reduce((total, item) => {
      const value = item.value || item.price || 0;
      return total + (value * (item.quantity || 1));
    }, 0);
  }

  /**
   * Log API call for debugging
   * @param {string} method
   * @param {string} endpoint
   * @param {Object} data
   */
  logApiCall(method, endpoint, data) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.providerCode}] ${method} ${endpoint}`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Handle API error
   * @param {Error} error
   * @param {string} operation
   */
  handleApiError(error, operation) {
    console.error(`[${this.providerCode}] ${operation} failed:`, error.message);
    throw error;
  }
}

module.exports = {
  ShippingProviderInterface,
  BaseShippingProvider,
  ShippingStatus,
};
