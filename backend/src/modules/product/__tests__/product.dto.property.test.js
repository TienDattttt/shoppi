/**
 * Property-Based Tests for Product DTOs
 * Tests serialization/deserialization correctness
 */

const fc = require('fast-check');
const {
  serializeProduct,
  serializeProductSummary,
  serializeVariant,
  serializeCategory,
  deserializeProduct,
  deserializeVariant,
  INTERNAL_FIELDS,
} = require('../product.dto');

// Arbitrary generators for product data
const productStatusArb = fc.constantFrom('draft', 'pending', 'active', 'rejected', 'revision_required', 'inactive');
const currencyArb = fc.constantFrom('VND', 'USD', 'EUR');

const productArb = fc.record({
  id: fc.uuid(),
  shop_id: fc.uuid(),
  category_id: fc.option(fc.uuid(), { nil: null }),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  slug: fc.string({ minLength: 1, maxLength: 250 }),
  description: fc.option(fc.string({ maxLength: 10000 }), { nil: null }),
  short_description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  base_price: fc.integer({ min: 0, max: 999999999 }).map(n => (n / 100).toFixed(2)),
  compare_at_price: fc.option(fc.integer({ min: 0, max: 999999999 }).map(n => (n / 100).toFixed(2)), { nil: null }),
  currency: currencyArb,
  status: productStatusArb,
  rejection_reason: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  total_sold: fc.integer({ min: 0, max: 1000000 }),
  view_count: fc.integer({ min: 0, max: 10000000 }),
  avg_rating: fc.integer({ min: 0, max: 50 }).map(n => (n / 10).toFixed(1)),
  review_count: fc.integer({ min: 0, max: 100000 }),
  meta_title: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  meta_description: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
  published_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
});

const variantArb = fc.record({
  id: fc.uuid(),
  product_id: fc.uuid(),
  sku: fc.string({ minLength: 1, maxLength: 100 }),
  name: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  attributes: fc.dictionary(fc.string({ minLength: 1, maxLength: 50 }), fc.string({ maxLength: 100 })),
  price: fc.option(fc.integer({ min: 0, max: 999999999 }).map(n => (n / 100).toFixed(2)), { nil: null }),
  compare_at_price: fc.option(fc.integer({ min: 0, max: 999999999 }).map(n => (n / 100).toFixed(2)), { nil: null }),
  quantity: fc.integer({ min: 0, max: 100000 }),
  reserved_quantity: fc.integer({ min: 0, max: 1000 }),
  low_stock_threshold: fc.integer({ min: 0, max: 1000 }),
  image_url: fc.option(fc.webUrl(), { nil: null }),
  is_active: fc.boolean(),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
});

const categoryArb = fc.record({
  id: fc.uuid(),
  parent_id: fc.option(fc.uuid(), { nil: null }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  slug: fc.string({ minLength: 1, maxLength: 120 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  image_url: fc.option(fc.webUrl(), { nil: null }),
  level: fc.integer({ min: 1, max: 3 }),
  path: fc.string({ minLength: 1, maxLength: 500 }),
});

describe('Product DTO Property Tests', () => {

  /**
   * **Feature: product-management, Property 17: Product serialization round-trip**
   * **Validates: Requirements 11.4**
   * 
   * For any valid Product object, serializing to JSON then deserializing
   * SHALL produce an equivalent Product object.
   */
  describe('Property 17: Product serialization round-trip', () => {
    it('should preserve product data through serialize -> deserialize cycle', () => {
      fc.assert(
        fc.property(productArb, (product) => {
          // Serialize the product
          const serialized = serializeProduct(product);
          
          // Deserialize back
          const deserialized = deserializeProduct(serialized);
          
          // Check that key fields are preserved
          expect(deserialized.id).toBe(product.id);
          expect(deserialized.shop_id).toBe(product.shop_id);
          expect(deserialized.category_id).toBe(product.category_id);
          expect(deserialized.name).toBe(product.name);
          expect(deserialized.slug).toBe(product.slug);
          expect(deserialized.description).toBe(product.description);
          expect(deserialized.short_description).toBe(product.short_description);
          expect(deserialized.status).toBe(product.status);
          expect(deserialized.currency).toBe(product.currency);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve variant data through serialize -> deserialize cycle', () => {
      fc.assert(
        fc.property(variantArb, (variant) => {
          // Serialize the variant
          const serialized = serializeVariant(variant);
          
          // Deserialize back
          const deserialized = deserializeVariant(serialized);
          
          // Check that key fields are preserved
          expect(deserialized.id).toBe(variant.id);
          expect(deserialized.product_id).toBe(variant.product_id);
          expect(deserialized.sku).toBe(variant.sku);
          expect(deserialized.name).toBe(variant.name);
          expect(deserialized.is_active).toBe(variant.is_active);
          
          // Attributes should be preserved
          expect(deserialized.attributes).toEqual(variant.attributes);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null product gracefully', () => {
      expect(serializeProduct(null)).toBeNull();
      expect(deserializeProduct(null)).toBeNull();
    });

    it('should handle null variant gracefully', () => {
      expect(serializeVariant(null)).toBeNull();
      expect(deserializeVariant(null)).toBeNull();
    });

    it('should convert snake_case to camelCase in serialization', () => {
      fc.assert(
        fc.property(productArb, (product) => {
          const serialized = serializeProduct(product);
          
          // Check camelCase keys
          expect(serialized).toHaveProperty('shopId');
          expect(serialized).toHaveProperty('categoryId');
          expect(serialized).toHaveProperty('basePrice');
          expect(serialized).toHaveProperty('shortDescription');
          expect(serialized).toHaveProperty('avgRating');
          expect(serialized).toHaveProperty('reviewCount');
          expect(serialized).toHaveProperty('createdAt');
          
          // Should not have snake_case keys
          expect(serialized).not.toHaveProperty('shop_id');
          expect(serialized).not.toHaveProperty('category_id');
          expect(serialized).not.toHaveProperty('base_price');
        }),
        { numRuns: 100 }
      );
    });

    it('should convert camelCase to snake_case in deserialization', () => {
      fc.assert(
        fc.property(productArb, (product) => {
          const serialized = serializeProduct(product);
          const deserialized = deserializeProduct(serialized);
          
          // Check snake_case keys
          expect(deserialized).toHaveProperty('shop_id');
          expect(deserialized).toHaveProperty('category_id');
          expect(deserialized).toHaveProperty('base_price');
          expect(deserialized).toHaveProperty('short_description');
          
          // Should not have camelCase keys
          expect(deserialized).not.toHaveProperty('shopId');
          expect(deserialized).not.toHaveProperty('categoryId');
          expect(deserialized).not.toHaveProperty('basePrice');
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: product-management, Property 18: Search result lightweight serialization**
   * **Validates: Requirements 11.5**
   * 
   * For any search result, the serialized product summary SHALL NOT contain
   * full description, only short_description and essential fields.
   */
  describe('Property 18: Search result lightweight serialization', () => {
    it('should not include full description in product summary', () => {
      fc.assert(
        fc.property(productArb, (product) => {
          const summary = serializeProductSummary(product);
          
          // Should NOT have full description
          expect(summary).not.toHaveProperty('description');
          
          // Should have short description
          expect(summary).toHaveProperty('shortDescription');
        }),
        { numRuns: 100 }
      );
    });

    it('should only include essential fields in product summary', () => {
      fc.assert(
        fc.property(productArb, (product) => {
          const summary = serializeProductSummary(product);
          
          // Essential fields that SHOULD be present
          const essentialFields = [
            'id',
            'name',
            'slug',
            'shortDescription',
            'basePrice',
            'currency',
            'status',
            'avgRating',
            'reviewCount',
            'totalSold',
          ];
          
          for (const field of essentialFields) {
            expect(summary).toHaveProperty(field);
          }
          
          // Fields that should NOT be in summary
          const excludedFields = [
            'description',
            'metaTitle',
            'metaDescription',
            'rejectionReason',
            'viewCount',
            'shopId',
            'categoryId',
            'createdAt',
            'updatedAt',
            'publishedAt',
          ];
          
          for (const field of excludedFields) {
            expect(summary).not.toHaveProperty(field);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should be significantly smaller than full product serialization', () => {
      fc.assert(
        fc.property(productArb, (product) => {
          const fullProduct = serializeProduct(product);
          const summary = serializeProductSummary(product);
          
          const fullKeys = Object.keys(fullProduct).length;
          const summaryKeys = Object.keys(summary).length;
          
          // Summary should have fewer fields than full product
          expect(summaryKeys).toBeLessThan(fullKeys);
        }),
        { numRuns: 100 }
      );
    });

    it('should include primary image URL when images are present', () => {
      fc.assert(
        fc.property(
          productArb,
          fc.array(
            fc.record({
              id: fc.uuid(),
              url: fc.webUrl(),
              is_primary: fc.boolean(),
              sort_order: fc.integer({ min: 0, max: 10 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (product, images) => {
            const productWithImages = { ...product, images };
            const summary = serializeProductSummary(productWithImages);
            
            // Should have imageUrl
            expect(summary).toHaveProperty('imageUrl');
            
            // Should be the primary image or first image
            const primaryImage = images.find(img => img.is_primary) || images[0];
            expect(summary.imageUrl).toBe(primaryImage.url);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle product without images', () => {
      fc.assert(
        fc.property(productArb, (product) => {
          // Product without images
          const summary = serializeProductSummary(product);
          
          // imageUrl should not be present or be undefined
          expect(summary.imageUrl).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null product gracefully', () => {
      expect(serializeProductSummary(null)).toBeNull();
    });
  });

  /**
   * Category serialization tests
   */
  describe('Category serialization', () => {
    it('should serialize category with all fields', () => {
      fc.assert(
        fc.property(categoryArb, (category) => {
          const serialized = serializeCategory(category);
          
          expect(serialized.id).toBe(category.id);
          expect(serialized.parentId).toBe(category.parent_id);
          expect(serialized.name).toBe(category.name);
          expect(serialized.slug).toBe(category.slug);
          expect(serialized.level).toBe(category.level);
          expect(serialized.path).toBe(category.path);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null category gracefully', () => {
      expect(serializeCategory(null)).toBeNull();
    });
  });
});
