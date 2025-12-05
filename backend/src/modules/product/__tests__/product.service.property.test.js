/**
 * Property-Based Tests for Product Service
 * Tests product operations correctness
 */

const fc = require('fast-check');

// Mock supabase client before importing modules that use it
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
      select: jest.fn(() => ({ eq: jest.fn(() => ({ single: jest.fn() })) })),
    })),
  },
}));

// Mock repositories
jest.mock('../product.repository');
jest.mock('../category.repository');

const productService = require('../product.service');
const productRepository = require('../product.repository');
const categoryRepository = require('../category.repository');

// Arbitrary generators
const uuidArb = fc.uuid();

const productNameArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

const descriptionArb = fc.string({ minLength: 0, maxLength: 10000 });

const priceArb = fc.integer({ min: 1, max: 100000000 })
  .map(p => p / 100);

const currencyArb = fc.constantFrom('VND', 'USD', 'EUR');

const statusArb = fc.constantFrom('draft', 'pending', 'active', 'rejected', 'revision_required', 'inactive');

const productArb = fc.record({
  id: uuidArb,
  shop_id: uuidArb,
  category_id: fc.option(uuidArb, { nil: null }),
  name: productNameArb,
  slug: fc.string({ minLength: 1, maxLength: 250 }),
  description: fc.option(descriptionArb, { nil: null }),
  short_description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  base_price: priceArb,
  compare_at_price: fc.option(priceArb, { nil: null }),
  currency: currencyArb,
  status: statusArb,
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
});

const categoryArb = fc.record({
  id: uuidArb,
  name: fc.string({ minLength: 1, maxLength: 100 }),
  slug: fc.string({ minLength: 1, maxLength: 120 }),
  level: fc.integer({ min: 1, max: 3 }),
  is_active: fc.constant(true),
});

describe('Product Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  /**
   * **Feature: product-management, Property 4: Product creation with pending status**
   * **Validates: Requirements 2.1**
   * 
   * For any valid product submission by a Partner, the created product SHALL have status 'pending'.
   */
  describe('Property 4: Product creation with pending status', () => {
    it('should create product with pending status for any valid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          productNameArb,
          priceArb,
          fc.option(descriptionArb, { nil: null }),
          async (shopId, name, basePrice, description) => {
            // Mock repository
            productRepository.slugExists.mockResolvedValue(false);
            productRepository.createProduct.mockImplementation(async (data) => ({
              id: 'new-product-id',
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const product = await productService.createProduct(shopId, {
              name,
              base_price: basePrice,
              description,
            });

            // Product MUST have pending status
            expect(product.status).toBe('pending');
            expect(product.shop_id).toBe(shopId);
            expect(product.name).toBe(name.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always set pending status regardless of any other input', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          productNameArb,
          priceArb,
          categoryArb,
          async (shopId, name, basePrice, category) => {
            productRepository.slugExists.mockResolvedValue(false);
            categoryRepository.findCategoryById.mockResolvedValue(category);
            productRepository.createProduct.mockImplementation(async (data) => ({
              id: 'new-product-id',
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const product = await productService.createProduct(shopId, {
              name,
              base_price: basePrice,
              category_id: category.id,
              description: 'Test description',
            });

            // Status MUST be pending - no way to bypass this
            expect(product.status).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject product with invalid name', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          priceArb,
          async (shopId, basePrice) => {
            // Empty name should be rejected
            await expect(
              productService.createProduct(shopId, { name: '', base_price: basePrice })
            ).rejects.toThrow('Product name is required');

            await expect(
              productService.createProduct(shopId, { name: '   ', base_price: basePrice })
            ).rejects.toThrow('Product name is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject product with name exceeding 200 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          fc.string({ minLength: 201, maxLength: 500 }),
          priceArb,
          async (shopId, longName, basePrice) => {
            await expect(
              productService.createProduct(shopId, { name: longName, base_price: basePrice })
            ).rejects.toThrow('Product name must not exceed 200 characters');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject product with invalid price', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          productNameArb,
          fc.oneof(
            fc.constant(0),
            fc.constant(-1),
            fc.integer({ min: -100000, max: 0 }).map(n => n / 100)
          ),
          async (shopId, name, invalidPrice) => {
            await expect(
              productService.createProduct(shopId, { name, base_price: invalidPrice })
            ).rejects.toThrow('Base price must be a positive number');
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: product-management, Property 7: Variant price override**
   * **Validates: Requirements 3.4**
   * 
   * For any variant with a specific price set, the variant price SHALL be used
   * instead of the base product price when calculating order totals.
   */
  describe('Property 7: Variant price override', () => {
    it('should use variant price when set', () => {
      fc.assert(
        fc.property(
          priceArb,
          priceArb,
          (basePrice, variantPrice) => {
            const product = { base_price: basePrice };
            const variant = { price: variantPrice };

            const effectivePrice = productService.getVariantPrice(variant, product);

            // When variant has price, use variant price
            expect(effectivePrice).toBe(variantPrice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use base product price when variant price is null', () => {
      fc.assert(
        fc.property(priceArb, (basePrice) => {
          const product = { base_price: basePrice };
          const variant = { price: null };

          const effectivePrice = productService.getVariantPrice(variant, product);

          // When variant price is null, use base price
          expect(effectivePrice).toBe(basePrice);
        }),
        { numRuns: 100 }
      );
    });

    it('should use base product price when variant price is undefined', () => {
      fc.assert(
        fc.property(priceArb, (basePrice) => {
          const product = { base_price: basePrice };
          const variant = { price: undefined };

          const effectivePrice = productService.getVariantPrice(variant, product);

          // When variant price is undefined, use base price
          expect(effectivePrice).toBe(basePrice);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly determine price for any variant/product combination', () => {
      fc.assert(
        fc.property(
          priceArb,
          fc.option(priceArb, { nil: null }),
          (basePrice, variantPrice) => {
            const product = { base_price: basePrice };
            const variant = { price: variantPrice };

            const effectivePrice = productService.getVariantPrice(variant, product);

            // Price should be variant price if set, otherwise base price
            if (variantPrice !== null && variantPrice !== undefined) {
              expect(effectivePrice).toBe(variantPrice);
            } else {
              expect(effectivePrice).toBe(basePrice);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero variant price correctly', () => {
      fc.assert(
        fc.property(priceArb, (basePrice) => {
          const product = { base_price: basePrice };
          const variant = { price: 0 };

          const effectivePrice = productService.getVariantPrice(variant, product);

          // Zero is a valid price (free item), should use it
          expect(effectivePrice).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should create variant with price override', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArb,
          priceArb,
          async (product, variantPrice) => {
            productRepository.findProductById.mockResolvedValue(product);
            productRepository.skuExists.mockResolvedValue(false);
            productRepository.createVariant.mockImplementation(async (data) => ({
              id: 'new-variant-id',
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const variant = await productService.addVariant(
              product.id,
              product.shop_id,
              { name: 'Test Variant', price: variantPrice }
            );

            // Variant should have the specified price
            expect(variant.price).toBe(variantPrice);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
