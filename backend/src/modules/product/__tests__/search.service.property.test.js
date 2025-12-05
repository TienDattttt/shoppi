/**
 * Property-Based Tests for Search Service
 * Tests search relevance, filtering, and pagination
 */

const fc = require('fast-check');
const searchService = require('../services/search.service');

// Mock Elasticsearch client
jest.mock('../../../shared/elasticsearch/elasticsearch.client', () => ({
  esClient: {
    search: jest.fn(),
    index: jest.fn(),
    delete: jest.fn(),
  },
  PRODUCT_INDEX: 'products',
  isAvailable: jest.fn().mockResolvedValue(true),
}));

const { esClient, isAvailable } = require('../../../shared/elasticsearch/elasticsearch.client');

// Arbitrary generators
const searchQueryArb = fc.string({ minLength: 0, maxLength: 100 });
const positiveIntArb = fc.integer({ min: 1, max: 1000 });
const priceArb = fc.float({ min: 0, max: 100000000, noNaN: true });
const ratingArb = fc.float({ min: 0, max: 5, noNaN: true });

const filtersArb = fc.record({
  category_id: fc.option(fc.uuid(), { nil: undefined }),
  min_price: fc.option(priceArb, { nil: undefined }),
  max_price: fc.option(priceArb, { nil: undefined }),
  min_rating: fc.option(ratingArb, { nil: undefined }),
  shop_id: fc.option(fc.uuid(), { nil: undefined }),
});

const productArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  slug: fc.string({ minLength: 1, maxLength: 250 }),
  short_description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  base_price: priceArb,
  avg_rating: ratingArb,
  status: fc.constant('active'),
  category_id: fc.uuid(),
  shop_id: fc.uuid(),
});

describe('Search Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isAvailable.mockResolvedValue(true);
  });


  /**
   * **Feature: product-management, Property 11: Search relevance and filtering**
   * **Validates: Requirements 5.1, 5.2, 5.3**
   * 
   * For any search query with filters, all returned products SHALL match the search keywords
   * AND satisfy all applied filters.
   */
  describe('Property 11: Search relevance and filtering', () => {
    it('should build query with active status filter', () => {
      fc.assert(
        fc.property(searchQueryArb, filtersArb, (query, filters) => {
          const esQuery = searchService.buildSearchQuery({ query, filters });
          
          // Should always filter for active status
          const statusFilter = esQuery.bool.filter.find(
            f => f.term && f.term.status === 'active'
          );
          expect(statusFilter).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should include category filter when provided', () => {
      fc.assert(
        fc.property(searchQueryArb, fc.uuid(), (query, categoryId) => {
          const esQuery = searchService.buildSearchQuery({
            query,
            filters: { category_id: categoryId },
          });
          
          const categoryFilter = esQuery.bool.filter.find(
            f => f.term && f.term.category_id === categoryId
          );
          expect(categoryFilter).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should include price range filter when provided', () => {
      fc.assert(
        fc.property(
          searchQueryArb,
          priceArb,
          priceArb,
          (query, minPrice, maxPrice) => {
            const esQuery = searchService.buildSearchQuery({
              query,
              filters: { min_price: minPrice, max_price: maxPrice },
            });
            
            const priceFilter = esQuery.bool.filter.find(
              f => f.range && f.range.base_price
            );
            expect(priceFilter).toBeDefined();
            expect(priceFilter.range.base_price.gte).toBe(minPrice);
            expect(priceFilter.range.base_price.lte).toBe(maxPrice);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include rating filter when provided', () => {
      fc.assert(
        fc.property(searchQueryArb, ratingArb, (query, minRating) => {
          const esQuery = searchService.buildSearchQuery({
            query,
            filters: { min_rating: minRating },
          });
          
          const ratingFilter = esQuery.bool.filter.find(
            f => f.range && f.range.avg_rating
          );
          expect(ratingFilter).toBeDefined();
          expect(ratingFilter.range.avg_rating.gte).toBe(minRating);
        }),
        { numRuns: 100 }
      );
    });

    it('should use multi_match for text search', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (query) => {
            const esQuery = searchService.buildSearchQuery({ query, filters: {} });
            
            const multiMatch = esQuery.bool.must.find(
              m => m.multi_match
            );
            expect(multiMatch).toBeDefined();
            expect(multiMatch.multi_match.query).toBe(query.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use match_all for empty query', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', null, undefined),
          (emptyQuery) => {
            const esQuery = searchService.buildSearchQuery({
              query: emptyQuery,
              filters: {},
            });
            
            const matchAll = esQuery.bool.must.find(m => m.match_all);
            expect(matchAll).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should include shop filter when provided', () => {
      fc.assert(
        fc.property(searchQueryArb, fc.uuid(), (query, shopId) => {
          const esQuery = searchService.buildSearchQuery({
            query,
            filters: { shop_id: shopId },
          });
          
          const shopFilter = esQuery.bool.filter.find(
            f => f.term && f.term.shop_id === shopId
          );
          expect(shopFilter).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: product-management, Property 12: Search pagination bounds**
   * **Validates: Requirements 5.4**
   * 
   * For any search request, the page size SHALL be between 1 and 100, defaulting to 20 if not specified.
   */
  describe('Property 12: Search pagination bounds', () => {
    it('should default to page size 20 when not specified', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(undefined, null, 0, -1, NaN),
          (invalidLimit) => {
            const { limit } = searchService.normalizePagination({ limit: invalidLimit });
            expect(limit).toBe(searchService.DEFAULT_PAGE_SIZE);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should enforce minimum page size of 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }),
          (tooSmallLimit) => {
            const { limit } = searchService.normalizePagination({ limit: tooSmallLimit });
            expect(limit).toBeGreaterThanOrEqual(searchService.MIN_PAGE_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce maximum page size of 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 101, max: 10000 }),
          (tooLargeLimit) => {
            const { limit } = searchService.normalizePagination({ limit: tooLargeLimit });
            expect(limit).toBeLessThanOrEqual(searchService.MAX_PAGE_SIZE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid page sizes between 1 and 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (validLimit) => {
            const { limit } = searchService.normalizePagination({ limit: validLimit });
            expect(limit).toBe(validLimit);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should default to page 1 when not specified', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(undefined, null, 0, -1, NaN),
          (invalidPage) => {
            const { page } = searchService.normalizePagination({ page: invalidPage });
            expect(page).toBe(1);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should enforce minimum page of 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }),
          (tooSmallPage) => {
            const { page } = searchService.normalizePagination({ page: tooSmallPage });
            expect(page).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate correct offset (from) based on page and limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (page, limit) => {
            const { from } = searchService.normalizePagination({ page, limit });
            expect(from).toBe((page - 1) * limit);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent pagination structure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (page, limit) => {
            const result = searchService.normalizePagination({ page, limit });
            
            expect(result).toHaveProperty('page');
            expect(result).toHaveProperty('limit');
            expect(result).toHaveProperty('from');
            
            expect(typeof result.page).toBe('number');
            expect(typeof result.limit).toBe('number');
            expect(typeof result.from).toBe('number');
            
            expect(result.page).toBeGreaterThanOrEqual(1);
            expect(result.limit).toBeGreaterThanOrEqual(1);
            expect(result.limit).toBeLessThanOrEqual(100);
            expect(result.from).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Search function integration', () => {
    it('should return proper response structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          searchQueryArb,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 10 }),
          async (query, limit, page) => {
            esClient.search.mockResolvedValue({
              hits: {
                hits: [],
                total: { value: 0 },
              },
            });
            
            const result = await searchService.search({ query, limit, page });
            
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('pagination');
            expect(result.pagination).toHaveProperty('page');
            expect(result.pagination).toHaveProperty('limit');
            expect(result.pagination).toHaveProperty('total');
            expect(result.pagination).toHaveProperty('totalPages');
            
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.pagination.limit).toBeLessThanOrEqual(100);
            expect(result.pagination.limit).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
