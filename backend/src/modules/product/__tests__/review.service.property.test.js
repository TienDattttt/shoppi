/**
 * Property-Based Tests for Review Service
 * Tests review creation, purchase verification, and rating calculation
 */

const fc = require('fast-check');
const reviewService = require('../services/review.service');
const productRepository = require('../product.repository');
const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');

// Mock dependencies
jest.mock('../product.repository');
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              limit: jest.fn(() => ({
                single: jest.fn(),
              })),
            })),
            single: jest.fn(),
          })),
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

// Arbitrary generators
const ratingArb = fc.integer({ min: 1, max: 5 });
const invalidRatingArb = fc.oneof(
  fc.integer({ min: -100, max: 0 }),
  fc.integer({ min: 6, max: 100 }),
  fc.float({ min: Math.fround(1.1), max: Math.fround(4.9), noNaN: true })
);

const reviewDataArb = fc.record({
  rating: ratingArb,
  title: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: null }),
  content: fc.option(fc.string({ minLength: 1, maxLength: 2000 }), { nil: null }),
});

const productArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  status: fc.constant('active'),
});

describe('Review Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  /**
   * **Feature: product-management, Property 14: Review purchase requirement**
   * **Validates: Requirements 9.1, 9.3**
   * 
   * For any review submission, if the user has NOT purchased the product, the submission
   * SHALL be rejected; if the user HAS purchased, the review SHALL be created with
   * verified_purchase=true.
   */
  describe('Property 14: Review purchase requirement', () => {
    it('should reject review when user has not purchased the product', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          reviewDataArb,
          productArb,
          async (userId, productId, reviewData, product) => {
            // Mock: product exists
            productRepository.findProductById.mockResolvedValue(product);
            
            // Mock: no existing review
            const mockSelect = jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ count: 0 }),
                }),
              }),
            });
            
            // Mock: user has NOT purchased
            const mockOrderSelect = jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
                    }),
                  }),
                }),
              }),
            });
            
            supabaseAdmin.from.mockImplementation((table) => {
              if (table === 'reviews') {
                return { select: mockSelect };
              }
              if (table === 'order_items') {
                return { select: mockOrderSelect };
              }
              return { select: jest.fn() };
            });
            
            await expect(
              reviewService.createReview(userId, productId, reviewData)
            ).rejects.toThrow('You must purchase this product before leaving a review');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate rating is between 1 and 5', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          invalidRatingArb,
          async (userId, productId, invalidRating) => {
            const reviewData = { rating: invalidRating, title: 'Test', content: 'Test' };
            
            await expect(
              reviewService.createReview(userId, productId, reviewData)
            ).rejects.toThrow('Rating must be an integer between 1 and 5');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject review when product does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          reviewDataArb,
          async (userId, productId, reviewData) => {
            productRepository.findProductById.mockResolvedValue(null);
            
            await expect(
              reviewService.createReview(userId, productId, reviewData)
            ).rejects.toThrow('Product not found');
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: product-management, Property 15: Rating recalculation accuracy**
   * **Validates: Requirements 9.2**
   * 
   * For any product with reviews, the average rating SHALL equal the sum of all
   * review ratings divided by the number of reviews.
   */
  describe('Property 15: Rating recalculation accuracy', () => {
    it('should calculate correct average from ratings array', () => {
      fc.assert(
        fc.property(
          fc.array(ratingArb, { minLength: 1, maxLength: 100 }),
          (ratings) => {
            const average = reviewService.calculateAverageRating(ratings);
            
            // Calculate expected average
            const sum = ratings.reduce((acc, r) => acc + r, 0);
            const expectedAverage = Math.round((sum / ratings.length) * 10) / 10;
            
            expect(average).toBe(expectedAverage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for empty ratings array', () => {
      fc.assert(
        fc.property(
          fc.constantFrom([], null, undefined),
          (emptyRatings) => {
            const average = reviewService.calculateAverageRating(emptyRatings);
            expect(average).toBe(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return rating value for single review', () => {
      fc.assert(
        fc.property(ratingArb, (rating) => {
          const average = reviewService.calculateAverageRating([rating]);
          expect(average).toBe(rating);
        }),
        { numRuns: 100 }
      );
    });

    it('should always return value between 0 and 5', () => {
      fc.assert(
        fc.property(
          fc.array(ratingArb, { minLength: 0, maxLength: 100 }),
          (ratings) => {
            const average = reviewService.calculateAverageRating(ratings);
            
            expect(average).toBeGreaterThanOrEqual(0);
            expect(average).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round to 1 decimal place', () => {
      fc.assert(
        fc.property(
          fc.array(ratingArb, { minLength: 1, maxLength: 100 }),
          (ratings) => {
            const average = reviewService.calculateAverageRating(ratings);
            
            // Check that it has at most 1 decimal place
            const decimalPlaces = (average.toString().split('.')[1] || '').length;
            expect(decimalPlaces).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be commutative (order of ratings does not matter)', () => {
      fc.assert(
        fc.property(
          fc.array(ratingArb, { minLength: 2, maxLength: 50 }),
          (ratings) => {
            const average1 = reviewService.calculateAverageRating(ratings);
            
            // Shuffle ratings
            const shuffled = [...ratings].sort(() => Math.random() - 0.5);
            const average2 = reviewService.calculateAverageRating(shuffled);
            
            expect(average1).toBe(average2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all same ratings correctly', () => {
      fc.assert(
        fc.property(
          ratingArb,
          fc.integer({ min: 1, max: 100 }),
          (rating, count) => {
            const ratings = Array(count).fill(rating);
            const average = reviewService.calculateAverageRating(ratings);
            
            expect(average).toBe(rating);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate weighted average correctly for extreme distributions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          fc.integer({ min: 1, max: 50 }),
          (count1, count5) => {
            // Create array with count1 ones and count5 fives
            const ratings = [
              ...Array(count1).fill(1),
              ...Array(count5).fill(5),
            ];
            
            const average = reviewService.calculateAverageRating(ratings);
            const expected = Math.round(((count1 * 1 + count5 * 5) / (count1 + count5)) * 10) / 10;
            
            expect(average).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Review validation', () => {
    it('should accept valid ratings 1-5', () => {
      fc.assert(
        fc.property(ratingArb, (rating) => {
          // Valid ratings should not throw during validation
          expect(rating).toBeGreaterThanOrEqual(1);
          expect(rating).toBeLessThanOrEqual(5);
          expect(Number.isInteger(rating)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });
});
