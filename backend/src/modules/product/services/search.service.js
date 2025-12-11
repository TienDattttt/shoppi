/**
 * Search Service
 * Product search using Elasticsearch
 */

const { esClient, PRODUCT_INDEX, isAvailable } = require('../../../shared/elasticsearch/elasticsearch.client');
const { ValidationError } = require('../../../shared/utils/error.util');

// Default pagination
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 1;

// Sort options
const SORT_OPTIONS = {
  relevance: null, // Default ES scoring
  price_asc: { base_price: 'asc' },
  price_desc: { base_price: 'desc' },
  rating: { avg_rating: 'desc' },
  newest: { created_at: 'desc' },
  best_selling: { total_sold: 'desc' },
  most_viewed: { view_count: 'desc' },
};

/**
 * Normalize pagination parameters
 * @param {object} params
 * @returns {object}
 */
function normalizePagination(params = {}) {
  let { page = 1, limit = DEFAULT_PAGE_SIZE } = params;
  
  page = Math.max(1, parseInt(page, 10) || 1);
  limit = parseInt(limit, 10) || DEFAULT_PAGE_SIZE;
  
  // Enforce bounds
  if (limit < MIN_PAGE_SIZE) limit = MIN_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
  
  const from = (page - 1) * limit;
  
  return { page, limit, from };
}

/**
 * Build Elasticsearch query from search parameters
 * @param {object} params
 * @returns {object}
 */
function buildSearchQuery(params) {
  const { query, filters = {} } = params;
  const must = [];
  const filter = [];

  // Text search
  if (query && query.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: ['name^3', 'description', 'short_description', 'shop_name'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  // Status filter (default to active if not specified)
  if (filters.status) {
    filter.push({ term: { status: filters.status } });
  } else {
    filter.push({ term: { status: 'active' } });
  }

  // Category filter
  if (filters.category_id) {
    filter.push({ term: { category_id: filters.category_id } });
  }

  // Category path filter (for hierarchical categories)
  if (filters.category_path) {
    filter.push({ prefix: { category_path: filters.category_path } });
  }

  // Price range filter
  if (filters.min_price !== undefined || filters.max_price !== undefined) {
    const priceRange = {};
    if (filters.min_price !== undefined) priceRange.gte = filters.min_price;
    if (filters.max_price !== undefined) priceRange.lte = filters.max_price;
    filter.push({ range: { base_price: priceRange } });
  }

  // Rating filter
  if (filters.min_rating !== undefined) {
    filter.push({ range: { avg_rating: { gte: filters.min_rating } } });
  }

  // Shop filter
  if (filters.shop_id) {
    filter.push({ term: { shop_id: filters.shop_id } });
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filter.push({ terms: { tags: filters.tags } });
  }

  return {
    bool: {
      must: must.length > 0 ? must : [{ match_all: {} }],
      filter,
    },
  };
}


/**
 * Search products
 * @param {object} params - Search parameters
 * @returns {Promise<object>}
 */
async function search(params = {}) {
  const { page, limit, from } = normalizePagination(params);
  const query = buildSearchQuery(params);
  
  // Build sort
  let sort = [];
  if (params.sort && SORT_OPTIONS[params.sort]) {
    sort.push(SORT_OPTIONS[params.sort]);
  }
  sort.push({ _score: 'desc' }); // Always include relevance as secondary sort

  // Check if ES is available
  if (!esClient || !(await isAvailable())) {
    // Fallback: use database query
    console.warn('[Search] Elasticsearch not available, using database fallback');
    const productRepository = require('../product.repository');
    return productRepository.searchProducts({
      query: params.query,
      categoryId: params.filters?.category_id,
      status: params.filters?.status || 'active',
      minPrice: params.filters?.min_price,
      maxPrice: params.filters?.max_price,
      minRating: params.filters?.min_rating,
      sortBy: params.sort,
      sortOrder: 'desc',
      page,
      limit,
    });
  }

  try {
    const response = await esClient.search({
      index: PRODUCT_INDEX,
      body: {
        query,
        sort,
        from,
        size: limit,
        _source: [
          'id', 'name', 'slug', 'short_description', 'base_price',
          'compare_at_price', 'currency', 'avg_rating', 'review_count',
          'total_sold', 'category_name', 'shop_name',
        ],
      },
    });

    const hits = response.hits.hits;
    const total = typeof response.hits.total === 'object' 
      ? response.hits.total.value 
      : response.hits.total;

    return {
      data: hits.map(hit => ({
        ...hit._source,
        _score: hit._score,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      query: params.query || '',
      filters: params.filters || {},
    };
  } catch (error) {
    console.error('Search error:', error.message);
    // Fallback to database query on error
    console.warn('[Search] Elasticsearch error, using database fallback');
    const productRepository = require('../product.repository');
    return productRepository.searchProducts({
      query: params.query,
      categoryId: params.filters?.category_id,
      status: params.filters?.status || 'active',
      minPrice: params.filters?.min_price,
      maxPrice: params.filters?.max_price,
      minRating: params.filters?.min_rating,
      sortBy: params.sort,
      sortOrder: 'desc',
      page,
      limit,
    });
  }
}

/**
 * Index a product
 * @param {object} product
 * @returns {Promise<object>}
 */
async function indexProduct(product) {
  if (!esClient || !(await isAvailable())) {
    console.warn('Elasticsearch not available, skipping indexing');
    return null;
  }

  const document = {
    id: product.id,
    shop_id: product.shop_id,
    category_id: product.category_id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    short_description: product.short_description,
    base_price: product.base_price,
    compare_at_price: product.compare_at_price,
    currency: product.currency,
    status: product.status,
    total_sold: product.total_sold || 0,
    view_count: product.view_count || 0,
    avg_rating: product.avg_rating || 0,
    review_count: product.review_count || 0,
    category_path: product.category_path,
    category_name: product.category_name,
    shop_name: product.shop_name,
    tags: product.tags || [],
    created_at: product.created_at,
    updated_at: product.updated_at,
    published_at: product.published_at,
  };

  try {
    const response = await esClient.index({
      index: PRODUCT_INDEX,
      id: product.id,
      body: document,
      refresh: true,
    });
    return response;
  } catch (error) {
    console.error('Index error:', error.message);
    throw error;
  }
}

/**
 * Remove product from index
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function removeFromIndex(productId) {
  if (!esClient || !(await isAvailable())) {
    return null;
  }

  try {
    const response = await esClient.delete({
      index: PRODUCT_INDEX,
      id: productId,
      refresh: true,
    });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      return null; // Already removed
    }
    console.error('Remove from index error:', error.message);
    throw error;
  }
}

/**
 * Update product in index
 * @param {string} productId
 * @param {object} updates
 * @returns {Promise<object>}
 */
async function updateInIndex(productId, updates) {
  if (!esClient || !(await isAvailable())) {
    return null;
  }

  try {
    const response = await esClient.update({
      index: PRODUCT_INDEX,
      id: productId,
      body: { doc: updates },
      refresh: true,
    });
    return response;
  } catch (error) {
    console.error('Update index error:', error.message);
    throw error;
  }
}

/**
 * Get search suggestions
 * @param {string} query
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
async function suggest(query, limit = 5) {
  if (!esClient || !(await isAvailable()) || !query) {
    return [];
  }

  try {
    const response = await esClient.search({
      index: PRODUCT_INDEX,
      body: {
        suggest: {
          product_suggest: {
            prefix: query,
            completion: {
              field: 'name.suggest',
              size: limit,
              skip_duplicates: true,
            },
          },
        },
      },
    });

    const suggestions = response.suggest?.product_suggest?.[0]?.options || [];
    return suggestions.map(s => s.text);
  } catch (error) {
    console.error('Suggest error:', error.message);
    return [];
  }
}

/**
 * Get popular/trending products
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
async function getPopularProducts(limit = 20) {
  return search({
    sort: 'best_selling',
    limit,
    filters: {},
  });
}

/**
 * Bulk index products
 * @param {object[]} products
 * @returns {Promise<object>}
 */
async function bulkIndex(products) {
  if (!esClient || !(await isAvailable()) || products.length === 0) {
    return null;
  }

  const operations = products.flatMap(product => [
    { index: { _index: PRODUCT_INDEX, _id: product.id } },
    {
      id: product.id,
      shop_id: product.shop_id,
      category_id: product.category_id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      short_description: product.short_description,
      base_price: product.base_price,
      status: product.status,
      avg_rating: product.avg_rating || 0,
      total_sold: product.total_sold || 0,
      created_at: product.created_at,
    },
  ]);

  try {
    const response = await esClient.bulk({
      refresh: true,
      operations,
    });
    return response;
  } catch (error) {
    console.error('Bulk index error:', error.message);
    throw error;
  }
}

module.exports = {
  search,
  indexProduct,
  removeFromIndex,
  updateInIndex,
  suggest,
  getPopularProducts,
  bulkIndex,
  normalizePagination,
  buildSearchQuery,
  SORT_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
};
