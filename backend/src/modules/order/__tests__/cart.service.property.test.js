/**
 * Cart Service Property Tests
 * Property-based tests for cart operations
 * 
 * Uses fast-check for property-based testing
 */

const fc = require('fast-check');

// Mock dependencies
const mockCartRepository = {
  findCartByUserId: jest.fn(),
  createCart: jest.fn(),
  findCartItemsWithProducts: jest.fn(),
  findCartItemById: jest.fn(),
  findCartItem: jest.fn(),
  createCartItem: jest.fn(),
  updateCartItem: jest.fn(),
  deleteCartItem: jest.fn(),
  clearCart: jest.fn(),
  getVariantWithStock: jest.fn(),
};

const mockOrderDTO = {
  serializeCart: jest.fn(cart => cart),
  serializeCartItem: jest.fn(item => ({
    id: item.id,
    cartId: item.cart_id,
    productId: item.product_id,
    variantId: item.variant_id,
    quantity: item.quantity,
    product: item.products,
    variant: item.product_variants,
  })),
};

// Mock modules before requiring cart service
jest.mock('../cart.repository', () => mockCartRepository);
jest.mock('../order.dto', () => mockOrderDTO);
jest.mock('../../../shared/utils/error.util', () => ({
  AppError: class AppError extends Error {
    constructor(code, message, statusCode) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

const cartService = require('../services/cart.service');
const { AppError } = require('../../../shared/utils/error.util');

// Generators
const uuidArb = fc.uuid();
const positiveIntArb = fc.integer({ min: 1, max: 1000 });
const stockQuantityArb = fc.integer({ min: 0, max: 10000 });


const cartItemArb = fc.record({
  id: uuidArb,
  cart_id: uuidArb,
  product_id: uuidArb,
  variant_id: uuidArb,
  quantity: positiveIntArb,
  is_selected: fc.boolean(),
  is_available: fc.boolean(),
  products: fc.record({
    id: uuidArb,
    name: fc.string({ minLength: 1, maxLength: 100 }),
    slug: fc.string({ minLength: 1, maxLength: 100 }),
    shop_id: uuidArb,
    thumbnail_url: fc.option(fc.webUrl()),
  }),
  product_variants: fc.record({
    id: uuidArb,
    name: fc.string({ minLength: 1, maxLength: 100 }),
    sku: fc.string({ minLength: 1, maxLength: 50 }),
    price: fc.float({ min: 1000, max: 100000000 }),
    sale_price: fc.option(fc.float({ min: 1000, max: 100000000 })),
    stock_quantity: stockQuantityArb,
    image_url: fc.option(fc.webUrl()),
  }),
});

const variantArb = fc.record({
  id: uuidArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  sku: fc.string({ minLength: 1, maxLength: 50 }),
  price: fc.float({ min: 1000, max: 100000000 }),
  sale_price: fc.option(fc.float({ min: 1000, max: 100000000 })),
  stock_quantity: stockQuantityArb,
});

describe('Cart Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: order-management, Property 1: Cart item quantity validation**
   * *For any* cart item update, if the requested quantity exceeds available stock,
   * the update SHALL be rejected.
   * **Validates: Requirements 1.2**
   */
  describe('Property 1: Cart item quantity validation', () => {
    it('should reject update when requested quantity exceeds stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          stockQuantityArb,
          fc.integer({ min: 1, max: 10000 }),
          async (userId, itemId, stockQuantity, requestedQuantity) => {
            // Only test when requested > stock
            fc.pre(requestedQuantity > stockQuantity);
            
            const cart = { id: 'cart-1', user_id: userId };
            const cartItem = {
              id: itemId,
              cart_id: cart.id,
              variant_id: 'variant-1',
              quantity: 1,
            };
            const variant = {
              id: 'variant-1',
              stock_quantity: stockQuantity,
            };
            
            mockCartRepository.findCartByUserId.mockResolvedValue(cart);
            mockCartRepository.findCartItemById.mockResolvedValue(cartItem);
            mockCartRepository.getVariantWithStock.mockResolvedValue(variant);
            
            await expect(
              cartService.updateItem(userId, itemId, requestedQuantity)
            ).rejects.toThrow();
            
            // Verify update was NOT called
            expect(mockCartRepository.updateCartItem).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept update when requested quantity is within stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          stockQuantityArb.filter(s => s > 0),
          async (userId, itemId, stockQuantity) => {
            // Request quantity within stock
            const requestedQuantity = Math.floor(Math.random() * stockQuantity) + 1;
            fc.pre(requestedQuantity <= stockQuantity);
            
            const cart = { id: 'cart-1', user_id: userId };
            const cartItem = {
              id: itemId,
              cart_id: cart.id,
              variant_id: 'variant-1',
              quantity: 1,
            };
            const variant = {
              id: 'variant-1',
              stock_quantity: stockQuantity,
            };
            const updatedItem = {
              ...cartItem,
              quantity: requestedQuantity,
              products: { shop_id: 'shop-1' },
              product_variants: variant,
            };
            
            mockCartRepository.findCartByUserId.mockResolvedValue(cart);
            mockCartRepository.findCartItemById.mockResolvedValue(cartItem);
            mockCartRepository.getVariantWithStock.mockResolvedValue(variant);
            mockCartRepository.updateCartItem.mockResolvedValue(updatedItem);
            
            const result = await cartService.updateItem(userId, itemId, requestedQuantity);
            
            expect(mockCartRepository.updateCartItem).toHaveBeenCalledWith(
              itemId,
              { quantity: requestedQuantity }
            );
            expect(result.quantity).toBe(requestedQuantity);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: order-management, Property 2: Cart grouping by shop**
   * *For any* cart with items from multiple shops, the cart view SHALL group
   * items by shop_id correctly.
   * **Validates: Requirements 1.4**
   */
  describe('Property 2: Cart grouping by shop', () => {
    it('should group items by shop_id correctly', () => {
      fc.assert(
        fc.property(
          fc.array(cartItemArb, { minLength: 1, maxLength: 20 }),
          (cartItems) => {
            // Group items using the service function
            const grouped = cartService.groupItemsByShop(cartItems);
            
            // Verify: each item appears in exactly one group
            const allGroupedItems = grouped.flatMap(g => g.items);
            expect(allGroupedItems.length).toBe(cartItems.length);
            
            // Verify: items in each group have the same shop_id
            for (const group of grouped) {
              const shopId = group.shopId;
              for (const item of group.items) {
                const itemShopId = item.product?.shop_id || 'unknown';
                expect(itemShopId).toBe(shopId);
              }
            }
            
            // Verify: number of groups equals number of unique shop_ids
            const uniqueShopIds = new Set(
              cartItems.map(item => item.products?.shop_id || 'unknown')
            );
            expect(grouped.length).toBe(uniqueShopIds.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate correct subtotal for each shop group', () => {
      fc.assert(
        fc.property(
          fc.array(cartItemArb, { minLength: 1, maxLength: 10 }),
          (cartItems) => {
            const grouped = cartService.groupItemsByShop(cartItems);
            
            for (const group of grouped) {
              // Calculate expected subtotal
              const expectedSubtotal = cartItems
                .filter(item => (item.products?.shop_id || 'unknown') === group.shopId)
                .reduce((sum, item) => {
                  const price = item.product_variants?.sale_price || 
                               item.product_variants?.price || 0;
                  return sum + (parseFloat(price) * item.quantity);
                }, 0);
              
              // Allow small floating point differences
              expect(Math.abs(group.subtotal - expectedSubtotal)).toBeLessThan(0.01);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty cart items array', () => {
      const grouped = cartService.groupItemsByShop([]);
      expect(grouped).toEqual([]);
    });

    it('should handle items with missing shop_id as "unknown"', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: uuidArb,
              cart_id: uuidArb,
              product_id: uuidArb,
              variant_id: uuidArb,
              quantity: positiveIntArb,
              products: fc.constant(null), // No product info
              product_variants: fc.record({
                price: fc.float({ min: 1000, max: 100000 }),
                sale_price: fc.constant(null),
              }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (cartItems) => {
            const grouped = cartService.groupItemsByShop(cartItems);
            
            // All items should be in "unknown" group
            expect(grouped.length).toBe(1);
            expect(grouped[0].shopId).toBe('unknown');
            expect(grouped[0].items.length).toBe(cartItems.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional property tests for cart operations
   */
  describe('Cart Add Item Properties', () => {
    it('should reject adding item when quantity exceeds stock', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          uuidArb,
          stockQuantityArb,
          fc.integer({ min: 1, max: 10000 }),
          async (userId, productId, variantId, stockQuantity, requestedQuantity) => {
            fc.pre(requestedQuantity > stockQuantity);
            
            const cart = { id: 'cart-1', user_id: userId };
            const variant = {
              id: variantId,
              stock_quantity: stockQuantity,
            };
            
            mockCartRepository.findCartByUserId.mockResolvedValue(cart);
            mockCartRepository.getVariantWithStock.mockResolvedValue(variant);
            mockCartRepository.findCartItem.mockResolvedValue(null);
            
            await expect(
              cartService.addItem(userId, { productId, variantId, quantity: requestedQuantity })
            ).rejects.toThrow();
            
            expect(mockCartRepository.createCartItem).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
