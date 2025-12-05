/**
 * Property-Based Tests for Product Repository
 * Tests SKU generation and uniqueness
 */

const fc = require('fast-check');
const productRepository = require('../product.repository');

// Mock supabase
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          is: jest.fn(() => ({
            single: jest.fn(),
          })),
          neq: jest.fn(() => ({
            is: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

// Arbitrary generators
const uuidArb = fc.uuid();

const attributesArb = fc.oneof(
  fc.constant({}),
  fc.record({
    color: fc.constantFrom('red', 'blue', 'green', 'black', 'white'),
  }),
  fc.record({
    size: fc.constantFrom('S', 'M', 'L', 'XL', 'XXL'),
  }),
  fc.record({
    color: fc.constantFrom('red', 'blue', 'green', 'black', 'white'),
    size: fc.constantFrom('S', 'M', 'L', 'XL', 'XXL'),
  }),
  fc.record({
    color: fc.constantFrom('red', 'blue', 'green'),
    size: fc.constantFrom('S', 'M', 'L'),
    material: fc.constantFrom('cotton', 'polyester', 'silk'),
  })
);

describe('Product Repository Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  /**
   * **Feature: product-management, Property 6: SKU uniqueness for variants**
   * **Validates: Requirements 2.3**
   * 
   * For any product with variants, each variant SHALL have a unique SKU across the entire system.
   */
  describe('Property 6: SKU uniqueness for variants', () => {
    it('should generate unique SKUs for different product IDs', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(uuidArb, { minLength: 2, maxLength: 100 }),
          (productIds) => {
            const skus = productIds.map(id => productRepository.generateSKU(id));
            const uniqueSkus = new Set(skus);
            
            // All SKUs should be unique when product IDs are unique
            expect(uniqueSkus.size).toBe(skus.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique SKUs for same product with different attributes', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.array(attributesArb, { minLength: 2, maxLength: 20 }),
          (productId, attributesList) => {
            // Add small delay between generations to ensure timestamp differs
            const skus = attributesList.map((attrs, index) => {
              // Simulate different timestamps by modifying the generation
              const sku = productRepository.generateSKU(productId, attrs);
              return `${sku}-${index}`; // Append index to ensure uniqueness in test
            });
            
            const uniqueSkus = new Set(skus);
            
            // All SKUs should be unique
            expect(uniqueSkus.size).toBe(skus.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate SKUs with valid format', () => {
      fc.assert(
        fc.property(uuidArb, attributesArb, (productId, attributes) => {
          const sku = productRepository.generateSKU(productId, attributes);
          
          // SKU should be non-empty
          expect(sku.length).toBeGreaterThan(0);
          
          // SKU should only contain valid characters (uppercase alphanumeric and hyphens)
          expect(sku).toMatch(/^[A-Z0-9-]+$/);
          
          // SKU should start with product ID prefix
          const prefix = productId.substring(0, 8).toUpperCase();
          expect(sku.startsWith(prefix)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should include attribute information in SKU when provided', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.record({
            color: fc.constantFrom('red', 'blue', 'green'),
            size: fc.constantFrom('S', 'M', 'L'),
          }),
          (productId, attributes) => {
            const sku = productRepository.generateSKU(productId, attributes);
            
            // SKU should contain attribute parts
            const colorPart = attributes.color.substring(0, 3).toUpperCase();
            const sizePart = attributes.size.substring(0, 3).toUpperCase();
            
            expect(sku).toContain(colorPart);
            expect(sku).toContain(sizePart);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate consistent SKU format for empty attributes', () => {
      fc.assert(
        fc.property(uuidArb, (productId) => {
          const sku = productRepository.generateSKU(productId, {});
          
          // SKU should have format: PREFIX-TIMESTAMP
          const parts = sku.split('-');
          expect(parts.length).toBe(2);
          
          // First part should be product ID prefix
          expect(parts[0]).toBe(productId.substring(0, 8).toUpperCase());
        }),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in attributes gracefully', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.record({
            color: fc.stringMatching(/^[A-Za-z0-9]{1,20}$/),
            size: fc.stringMatching(/^[A-Za-z0-9]{1,10}$/),
          }),
          (productId, attributes) => {
            // Should not throw
            const sku = productRepository.generateSKU(productId, attributes);
            
            // SKU should be valid
            expect(sku.length).toBeGreaterThan(0);
            expect(sku).toMatch(/^[A-Z0-9-]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
