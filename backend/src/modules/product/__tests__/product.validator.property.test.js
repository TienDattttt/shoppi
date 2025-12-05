/**
 * Property-Based Tests for Product Validators
 * Tests validation correctness
 */

const fc = require('fast-check');
const {
  createProductSchema,
  createVariantSchema,
  createCategorySchema,
  searchProductSchema,
  validateProductName,
  validateProductDescription,
  validateSKU,
  validatePrice,
  validateImageFile,
} = require('../product.validator');

// Arbitrary generators
const validProductNameArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

const invalidProductNameArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.string({ minLength: 201, maxLength: 300 })
);

const validDescriptionArb = fc.string({ minLength: 0, maxLength: 10000 });
const invalidDescriptionArb = fc.string({ minLength: 10001, maxLength: 15000 });

const validSKUArb = fc.stringMatching(/^[A-Za-z0-9-_]{1,100}$/);
const invalidSKUArb = fc.oneof(
  fc.constant(''),
  fc.stringMatching(/^[A-Za-z0-9-_]{101,150}$/),
  fc.stringMatching(/^[A-Za-z0-9-_]*[@#$%^&*()]+[A-Za-z0-9-_]*$/)
);

const validPriceArb = fc.integer({ min: 0, max: 999999999 }).map(n => n / 100);
const invalidPriceArb = fc.oneof(
  fc.integer({ min: -100000, max: -1 }).map(n => n / 100),
  fc.constant(NaN)
);

describe('Product Validator Property Tests', () => {

  /**
   * **Feature: product-management, Property 5: Product field validation**
   * **Validates: Requirements 2.4, 2.5**
   * 
   * For any product submission, if name exceeds 200 characters OR description
   * exceeds 10000 characters OR required fields are missing, the submission
   * SHALL be rejected.
   */
  describe('Property 5: Product field validation', () => {
    describe('Product name validation', () => {
      it('should accept valid product names (1-200 characters)', () => {
        fc.assert(
          fc.property(validProductNameArb, (name) => {
            const result = validateProductName(name);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }),
          { numRuns: 100 }
        );
      });

      it('should reject empty or whitespace-only names', () => {
        fc.assert(
          fc.property(
            fc.oneof(fc.constant(''), fc.constant('   '), fc.constant('\t\n')),
            (name) => {
              const result = validateProductName(name);
              expect(result.isValid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject names exceeding 200 characters', () => {
        fc.assert(
          fc.property(
            fc.string({ minLength: 201, maxLength: 500 }),
            (name) => {
              const result = validateProductName(name);
              expect(result.isValid).toBe(false);
              expect(result.errors).toContain('Product name must not exceed 200 characters');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Product description validation', () => {
      it('should accept valid descriptions (0-10000 characters)', () => {
        fc.assert(
          fc.property(validDescriptionArb, (description) => {
            const result = validateProductDescription(description);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }),
          { numRuns: 100 }
        );
      });

      it('should reject descriptions exceeding 10000 characters', () => {
        fc.assert(
          fc.property(invalidDescriptionArb, (description) => {
            const result = validateProductDescription(description);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Product description must not exceed 10000 characters');
          }),
          { numRuns: 100 }
        );
      });

      it('should accept empty description', () => {
        const result = validateProductDescription('');
        expect(result.isValid).toBe(true);
      });

      it('should accept null/undefined description', () => {
        expect(validateProductDescription(null).isValid).toBe(true);
        expect(validateProductDescription(undefined).isValid).toBe(true);
      });
    });

    describe('SKU validation', () => {
      it('should accept valid SKUs (alphanumeric with hyphens and underscores)', () => {
        fc.assert(
          fc.property(validSKUArb, (sku) => {
            const result = validateSKU(sku);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }),
          { numRuns: 100 }
        );
      });

      it('should reject empty SKUs', () => {
        fc.assert(
          fc.property(
            fc.oneof(fc.constant(''), fc.constant('   ')),
            (sku) => {
              const result = validateSKU(sku);
              expect(result.isValid).toBe(false);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject SKUs with special characters', () => {
        fc.assert(
          fc.property(
            fc.stringMatching(/^[A-Za-z0-9]*[@#$%^&*()!]+[A-Za-z0-9]*$/),
            (sku) => {
              const result = validateSKU(sku);
              expect(result.isValid).toBe(false);
              expect(result.errors).toContain('SKU can only contain letters, numbers, hyphens, and underscores');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Price validation', () => {
      it('should accept valid positive prices', () => {
        fc.assert(
          fc.property(validPriceArb, (price) => {
            const result = validatePrice(price);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }),
          { numRuns: 100 }
        );
      });

      it('should reject negative prices', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -1000000, max: -1 }).map(n => n / 100),
            (price) => {
              const result = validatePrice(price);
              expect(result.isValid).toBe(false);
              expect(result.errors).toContain('Price must be a positive number');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject null/undefined prices', () => {
        expect(validatePrice(null).isValid).toBe(false);
        expect(validatePrice(undefined).isValid).toBe(false);
      });

      it('should accept zero price', () => {
        const result = validatePrice(0);
        expect(result.isValid).toBe(true);
      });
    });

    describe('Image file validation', () => {
      it('should accept valid image files', () => {
        fc.assert(
          fc.property(
            fc.record({
              mimetype: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
              size: fc.integer({ min: 1, max: 5 * 1024 * 1024 }),
            }),
            (file) => {
              const result = validateImageFile(file);
              expect(result.isValid).toBe(true);
              expect(result.errors).toHaveLength(0);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject invalid mime types', () => {
        fc.assert(
          fc.property(
            fc.record({
              mimetype: fc.constantFrom('image/gif', 'image/bmp', 'application/pdf', 'text/plain'),
              size: fc.integer({ min: 1, max: 5 * 1024 * 1024 }),
            }),
            (file) => {
              const result = validateImageFile(file);
              expect(result.isValid).toBe(false);
              expect(result.errors).toContain('Image must be JPEG, PNG, or WebP format');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject files exceeding 5MB', () => {
        fc.assert(
          fc.property(
            fc.record({
              mimetype: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
              size: fc.integer({ min: 5 * 1024 * 1024 + 1, max: 50 * 1024 * 1024 }),
            }),
            (file) => {
              const result = validateImageFile(file);
              expect(result.isValid).toBe(false);
              expect(result.errors).toContain('Image size must not exceed 5MB');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Joi schema validation', () => {
      it('should validate complete product creation data', () => {
        fc.assert(
          fc.property(
            fc.record({
              name: validProductNameArb,
              basePrice: fc.integer({ min: 0, max: 999999999 }).map(n => n / 100),
            }),
            (data) => {
              const { error } = createProductSchema.validate(data);
              expect(error).toBeUndefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject product creation without required fields', () => {
        fc.assert(
          fc.property(
            fc.record({
              description: fc.string({ maxLength: 500 }),
            }),
            (data) => {
              const { error } = createProductSchema.validate(data);
              expect(error).toBeDefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should validate search query parameters', () => {
        fc.assert(
          fc.property(
            fc.record({
              page: fc.integer({ min: 1, max: 1000 }),
              pageSize: fc.integer({ min: 1, max: 100 }),
              sortBy: fc.constantFrom('price', 'rating', 'newest', 'best_selling', 'relevance'),
            }),
            (query) => {
              const { error } = searchProductSchema.validate(query);
              expect(error).toBeUndefined();
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should reject invalid page size (> 100)', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 101, max: 1000 }),
            (pageSize) => {
              const { error } = searchProductSchema.validate({ pageSize });
              expect(error).toBeDefined();
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});
