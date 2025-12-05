/**
 * Elasticsearch Client
 * Initializes and exports Elasticsearch client for product search
 */

const { Client } = require('@elastic/elasticsearch');
const config = require('../../config');

// Elasticsearch configuration
const esConfig = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_API_KEY ? {
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  } : undefined,
  tls: process.env.ELASTICSEARCH_TLS === 'true' ? {
    rejectUnauthorized: false,
  } : undefined,
};

// Create client instance
let esClient = null;

try {
  esClient = new Client(esConfig);
} catch (error) {
  console.warn('Warning: Elasticsearch client initialization failed:', error.message);
}

// Product index name
const PRODUCT_INDEX = 'products';

// Product index mapping
const PRODUCT_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    shop_id: { type: 'keyword' },
    category_id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'standard',
      fields: {
        keyword: { type: 'keyword' },
        suggest: { type: 'completion' },
      },
    },
    slug: { type: 'keyword' },
    description: { type: 'text', analyzer: 'standard' },
    short_description: { type: 'text', analyzer: 'standard' },
    base_price: { type: 'float' },
    compare_at_price: { type: 'float' },
    currency: { type: 'keyword' },
    status: { type: 'keyword' },
    total_sold: { type: 'integer' },
    view_count: { type: 'integer' },
    avg_rating: { type: 'float' },
    review_count: { type: 'integer' },
    category_path: { type: 'keyword' },
    category_name: { type: 'keyword' },
    shop_name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
    tags: { type: 'keyword' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    published_at: { type: 'date' },
  },
};


/**
 * Initialize product index
 * @returns {Promise<void>}
 */
async function initializeIndex() {
  if (!esClient) {
    console.warn('Elasticsearch client not available');
    return;
  }

  try {
    const indexExists = await esClient.indices.exists({ index: PRODUCT_INDEX });
    
    if (!indexExists) {
      await esClient.indices.create({
        index: PRODUCT_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                vietnamese: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding'],
                },
              },
            },
          },
          mappings: PRODUCT_MAPPING,
        },
      });
      console.log(`Created Elasticsearch index: ${PRODUCT_INDEX}`);
    }
  } catch (error) {
    console.error('Failed to initialize Elasticsearch index:', error.message);
  }
}

/**
 * Check if Elasticsearch is available
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  if (!esClient) return false;
  
  try {
    await esClient.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get cluster health
 * @returns {Promise<object>}
 */
async function getHealth() {
  if (!esClient) {
    return { status: 'unavailable' };
  }
  
  try {
    const health = await esClient.cluster.health();
    return health;
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

module.exports = {
  esClient,
  PRODUCT_INDEX,
  PRODUCT_MAPPING,
  initializeIndex,
  isAvailable,
  getHealth,
};
