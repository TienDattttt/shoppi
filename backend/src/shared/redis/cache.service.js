/**
 * Cache Service
 * Generic caching service using Redis
 * 
 * Requirements: Performance optimization, caching
 */

const { getRedisClient } = require('./redis.client');

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  VERY_LONG: 86400,    // 24 hours
};

// Cache key prefixes
const CACHE_PREFIX = {
  PRODUCT: 'cache:product:',
  PRODUCT_LIST: 'cache:products:',
  CATEGORY: 'cache:category:',
  CATEGORY_TREE: 'cache:categories:tree',
  CATEGORY_LIST: 'cache:categories:list',
  USER: 'cache:user:',
  SHOP: 'cache:shop:',
  SESSION: 'cache:session:',
};

// ============================================
// BASIC CACHE OPERATIONS
// ============================================

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>}
 */
async function get(key) {
  try {
    const client = await getRedisClient();
    const value = await client.get(key);
    
    if (value === null) {
      return null;
    }
    
    return JSON.parse(value);
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error.message);
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>}
 */
async function set(key, value, ttl = DEFAULT_TTL.MEDIUM) {
  try {
    const client = await getRedisClient();
    const serialized = JSON.stringify(value);
    
    if (ttl > 0) {
      await client.setEx(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
    
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function del(key) {
  try {
    const client = await getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache del error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function exists(key) {
  try {
    const client = await getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error(`Cache exists error for key ${key}:`, error.message);
    return false;
  }
}

/**
 * Get or set value (cache-aside pattern)
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>}
 */
async function getOrSet(key, fetchFn, ttl = DEFAULT_TTL.MEDIUM) {
  try {
    // Try to get from cache
    const cached = await get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache the result
    if (data !== null && data !== undefined) {
      await set(key, data, ttl);
    }
    
    return data;
  } catch (error) {
    console.error(`Cache getOrSet error for key ${key}:`, error.message);
    // Fallback to fetch function
    return fetchFn();
  }
}

/**
 * Delete multiple keys by pattern
 * @param {string} pattern - Key pattern (e.g., "cache:product:*")
 * @returns {Promise<number>} Number of deleted keys
 */
async function delByPattern(pattern) {
  try {
    const client = await getRedisClient();
    let cursor = 0;
    let deletedCount = 0;
    
    do {
      const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      
      if (result.keys.length > 0) {
        await client.del(result.keys);
        deletedCount += result.keys.length;
      }
    } while (cursor !== 0);
    
    return deletedCount;
  } catch (error) {
    console.error(`Cache delByPattern error for pattern ${pattern}:`, error.message);
    return 0;
  }
}

/**
 * Set multiple values at once
 * @param {Object} keyValuePairs - Object with key-value pairs
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<boolean>}
 */
async function mset(keyValuePairs, ttl = DEFAULT_TTL.MEDIUM) {
  try {
    const client = await getRedisClient();
    const pipeline = client.multi();
    
    for (const [key, value] of Object.entries(keyValuePairs)) {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        pipeline.setEx(key, ttl, serialized);
      } else {
        pipeline.set(key, serialized);
      }
    }
    
    await pipeline.exec();
    return true;
  } catch (error) {
    console.error('Cache mset error:', error.message);
    return false;
  }
}

/**
 * Get multiple values at once
 * @param {string[]} keys - Array of cache keys
 * @returns {Promise<Object>} Object with key-value pairs
 */
async function mget(keys) {
  try {
    const client = await getRedisClient();
    const values = await client.mGet(keys);
    
    const result = {};
    keys.forEach((key, index) => {
      if (values[index] !== null) {
        result[key] = JSON.parse(values[index]);
      }
    });
    
    return result;
  } catch (error) {
    console.error('Cache mget error:', error.message);
    return {};
  }
}

// ============================================
// PRODUCT CACHE
// ============================================

/**
 * Get cached product
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
async function getProduct(productId) {
  return get(`${CACHE_PREFIX.PRODUCT}${productId}`);
}

/**
 * Set product cache
 * @param {string} productId
 * @param {Object} product
 * @returns {Promise<boolean>}
 */
async function setProduct(productId, product) {
  return set(`${CACHE_PREFIX.PRODUCT}${productId}`, product, DEFAULT_TTL.LONG);
}

/**
 * Invalidate product cache
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
async function invalidateProduct(productId) {
  // Delete product detail cache
  await del(`${CACHE_PREFIX.PRODUCT}${productId}`);
  // Delete all product list caches (they might contain this product)
  await delByPattern(`${CACHE_PREFIX.PRODUCT_LIST}*`);
  return true;
}

/**
 * Get cached product list
 * @param {string} cacheKey - Unique key for this list query
 * @returns {Promise<Object|null>}
 */
async function getProductList(cacheKey) {
  return get(`${CACHE_PREFIX.PRODUCT_LIST}${cacheKey}`);
}

/**
 * Set product list cache
 * @param {string} cacheKey
 * @param {Object} data - List data with pagination
 * @returns {Promise<boolean>}
 */
async function setProductList(cacheKey, data) {
  return set(`${CACHE_PREFIX.PRODUCT_LIST}${cacheKey}`, data, DEFAULT_TTL.MEDIUM);
}

/**
 * Generate product list cache key from query params
 * @param {Object} params - Query parameters
 * @returns {string}
 */
function generateProductListKey(params) {
  const { page = 1, limit = 20, categoryId, search, sort, ...filters } = params;
  const parts = [
    `p${page}`,
    `l${limit}`,
    categoryId ? `c${categoryId}` : '',
    search ? `s${search}` : '',
    sort ? `o${sort}` : '',
    Object.keys(filters).length > 0 ? `f${JSON.stringify(filters)}` : '',
  ].filter(Boolean);
  
  return parts.join(':');
}

// ============================================
// CATEGORY CACHE
// ============================================

/**
 * Get cached category tree
 * @returns {Promise<Object[]|null>}
 */
async function getCategoryTree() {
  return get(CACHE_PREFIX.CATEGORY_TREE);
}

/**
 * Set category tree cache
 * @param {Object[]} tree
 * @returns {Promise<boolean>}
 */
async function setCategoryTree(tree) {
  return set(CACHE_PREFIX.CATEGORY_TREE, tree, DEFAULT_TTL.VERY_LONG);
}

/**
 * Get cached category list
 * @returns {Promise<Object[]|null>}
 */
async function getCategoryList() {
  return get(CACHE_PREFIX.CATEGORY_LIST);
}

/**
 * Set category list cache
 * @param {Object[]} categories
 * @returns {Promise<boolean>}
 */
async function setCategoryList(categories) {
  return set(CACHE_PREFIX.CATEGORY_LIST, categories, DEFAULT_TTL.VERY_LONG);
}

/**
 * Invalidate all category caches
 * @returns {Promise<boolean>}
 */
async function invalidateCategories() {
  await del(CACHE_PREFIX.CATEGORY_TREE);
  await del(CACHE_PREFIX.CATEGORY_LIST);
  await delByPattern(`${CACHE_PREFIX.CATEGORY}*`);
  return true;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
async function getStats() {
  try {
    const client = await getRedisClient();
    const info = await client.info('stats');
    
    // Parse info string
    const stats = {};
    info.split('\r\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });
    
    return {
      hits: parseInt(stats.keyspace_hits) || 0,
      misses: parseInt(stats.keyspace_misses) || 0,
      hitRate: stats.keyspace_hits && stats.keyspace_misses
        ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2) + '%'
        : 'N/A',
    };
  } catch (error) {
    console.error('Cache getStats error:', error.message);
    return { hits: 0, misses: 0, hitRate: 'N/A' };
  }
}

/**
 * Flush all cache (use with caution!)
 * @returns {Promise<boolean>}
 */
async function flushAll() {
  try {
    const client = await getRedisClient();
    await client.flushDb();
    return true;
  } catch (error) {
    console.error('Cache flushAll error:', error.message);
    return false;
  }
}

module.exports = {
  // Basic operations
  get,
  set,
  del,
  exists,
  getOrSet,
  delByPattern,
  mset,
  mget,
  
  // Product cache
  getProduct,
  setProduct,
  invalidateProduct,
  getProductList,
  setProductList,
  generateProductListKey,
  
  // Category cache
  getCategoryTree,
  setCategoryTree,
  getCategoryList,
  setCategoryList,
  invalidateCategories,
  
  // Utilities
  getStats,
  flushAll,
  
  // Constants
  DEFAULT_TTL,
  CACHE_PREFIX,
};
