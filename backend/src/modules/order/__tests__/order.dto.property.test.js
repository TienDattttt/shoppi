/**
 * Order DTO Property Tests
 * Property-based tests for order serialization/deserialization
 * 
 * Uses fast-check for property-based testing
 */

const fc = require('fast-check');
const orderDTO = require('../order.dto');

// Generators
const uuidArb = fc.uuid();
const positiveFloatArb = fc.float({ min: 0, max: 100000000, noNaN: true });
const positiveIntArb = fc.integer({ min: 1, max: 1000 });

const orderStatusArb = fc.constantFrom(
  'pending_payment', 'payment_failed', 'confirmed', 
  'completed', 'cancelled', 'refunded'
);

const paymentMethodArb = fc.constantFrom('cod', 'vnpay', 'momo', 'wallet');
const paymentStatusArb = fc.constantFrom('pending', 'paid', 'refunded', 'failed');

const subOrderStatusArb = fc.constantFrom(
  'pending', 'confirmed', 'processing', 'ready_to_ship',
  'shipping', 'delivered', 'completed', 'cancelled',
  'return_requested', 'return_approved', 'returned', 'refunded'
);

const timestampArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map(d => d.toISOString());

// Order Item generator (database format)
const dbOrderItemArb = fc.record({
  id: uuidArb,
  sub_order_id: uuidArb,
  product_id: uuidArb,
  variant_id: uuidArb,
  product_name: fc.string({ minLength: 1, maxLength: 200 }),
  variant_name: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
  sku: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  unit_price: positiveFloatArb,
  quantity: positiveIntArb,
  total_price: positiveFloatArb,
  image_url: fc.option(fc.webUrl()),
  created_at: timestampArb,
});


// SubOrder generator (database format)
const dbSubOrderArb = fc.record({
  id: uuidArb,
  order_id: uuidArb,
  shop_id: uuidArb,
  subtotal: positiveFloatArb,
  shipping_fee: positiveFloatArb,
  discount: positiveFloatArb,
  total: positiveFloatArb,
  status: subOrderStatusArb,
  shop_voucher_id: fc.option(uuidArb),
  tracking_number: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
  shipper_id: fc.option(uuidArb),
  shipped_at: fc.option(timestampArb),
  delivered_at: fc.option(timestampArb),
  return_deadline: fc.option(timestampArb),
  partner_note: fc.option(fc.string({ maxLength: 500 })),
  created_at: timestampArb,
  updated_at: timestampArb,
  order_items: fc.array(dbOrderItemArb, { minLength: 0, maxLength: 5 }),
});

// Order generator (database format)
const dbOrderArb = fc.record({
  id: uuidArb,
  order_number: fc.string({ minLength: 10, maxLength: 20 }).map(s => `ORD${s.toUpperCase()}`),
  user_id: uuidArb,
  subtotal: positiveFloatArb,
  shipping_total: positiveFloatArb,
  discount_total: positiveFloatArb,
  grand_total: positiveFloatArb,
  status: orderStatusArb,
  payment_method: paymentMethodArb,
  payment_status: paymentStatusArb,
  paid_at: fc.option(timestampArb),
  shipping_address_id: fc.option(uuidArb),
  shipping_name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  shipping_phone: fc.option(fc.string({ minLength: 10, maxLength: 20 })),
  shipping_address: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
  platform_voucher_id: fc.option(uuidArb),
  customer_note: fc.option(fc.string({ maxLength: 500 })),
  cancel_reason: fc.option(fc.string({ maxLength: 500 })),
  created_at: timestampArb,
  updated_at: timestampArb,
  completed_at: fc.option(timestampArb),
  cancelled_at: fc.option(timestampArb),
  sub_orders: fc.array(dbSubOrderArb, { minLength: 0, maxLength: 3 }),
});

describe('Order DTO Property Tests', () => {
  /**
   * **Feature: order-management, Property 23: Order serialization round-trip**
   * *For any* valid Order object, serializing to JSON then deserializing
   * SHALL produce an equivalent Order object.
   * **Validates: Requirements 11.2**
   */
  describe('Property 23: Order serialization round-trip', () => {
    it('should produce equivalent order after serialize then deserialize', () => {
      fc.assert(
        fc.property(dbOrderArb, (dbOrder) => {
          // Serialize (DB -> API format)
          const serialized = orderDTO.serializeOrder(dbOrder);
          
          // Deserialize (API -> DB format)
          const deserialized = orderDTO.deserializeOrder(serialized);
          
          // Verify key fields are preserved
          expect(deserialized.id).toBe(dbOrder.id);
          expect(deserialized.order_number).toBe(dbOrder.order_number);
          expect(deserialized.user_id).toBe(dbOrder.user_id);
          expect(deserialized.status).toBe(dbOrder.status);
          expect(deserialized.payment_method).toBe(dbOrder.payment_method);
          expect(deserialized.payment_status).toBe(dbOrder.payment_status);
          
          // Verify numeric fields (allow small floating point differences)
          expect(Math.abs(deserialized.subtotal - parseFloat(dbOrder.subtotal))).toBeLessThan(0.01);
          expect(Math.abs(deserialized.shipping_total - parseFloat(dbOrder.shipping_total))).toBeLessThan(0.01);
          expect(Math.abs(deserialized.discount_total - parseFloat(dbOrder.discount_total))).toBeLessThan(0.01);
          expect(Math.abs(deserialized.grand_total - parseFloat(dbOrder.grand_total))).toBeLessThan(0.01);
          
          // Verify sub-orders count is preserved
          expect(deserialized.sub_orders.length).toBe(dbOrder.sub_orders.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should produce equivalent sub-order after serialize then deserialize', () => {
      fc.assert(
        fc.property(dbSubOrderArb, (dbSubOrder) => {
          const serialized = orderDTO.serializeSubOrder(dbSubOrder);
          const deserialized = orderDTO.deserializeSubOrder(serialized);
          
          expect(deserialized.id).toBe(dbSubOrder.id);
          expect(deserialized.order_id).toBe(dbSubOrder.order_id);
          expect(deserialized.shop_id).toBe(dbSubOrder.shop_id);
          expect(deserialized.status).toBe(dbSubOrder.status);
          
          expect(Math.abs(deserialized.subtotal - parseFloat(dbSubOrder.subtotal))).toBeLessThan(0.01);
          expect(Math.abs(deserialized.shipping_fee - parseFloat(dbSubOrder.shipping_fee))).toBeLessThan(0.01);
          expect(Math.abs(deserialized.discount - parseFloat(dbSubOrder.discount))).toBeLessThan(0.01);
          expect(Math.abs(deserialized.total - parseFloat(dbSubOrder.total))).toBeLessThan(0.01);
          
          expect(deserialized.order_items.length).toBe(dbSubOrder.order_items.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should produce equivalent order item after serialize then deserialize', () => {
      fc.assert(
        fc.property(dbOrderItemArb, (dbItem) => {
          const serialized = orderDTO.serializeOrderItem(dbItem);
          const deserialized = orderDTO.deserializeOrderItem(serialized);
          
          expect(deserialized.id).toBe(dbItem.id);
          expect(deserialized.sub_order_id).toBe(dbItem.sub_order_id);
          expect(deserialized.product_id).toBe(dbItem.product_id);
          expect(deserialized.variant_id).toBe(dbItem.variant_id);
          expect(deserialized.product_name).toBe(dbItem.product_name);
          expect(deserialized.quantity).toBe(dbItem.quantity);
          
          expect(Math.abs(deserialized.unit_price - parseFloat(dbItem.unit_price))).toBeLessThan(0.01);
          expect(Math.abs(deserialized.total_price - parseFloat(dbItem.total_price))).toBeLessThan(0.01);
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Additional serialization properties
   */
  describe('Serialization consistency', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(orderDTO.serializeOrder(null)).toBeNull();
      expect(orderDTO.serializeOrder(undefined)).toBeNull();
      expect(orderDTO.serializeSubOrder(null)).toBeNull();
      expect(orderDTO.serializeOrderItem(null)).toBeNull();
      expect(orderDTO.deserializeOrder(null)).toBeNull();
      expect(orderDTO.deserializeSubOrder(null)).toBeNull();
      expect(orderDTO.deserializeOrderItem(null)).toBeNull();
    });

    it('should convert snake_case to camelCase in serialization', () => {
      fc.assert(
        fc.property(dbOrderArb, (dbOrder) => {
          const serialized = orderDTO.serializeOrder(dbOrder);
          
          // Check camelCase keys exist
          expect(serialized).toHaveProperty('orderNumber');
          expect(serialized).toHaveProperty('userId');
          expect(serialized).toHaveProperty('shippingTotal');
          expect(serialized).toHaveProperty('discountTotal');
          expect(serialized).toHaveProperty('grandTotal');
          expect(serialized).toHaveProperty('paymentMethod');
          expect(serialized).toHaveProperty('paymentStatus');
          expect(serialized).toHaveProperty('createdAt');
          expect(serialized).toHaveProperty('updatedAt');
          
          // Check snake_case keys don't exist
          expect(serialized).not.toHaveProperty('order_number');
          expect(serialized).not.toHaveProperty('user_id');
          expect(serialized).not.toHaveProperty('shipping_total');
        }),
        { numRuns: 50 }
      );
    });

    it('should convert camelCase to snake_case in deserialization', () => {
      fc.assert(
        fc.property(dbOrderArb, (dbOrder) => {
          const serialized = orderDTO.serializeOrder(dbOrder);
          const deserialized = orderDTO.deserializeOrder(serialized);
          
          // Check snake_case keys exist
          expect(deserialized).toHaveProperty('order_number');
          expect(deserialized).toHaveProperty('user_id');
          expect(deserialized).toHaveProperty('shipping_total');
          expect(deserialized).toHaveProperty('discount_total');
          expect(deserialized).toHaveProperty('grand_total');
          expect(deserialized).toHaveProperty('payment_method');
          expect(deserialized).toHaveProperty('payment_status');
          expect(deserialized).toHaveProperty('created_at');
          expect(deserialized).toHaveProperty('updated_at');
        }),
        { numRuns: 50 }
      );
    });

    it('should preserve timestamps as ISO strings', () => {
      fc.assert(
        fc.property(dbOrderArb, (dbOrder) => {
          const serialized = orderDTO.serializeOrder(dbOrder);
          
          // createdAt should be ISO string
          if (serialized.createdAt) {
            expect(typeof serialized.createdAt).toBe('string');
            expect(() => new Date(serialized.createdAt)).not.toThrow();
          }
          
          // updatedAt should be ISO string
          if (serialized.updatedAt) {
            expect(typeof serialized.updatedAt).toBe('string');
            expect(() => new Date(serialized.updatedAt)).not.toThrow();
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should parse numeric strings to numbers', () => {
      fc.assert(
        fc.property(dbOrderArb, (dbOrder) => {
          const serialized = orderDTO.serializeOrder(dbOrder);
          
          expect(typeof serialized.subtotal).toBe('number');
          expect(typeof serialized.shippingTotal).toBe('number');
          expect(typeof serialized.discountTotal).toBe('number');
          expect(typeof serialized.grandTotal).toBe('number');
          
          // Should not be NaN
          expect(serialized.subtotal).not.toBeNaN();
          expect(serialized.shippingTotal).not.toBeNaN();
          expect(serialized.discountTotal).not.toBeNaN();
          expect(serialized.grandTotal).not.toBeNaN();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Cart serialization tests
   */
  describe('Cart serialization', () => {
    const dbCartItemArb = fc.record({
      id: uuidArb,
      cart_id: uuidArb,
      product_id: uuidArb,
      variant_id: uuidArb,
      quantity: positiveIntArb,
      is_selected: fc.boolean(),
      is_available: fc.boolean(),
      created_at: timestampArb,
      updated_at: timestampArb,
      products: fc.option(fc.record({
        id: uuidArb,
        name: fc.string({ minLength: 1, maxLength: 100 }),
        slug: fc.string({ minLength: 1, maxLength: 100 }),
        shop_id: uuidArb,
      })),
      product_variants: fc.option(fc.record({
        id: uuidArb,
        name: fc.string({ minLength: 1, maxLength: 100 }),
        sku: fc.string({ minLength: 1, maxLength: 50 }),
        price: positiveFloatArb,
        sale_price: fc.option(positiveFloatArb),
        stock_quantity: positiveIntArb,
        image_url: fc.option(fc.webUrl()),
      })),
    });

    it('should serialize cart item correctly', () => {
      fc.assert(
        fc.property(dbCartItemArb, (dbCartItem) => {
          const serialized = orderDTO.serializeCartItem(dbCartItem);
          
          expect(serialized.id).toBe(dbCartItem.id);
          expect(serialized.cartId).toBe(dbCartItem.cart_id);
          expect(serialized.productId).toBe(dbCartItem.product_id);
          expect(serialized.variantId).toBe(dbCartItem.variant_id);
          expect(serialized.quantity).toBe(dbCartItem.quantity);
          expect(serialized.isSelected).toBe(dbCartItem.is_selected);
          expect(serialized.isAvailable).toBe(dbCartItem.is_available);
        }),
        { numRuns: 100 }
      );
    });
  });
});
