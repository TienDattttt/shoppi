/**
 * In-House Shipping Provider
 * Adapter for existing internal shipper module
 * 
 * Feature: shipping-provider-integration
 * Requirements: 1.4, 8.2
 */

const { BaseShippingProvider, ShippingStatus } = require('../shipping.interface');
const shippingService = require('../../shipping.service');

// In-house status mapping
const INHOUSE_STATUS_MAP = {
  'pending': ShippingStatus.CREATED,
  'assigned': ShippingStatus.ASSIGNED,
  'picked_up': ShippingStatus.PICKED_UP,
  'in_transit': ShippingStatus.DELIVERING,
  'out_for_delivery': ShippingStatus.DELIVERING,
  'delivered': ShippingStatus.DELIVERED,
  'failed': ShippingStatus.FAILED,
  'returned': ShippingStatus.RETURNED,
  'cancelled': ShippingStatus.CANCELLED,
};

class InHouseProvider extends BaseShippingProvider {
  constructor(config = {}) {
    super(config);
    this.providerCode = 'inhouse';
    this.providerName = 'Giao hàng nội bộ';
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return true; // In-house is always available
  }

  /**
   * Calculate shipping fee using existing shipping service
   */
  async calculateFee(params) {
    const { pickup, delivery, items, codAmount = 0 } = params;

    // Use existing shipping service calculation
    // Convert addresses to location format
    const shopLocation = { lat: pickup.lat || 10.762622, lng: pickup.lng || 106.660172 };
    const deliveryLocation = { lat: delivery.lat || 10.823099, lng: delivery.lng || 106.629664 };

    // Calculate using existing service
    const result = await shippingService.calculateShippingFee(
      null, // shopId - not needed for direct calculation
      null, // addressId - not needed
      items
    );

    // Add COD fee if applicable
    const codFee = codAmount > 0 ? Math.round(codAmount * 0.01) : 0;

    return {
      fee: result.fee + codFee,
      estimatedDays: this.estimateDeliveryDays(result.distanceKm),
      serviceName: 'Giao hàng nội bộ',
      breakdown: {
        baseFee: result.fee,
        codFee,
        distanceKm: result.distanceKm,
      },
    };
  }

  /**
   * Create shipping order
   */
  async createOrder(orderData) {
    const { orderId, pickup, delivery, items, codAmount = 0, note = '' } = orderData;

    // Use existing shipping service to create shipment
    const shipment = await shippingService.createShipment(
      orderId,
      { lat: pickup.lat || 10.762622, lng: pickup.lng || 106.660172 },
      { lat: delivery.lat || 10.823099, lng: delivery.lng || 106.629664 }
    );

    return {
      trackingNumber: shipment.trackingNumber,
      providerOrderId: shipment.subOrderId,
      fee: 0, // Fee already calculated
      estimatedDelivery: shipment.estimatedDelivery,
    };
  }

  /**
   * Cancel shipping order
   */
  async cancelOrder(trackingNumber) {
    // In-house cancellation logic
    // TODO: Integrate with shipper module to cancel assignment
    return {
      success: true,
      message: 'Đã hủy đơn giao hàng nội bộ',
    };
  }

  /**
   * Get tracking information
   */
  async getTracking(trackingNumber) {
    // TODO: Integrate with shipper module to get real tracking
    return {
      trackingNumber,
      status: ShippingStatus.CREATED,
      providerStatus: 'pending',
      statusMessage: 'Đang chờ shipper nhận đơn',
      estimatedDelivery: null,
      history: [
        {
          status: ShippingStatus.CREATED,
          message: 'Đơn hàng đã được tạo',
          timestamp: new Date(),
        },
      ],
      details: {},
    };
  }

  /**
   * Validate webhook (in-house uses internal events, not webhooks)
   */
  validateWebhook(payload, signature) {
    // In-house doesn't use external webhooks
    // Status updates come from internal shipper module
    return true;
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload) {
    return {
      trackingNumber: payload.tracking_number,
      providerOrderId: payload.order_id,
      status: INHOUSE_STATUS_MAP[payload.status] || ShippingStatus.CREATED,
      providerStatus: payload.status,
      statusMessage: payload.message,
      timestamp: new Date(payload.timestamp || Date.now()),
      data: payload,
    };
  }

  /**
   * Test connection
   */
  async testConnection() {
    return {
      success: true,
      message: 'In-house shipping is always available',
    };
  }

  /**
   * Estimate delivery days based on distance
   */
  estimateDeliveryDays(distanceKm) {
    if (!distanceKm || distanceKm < 10) return 1;
    if (distanceKm < 50) return 2;
    if (distanceKm < 100) return 3;
    return 5;
  }
}

module.exports = InHouseProvider;
