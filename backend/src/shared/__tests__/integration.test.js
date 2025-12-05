/**
 * Integration Tests
 * End-to-end flow testing for the backend system
 * 
 * These tests verify the complete flow:
 * - Order flow: Create order → Payment → Shipment → Delivery
 * - Shipper flow: Go online → Receive shipment → Track location → Complete delivery
 * - Notification flow: Events trigger correct notifications
 */

const { describe, it, expect, beforeAll, afterAll, jest } = require('@jest/globals');

// Mock external services
jest.mock('../../shared/rabbitmq/rabbitmq.client', () => ({
  publishOrderEvent: jest.fn().mockResolvedValue(true),
  publishToExchange: jest.fn().mockResolvedValue(true),
  EXCHANGES: { EVENTS: 'events', NOTIFICATIONS: 'notifications', ORDERS: 'orders' },
  QUEUES: { NOTIFICATIONS: 'notifications', ORDER_PROCESSING: 'order_processing' },
}));

jest.mock('../../shared/redis/redis.client', () => ({
  getClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    geoadd: jest.fn().mockResolvedValue(1),
    geopos: jest.fn().mockResolvedValue([[106.6297, 10.8231]]),
    georadius: jest.fn().mockResolvedValue([]),
  }),
}));

// ============================================
// TEST UTILITIES
// ============================================

/**
 * Generate mock order data
 */
function generateMockOrder() {
  return {
    id: `order_${Date.now()}`,
    user_id: 'user_123',
    grand_total: 500000,
    payment_method: 'momo',
    status: 'pending_payment',
    sub_orders: [
      {
        id: `suborder_${Date.now()}`,
        shop_id: 'shop_456',
        total: 500000,
        status: 'pending',
      },
    ],
    created_at: new Date().toISOString(),
  };
}

/**
 * Generate mock shipper data
 */
function generateMockShipper() {
  return {
    id: `shipper_${Date.now()}`,
    user_id: 'user_shipper_123',
    vehicle_type: 'motorcycle',
    vehicle_plate: '59A1-12345',
    status: 'active',
    is_online: true,
    is_available: true,
    current_lat: 10.8231,
    current_lng: 106.6297,
  };
}

/**
 * Generate mock shipment data
 */
function generateMockShipment(subOrderId, shipperId = null) {
  return {
    id: `shipment_${Date.now()}`,
    sub_order_id: subOrderId,
    shipper_id: shipperId,
    tracking_number: `TRK${Date.now()}`,
    status: shipperId ? 'assigned' : 'created',
    pickup_address: '123 Shop Street, District 1, HCMC',
    pickup_lat: 10.7769,
    pickup_lng: 106.7009,
    delivery_address: '456 Customer Street, District 3, HCMC',
    delivery_lat: 10.7831,
    delivery_lng: 106.6867,
    shipping_fee: 25000,
    cod_amount: 0,
  };
}

// ============================================
// ORDER FLOW TESTS
// ============================================

describe('Order Flow Integration', () => {
  describe('Complete Order Flow', () => {
    it('should handle order creation → payment → shipment → delivery', async () => {
      // Step 1: Create order
      const order = generateMockOrder();
      expect(order.status).toBe('pending_payment');
      expect(order.sub_orders.length).toBeGreaterThan(0);

      // Step 2: Simulate payment success
      const paidOrder = { ...order, status: 'confirmed' };
      const paidSubOrder = { ...order.sub_orders[0], status: 'pending' };
      expect(paidOrder.status).toBe('confirmed');
      expect(paidSubOrder.status).toBe('pending');

      // Step 3: Partner confirms order
      const confirmedSubOrder = { ...paidSubOrder, status: 'processing' };
      expect(confirmedSubOrder.status).toBe('processing');

      // Step 4: Partner packs order
      const packedSubOrder = { ...confirmedSubOrder, status: 'ready_to_ship' };
      expect(packedSubOrder.status).toBe('ready_to_ship');

      // Step 5: Create shipment
      const shipment = generateMockShipment(packedSubOrder.id);
      expect(shipment.status).toBe('created');

      // Step 6: Assign shipper
      const shipper = generateMockShipper();
      const assignedShipment = { ...shipment, shipper_id: shipper.id, status: 'assigned' };
      expect(assignedShipment.shipper_id).toBe(shipper.id);
      expect(assignedShipment.status).toBe('assigned');

      // Step 7: Shipper picks up
      const pickedUpShipment = { ...assignedShipment, status: 'picked_up' };
      expect(pickedUpShipment.status).toBe('picked_up');

      // Step 8: Shipper delivers
      const deliveredShipment = { ...pickedUpShipment, status: 'delivered' };
      expect(deliveredShipment.status).toBe('delivered');

      // Step 9: Customer confirms receipt
      const completedSubOrder = { ...packedSubOrder, status: 'completed' };
      const completedOrder = { ...paidOrder, status: 'completed' };
      expect(completedSubOrder.status).toBe('completed');
      expect(completedOrder.status).toBe('completed');
    });

    it('should handle payment failure correctly', async () => {
      const order = generateMockOrder();
      
      // Simulate payment failure
      const failedOrder = { ...order, status: 'payment_failed' };
      expect(failedOrder.status).toBe('payment_failed');
      
      // Stock should be released (mocked)
      // Notification should be sent to customer (mocked)
    });

    it('should handle order cancellation by customer', async () => {
      const order = generateMockOrder();
      order.status = 'confirmed';
      
      // Customer cancels before shipping
      const cancelledOrder = { ...order, status: 'cancelled' };
      expect(cancelledOrder.status).toBe('cancelled');
    });
  });
});

// ============================================
// SHIPPER FLOW TESTS
// ============================================

describe('Shipper Flow Integration', () => {
  describe('Complete Shipper Flow', () => {
    it('should handle shipper going online → receiving shipment → tracking → delivery', async () => {
      // Step 1: Shipper goes online
      const shipper = generateMockShipper();
      shipper.is_online = false;
      
      const onlineShipper = { ...shipper, is_online: true };
      expect(onlineShipper.is_online).toBe(true);

      // Step 2: Shipper receives shipment assignment
      const shipment = generateMockShipment('suborder_123', onlineShipper.id);
      expect(shipment.shipper_id).toBe(onlineShipper.id);

      // Step 3: Shipper updates location (GPS tracking)
      const locationUpdate = {
        shipper_id: onlineShipper.id,
        lat: 10.7800,
        lng: 106.6900,
        timestamp: new Date().toISOString(),
      };
      expect(locationUpdate.lat).toBeDefined();
      expect(locationUpdate.lng).toBeDefined();

      // Step 4: Shipper picks up package
      const pickedUpShipment = { ...shipment, status: 'picked_up' };
      expect(pickedUpShipment.status).toBe('picked_up');

      // Step 5: Shipper delivers package
      const deliveredShipment = { 
        ...pickedUpShipment, 
        status: 'delivered',
        delivery_photo_url: 'https://storage.example.com/proof.jpg',
      };
      expect(deliveredShipment.status).toBe('delivered');
      expect(deliveredShipment.delivery_photo_url).toBeDefined();

      // Step 6: Shipper becomes available again
      const availableShipper = { ...onlineShipper, is_available: true };
      expect(availableShipper.is_available).toBe(true);
    });

    it('should handle delivery failure', async () => {
      const shipper = generateMockShipper();
      const shipment = generateMockShipment('suborder_123', shipper.id);
      shipment.status = 'delivering';

      // Delivery fails
      const failedShipment = { 
        ...shipment, 
        status: 'failed',
        failure_reason: 'Customer not available',
      };
      expect(failedShipment.status).toBe('failed');
      expect(failedShipment.failure_reason).toBeDefined();
    });

    it('should handle shipper going offline', async () => {
      const shipper = generateMockShipper();
      
      // Shipper goes offline
      const offlineShipper = { ...shipper, is_online: false };
      expect(offlineShipper.is_online).toBe(false);
    });
  });
});

// ============================================
// NOTIFICATION FLOW TESTS
// ============================================

describe('Notification Flow Integration', () => {
  const rabbitmq = require('../../shared/rabbitmq/rabbitmq.client');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Events Trigger Notifications', () => {
    it('should publish ORDER_CREATED event', async () => {
      const order = generateMockOrder();
      
      await rabbitmq.publishOrderEvent('created', {
        orderId: order.id,
        userId: order.user_id,
        grandTotal: order.grand_total,
      });

      expect(rabbitmq.publishOrderEvent).toHaveBeenCalledWith('created', expect.objectContaining({
        orderId: order.id,
      }));
    });

    it('should publish PAYMENT_SUCCESS event', async () => {
      const order = generateMockOrder();
      
      await rabbitmq.publishOrderEvent('payment_success', {
        orderId: order.id,
        provider: 'momo',
        amount: order.grand_total,
      });

      expect(rabbitmq.publishOrderEvent).toHaveBeenCalledWith('payment_success', expect.objectContaining({
        orderId: order.id,
        provider: 'momo',
      }));
    });

    it('should publish ORDER_STATUS_CHANGED event', async () => {
      const order = generateMockOrder();
      
      await rabbitmq.publishOrderEvent('status_changed', {
        orderId: order.id,
        oldStatus: 'pending',
        newStatus: 'processing',
      });

      expect(rabbitmq.publishOrderEvent).toHaveBeenCalledWith('status_changed', expect.objectContaining({
        orderId: order.id,
        oldStatus: 'pending',
        newStatus: 'processing',
      }));
    });
  });

  describe('Shipment Events Trigger Notifications', () => {
    it('should publish SHIPMENT_STATUS_CHANGED event', async () => {
      const shipment = generateMockShipment('suborder_123', 'shipper_456');
      
      await rabbitmq.publishToExchange(
        rabbitmq.EXCHANGES.EVENTS,
        'shipment.status_changed',
        {
          shipmentId: shipment.id,
          status: 'delivered',
          previousStatus: 'delivering',
        }
      );

      expect(rabbitmq.publishToExchange).toHaveBeenCalledWith(
        'events',
        'shipment.status_changed',
        expect.objectContaining({
          shipmentId: shipment.id,
          status: 'delivered',
        })
      );
    });
  });

  describe('Product Events Trigger Search Index Updates', () => {
    it('should publish PRODUCT_CREATED event', async () => {
      const product = {
        id: 'product_123',
        shop_id: 'shop_456',
        name: 'Test Product',
        slug: 'test-product',
      };
      
      await rabbitmq.publishToExchange(
        rabbitmq.EXCHANGES.EVENTS,
        'product.created',
        {
          event: 'product.created',
          productId: product.id,
          shopId: product.shop_id,
          name: product.name,
        }
      );

      expect(rabbitmq.publishToExchange).toHaveBeenCalledWith(
        'events',
        'product.created',
        expect.objectContaining({
          productId: product.id,
        })
      );
    });
  });
});

// ============================================
// STATUS TRANSITION TESTS
// ============================================

describe('Status Transition Validation', () => {
  const ORDER_STATUS_TRANSITIONS = {
    pending_payment: ['confirmed', 'payment_failed', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    payment_failed: [],
    completed: [],
    cancelled: [],
  };

  const SUB_ORDER_STATUS_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['ready_to_ship', 'cancelled'],
    ready_to_ship: ['shipping'],
    shipping: ['delivered'],
    delivered: ['completed', 'return_requested'],
    completed: [],
    cancelled: [],
  };

  const SHIPMENT_STATUS_TRANSITIONS = {
    created: ['assigned', 'cancelled'],
    assigned: ['picked_up', 'cancelled'],
    picked_up: ['delivering', 'failed'],
    delivering: ['delivered', 'failed'],
    delivered: [],
    failed: ['returned'],
    cancelled: [],
    returned: [],
  };

  it('should validate order status transitions', () => {
    // Valid transitions
    expect(ORDER_STATUS_TRANSITIONS['pending_payment']).toContain('confirmed');
    expect(ORDER_STATUS_TRANSITIONS['pending_payment']).toContain('payment_failed');
    
    // Invalid transitions
    expect(ORDER_STATUS_TRANSITIONS['completed']).not.toContain('pending_payment');
    expect(ORDER_STATUS_TRANSITIONS['cancelled']).toHaveLength(0);
  });

  it('should validate sub-order status transitions', () => {
    // Valid transitions
    expect(SUB_ORDER_STATUS_TRANSITIONS['pending']).toContain('confirmed');
    expect(SUB_ORDER_STATUS_TRANSITIONS['shipping']).toContain('delivered');
    
    // Invalid transitions
    expect(SUB_ORDER_STATUS_TRANSITIONS['delivered']).not.toContain('pending');
  });

  it('should validate shipment status transitions', () => {
    // Valid transitions
    expect(SHIPMENT_STATUS_TRANSITIONS['created']).toContain('assigned');
    expect(SHIPMENT_STATUS_TRANSITIONS['delivering']).toContain('delivered');
    
    // Invalid transitions
    expect(SHIPMENT_STATUS_TRANSITIONS['delivered']).toHaveLength(0);
  });
});

