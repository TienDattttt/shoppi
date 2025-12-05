/**
 * Property-Based Tests for Inventory Service
 * Tests stock management correctness
 */

const fc = require('fast-check');
const inventoryService = require('../services/inventory.service');
const productRepository = require('../product.repository');

// Mock the repository
jest.mock('../product.repository');

// Arbitrary generators
const variantArb = fc.record({
  id: fc.uuid(),
  product_id: fc.uuid(),
  sku: fc.string({ minLength: 5, maxLength: 20 }),
  quantity: fc.integer({ min: 0, max: 10000 }),
  reserved_quantity: fc.integer({ min: 0, max: 100 }),
  low_stock_threshold: fc.integer({ min: 1, max: 100 }),
  is_active: fc.boolean(),
}).filter(v => v.reserved_quantity <= v.quantity);

const positiveIntArb = fc.integer({ min: 1, max: 1000 });
const nonNegativeIntArb = fc.integer({ min: 0, max: 1000 });

describe('Inventory Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  /**
   * **Feature: product-management, Property 8: Stock status on zero quantity**
   * **Validates: Requirements 3.3**
   * 
   * For any variant, when quantity reaches zero, the variant status SHALL be marked as 'out_of_stock'.
   */
  describe('Property 8: Stock status on zero quantity', () => {
    it('should mark variant as inactive when stock reaches zero', async () => {
      await fc.assert(
        fc.asyncProperty(variantArb, async (variant) => {
          // Setup: variant with some stock
          const variantWithStock = { ...variant, quantity: 10, reserved_quantity: 0 };
          
          productRepository.findVariantById.mockResolvedValue(variantWithStock);
          productRepository.updateVariant.mockImplementation(async (id, data) => ({
            ...variantWithStock,
            ...data,
          }));
          
          // Update stock to zero
          const result = await inventoryService.updateStock(variant.id, 0, 'test');
          
          // Verify is_active was set to false
          expect(productRepository.updateVariant).toHaveBeenCalledWith(
            variant.id,
            expect.objectContaining({
              quantity: 0,
              is_active: false,
            })
          );
          
          expect(result.isOutOfStock).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should return out_of_stock status for zero quantity variants', () => {
      fc.assert(
        fc.property(variantArb, (variant) => {
          const zeroStockVariant = { ...variant, quantity: 0 };
          const status = inventoryService.getStockStatus(zeroStockVariant);
          
          expect(status).toBe('out_of_stock');
        }),
        { numRuns: 100 }
      );
    });

    it('should return low_stock status when quantity is at or below threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (threshold, quantity) => {
            const variant = {
              quantity: Math.min(quantity, threshold),
              low_stock_threshold: threshold,
            };
            
            const status = inventoryService.getStockStatus(variant);
            
            if (variant.quantity === 0) {
              expect(status).toBe('out_of_stock');
            } else {
              expect(status).toBe('low_stock');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return in_stock status when quantity is above threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 101, max: 1000 }),
          (threshold, quantity) => {
            const variant = {
              quantity,
              low_stock_threshold: threshold,
            };
            
            const status = inventoryService.getStockStatus(variant);
            expect(status).toBe('in_stock');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit outOfStock event when stock reaches zero', async () => {
      await fc.assert(
        fc.asyncProperty(variantArb, async (variant) => {
          const variantWithStock = { ...variant, quantity: 5, reserved_quantity: 0 };
          
          productRepository.findVariantById.mockResolvedValue(variantWithStock);
          productRepository.updateVariant.mockImplementation(async (id, data) => ({
            ...variantWithStock,
            ...data,
          }));
          
          // Listen for event
          let eventEmitted = false;
          const handler = () => { eventEmitted = true; };
          inventoryService.onInventoryEvent('outOfStock', handler);
          
          await inventoryService.updateStock(variant.id, 0, 'test');
          
          // Clean up listener
          inventoryService.inventoryEvents.removeListener('outOfStock', handler);
          
          expect(eventEmitted).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });


  /**
   * **Feature: product-management, Property 9: Negative stock rejection**
   * **Validates: Requirements 7.5**
   * 
   * For any inventory update, if the resulting quantity would be negative, the update SHALL be rejected.
   */
  describe('Property 9: Negative stock rejection', () => {
    it('should reject updateStock with negative quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          variantArb,
          fc.integer({ min: -1000, max: -1 }),
          async (variant, negativeQuantity) => {
            productRepository.findVariantById.mockResolvedValue(variant);
            
            await expect(
              inventoryService.updateStock(variant.id, negativeQuantity, 'test')
            ).rejects.toThrow('Stock quantity cannot be negative');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject adjustStock that would result in negative quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 101, max: 1000 }),
          async (currentQuantity, adjustment) => {
            const variant = {
              id: 'test-id',
              quantity: currentQuantity,
              reserved_quantity: 0,
              low_stock_threshold: 10,
            };
            
            productRepository.findVariantById.mockResolvedValue(variant);
            
            // Negative adjustment larger than current stock
            await expect(
              inventoryService.adjustStock(variant.id, -adjustment, 'test')
            ).rejects.toThrow('Stock adjustment would result in negative quantity');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject confirmStockDeduction that would result in negative quantity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 101, max: 1000 }),
          async (currentQuantity, deduction) => {
            const variant = {
              id: 'test-id',
              quantity: currentQuantity,
              reserved_quantity: 0,
              low_stock_threshold: 10,
            };
            
            productRepository.findVariantById.mockResolvedValue(variant);
            
            await expect(
              inventoryService.confirmStockDeduction(variant.id, deduction)
            ).rejects.toThrow('Stock deduction would result in negative quantity');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject updateStock when new quantity is less than reserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 5, max: 50 }),
          async (quantity, reserved) => {
            const variant = {
              id: 'test-id',
              quantity,
              reserved_quantity: reserved,
              low_stock_threshold: 10,
            };
            
            productRepository.findVariantById.mockResolvedValue(variant);
            
            // Try to set quantity below reserved
            const newQuantity = reserved - 1;
            
            await expect(
              inventoryService.updateStock(variant.id, newQuantity, 'test')
            ).rejects.toThrow(/Cannot set quantity/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow valid stock updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          variantArb,
          nonNegativeIntArb,
          async (variant, newQuantity) => {
            // Ensure new quantity is valid (>= reserved)
            const validQuantity = Math.max(newQuantity, variant.reserved_quantity);
            
            productRepository.findVariantById.mockResolvedValue(variant);
            productRepository.updateVariant.mockImplementation(async (id, data) => ({
              ...variant,
              ...data,
            }));
            
            const result = await inventoryService.updateStock(variant.id, validQuantity, 'test');
            
            expect(result.newQuantity).toBe(validQuantity);
            expect(result.newQuantity).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow valid stock adjustments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 1000 }),
          fc.integer({ min: -49, max: 100 }),
          async (currentQuantity, adjustment) => {
            const variant = {
              id: 'test-id',
              quantity: currentQuantity,
              reserved_quantity: 0,
              low_stock_threshold: 10,
            };
            
            // Only test if result would be non-negative
            if (currentQuantity + adjustment >= 0) {
              productRepository.findVariantById.mockResolvedValue(variant);
              productRepository.updateVariant.mockImplementation(async (id, data) => ({
                ...variant,
                ...data,
              }));
              
              const result = await inventoryService.adjustStock(variant.id, adjustment, 'test');
              
              expect(result.newQuantity).toBe(currentQuantity + adjustment);
              expect(result.newQuantity).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional inventory tests
   */
  describe('Reserve and Release Stock', () => {
    it('should reject reservation when insufficient stock available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 51, max: 200 }),
          async (quantity, reserved, requestedReserve) => {
            // Ensure reserved <= quantity
            const actualReserved = Math.min(reserved, quantity);
            const available = quantity - actualReserved;
            
            // Only test when requested > available
            if (requestedReserve > available) {
              const variant = {
                id: 'test-id',
                quantity,
                reserved_quantity: actualReserved,
                low_stock_threshold: 10,
              };
              
              productRepository.findVariantById.mockResolvedValue(variant);
              
              await expect(
                inventoryService.reserveStock(variant.id, requestedReserve)
              ).rejects.toThrow(/Insufficient stock/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should successfully reserve when sufficient stock available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 0, max: 50 }),
          fc.integer({ min: 1, max: 49 }),
          async (quantity, reserved, requestedReserve) => {
            const variant = {
              id: 'test-id',
              quantity,
              reserved_quantity: reserved,
              low_stock_threshold: 10,
            };
            
            productRepository.findVariantById.mockResolvedValue(variant);
            productRepository.updateVariant.mockImplementation(async (id, data) => ({
              ...variant,
              ...data,
            }));
            
            const result = await inventoryService.reserveStock(variant.id, requestedReserve);
            
            expect(result.reservedQuantity).toBe(reserved + requestedReserve);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
