/**
 * Property-Based Tests for View Service
 * Tests view count tracking correctness
 */

const fc = require('fast-check');
const viewService = require('../services/view.service');
const productRepository = require('../product.repository');

// Mock the repository and redis
jest.mock('../product.repository');
jest.mock('../../../shared/redis/redis.client', () => ({
  redisClient: {
    exists: jest.fn(),
    setEx: jest.fn(),
  },
}));

const { redisClient } = require('../../../shared/redis/redis.client');

// Arbitrary generators
const productArb = fc.record({
  id: fc.uuid(),
  shop_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  status: fc.constantFrom('active', 'pending', 'rejected', 'inactive'),
  view_count: fc.integer({ min: 0, max: 1000000 }),
  variants: fc.array(fc.record({ id: fc.uuid() }), { maxLength: 5 }),
  images: fc.array(fc.record({ id: fc.uuid() }), { maxLength: 10 }),
});

const viewerIdArb = fc.oneof(fc.uuid(), fc.ipV4());

describe('View Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: product-management, Property 13: View count increment**
   * **Validates: Requirements 6.2**
   * 
   * For any product detail view, the view count SHALL increment by exactly 1.
   */
  describe('Property 13: View count increment', () => {
    it('should increment view count by exactly 1 for active products', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArb,
          viewerIdArb,
          async (product, viewerId) => {
            const activeProduct = { ...product, status: 'active' };
            const initialViewCount = activeProduct.view_count;
            
            // Mock: product exists, not rate limited
            productRepository.findProductByIdWithRelations
              .mockResolvedValueOnce(activeProduct)
              .mockResolvedValueOnce({ ...activeProduct, view_count: initialViewCount + 1 });
            productRepository.findProductById.mockResolvedValue(activeProduct);
            productRepository.incrementViewCount.mockResolvedValue();
            redisClient.exists.mockResolvedValue(0); // Not rate limited
            redisClient.setEx.mockResolvedValue('OK');
            
            const result = await viewService.trackProductView(product.id, viewerId);
            
            // View should be counted
            expect(result.viewCounted).toBe(true);
            expect(result.newViewCount).toBe(initialViewCount + 1);
            expect(result.previousViewCount).toBe(initialViewCount);
            
            // incrementViewCount should be called exactly once
            expect(productRepository.incrementViewCount).toHaveBeenCalledTimes(1);
            expect(productRepository.incrementViewCount).toHaveBeenCalledWith(product.id);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('should not increment view count for non-active products', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArb,
          viewerIdArb,
          fc.constantFrom('pending', 'rejected', 'inactive', 'draft'),
          async (product, viewerId, status) => {
            const nonActiveProduct = { ...product, status };
            
            productRepository.findProductByIdWithRelations.mockResolvedValue(nonActiveProduct);
            
            const result = await viewService.trackProductView(product.id, viewerId);
            
            // View should NOT be counted
            expect(result.viewCounted).toBe(false);
            expect(result.newViewCount).toBe(nonActiveProduct.view_count);
            
            // incrementViewCount should NOT be called
            expect(productRepository.incrementViewCount).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not increment view count when rate limited', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArb,
          viewerIdArb,
          async (product, viewerId) => {
            const activeProduct = { ...product, status: 'active' };
            
            productRepository.findProductByIdWithRelations.mockResolvedValue(activeProduct);
            redisClient.exists.mockResolvedValue(1); // Rate limited
            
            const result = await viewService.trackProductView(product.id, viewerId);
            
            // View should NOT be counted due to rate limit
            expect(result.viewCounted).toBe(false);
            expect(result.reason).toBe('Rate limited');
            
            // incrementViewCount should NOT be called
            expect(productRepository.incrementViewCount).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark product as viewed after counting', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArb,
          viewerIdArb,
          async (product, viewerId) => {
            const activeProduct = { ...product, status: 'active' };
            
            productRepository.findProductByIdWithRelations
              .mockResolvedValueOnce(activeProduct)
              .mockResolvedValueOnce({ ...activeProduct, view_count: activeProduct.view_count + 1 });
            productRepository.incrementViewCount.mockResolvedValue();
            redisClient.exists.mockResolvedValue(0);
            redisClient.setEx.mockResolvedValue('OK');
            
            await viewService.trackProductView(product.id, viewerId);
            
            // Should mark as viewed with correct key
            const expectedKey = viewService.getViewRateLimitKey(product.id, viewerId);
            expect(redisClient.setEx).toHaveBeenCalledWith(
              expectedKey,
              viewService.VIEW_RATE_LIMIT_WINDOW,
              '1'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate correct rate limit key', () => {
      fc.assert(
        fc.property(fc.uuid(), viewerIdArb, (productId, viewerId) => {
          const key = viewService.getViewRateLimitKey(productId, viewerId);
          
          // Key should contain product ID and viewer ID
          expect(key).toContain(productId);
          expect(key).toContain(viewerId);
          
          // Key should have correct prefix
          expect(key.startsWith('product_view:')).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should throw NotFoundError for non-existent product', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), viewerIdArb, async (productId, viewerId) => {
          productRepository.findProductByIdWithRelations.mockResolvedValue(null);
          
          await expect(
            viewService.trackProductView(productId, viewerId)
          ).rejects.toThrow('Product not found');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Direct view count operations', () => {
    it('should increment view count directly without rate limiting', async () => {
      await fc.assert(
        fc.asyncProperty(productArb, async (product) => {
          const initialCount = product.view_count;
          
          productRepository.findProductById.mockResolvedValue(product);
          productRepository.incrementViewCount.mockResolvedValue();
          
          const result = await viewService.incrementViewCount(product.id);
          
          expect(result.previousCount).toBe(initialCount);
          expect(result.newCount).toBe(initialCount + 1);
          expect(productRepository.incrementViewCount).toHaveBeenCalledWith(product.id);
        }),
        { numRuns: 100 }
      );
    });

    it('should return correct view count', async () => {
      await fc.assert(
        fc.asyncProperty(productArb, async (product) => {
          productRepository.findProductById.mockResolvedValue(product);
          
          const count = await viewService.getViewCount(product.id);
          
          expect(count).toBe(product.view_count || 0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
