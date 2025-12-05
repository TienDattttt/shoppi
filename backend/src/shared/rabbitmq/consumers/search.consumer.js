/**
 * Search Index Consumer
 * Handles product events to update Elasticsearch index
 * 
 * Requirements: Event-driven architecture, search index sync
 */

const rabbitmqClient = require('../rabbitmq.client');
const elasticsearchClient = require('../../elasticsearch/elasticsearch.client');

// Event types this consumer handles
const HANDLED_EVENTS = [
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'PRODUCT_STATUS_CHANGED',
  'PRODUCT_INVENTORY_CHANGED',
  'CATEGORY_UPDATED',
];

// Queue name for search events
const QUEUE_NAME = 'search_index_events';

// Elasticsearch index name
const PRODUCT_INDEX = 'products';

/**
 * Initialize search consumer
 */
async function initialize() {
  const channel = await rabbitmqClient.getChannel();
  
  // Assert queue
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  
  // Bind to events exchange
  for (const event of HANDLED_EVENTS) {
    await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.EVENTS, event);
  }
  
  console.log('[SearchConsumer] Initialized, listening for:', HANDLED_EVENTS.join(', '));
}

/**
 * Start consuming search events
 */
async function start() {
  await initialize();
  
  await rabbitmqClient.consume(QUEUE_NAME, async (message) => {
    const { event, data, timestamp } = message;
    
    console.log(`[SearchConsumer] Received event: ${event}`, { productId: data?.productId });
    
    try {
      switch (event) {
        case 'PRODUCT_CREATED':
          await handleProductCreated(data, timestamp);
          break;
        case 'PRODUCT_UPDATED':
          await handleProductUpdated(data, timestamp);
          break;
        case 'PRODUCT_DELETED':
          await handleProductDeleted(data, timestamp);
          break;
        case 'PRODUCT_STATUS_CHANGED':
          await handleProductStatusChanged(data, timestamp);
          break;
        case 'PRODUCT_INVENTORY_CHANGED':
          await handleInventoryChanged(data, timestamp);
          break;
        case 'CATEGORY_UPDATED':
          await handleCategoryUpdated(data, timestamp);
          break;
        default:
          console.warn(`[SearchConsumer] Unknown event: ${event}`);
      }
    } catch (error) {
      console.error(`[SearchConsumer] Error handling ${event}:`, error.message);
      throw error;
    }
  });
}

/**
 * Handle PRODUCT_CREATED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleProductCreated(data, timestamp) {
  const { productId, product } = data;
  
  console.log(`[SearchConsumer] Indexing new product ${productId}`);
  
  try {
    const document = transformProductForIndex(product);
    
    await elasticsearchClient.indexDocument(PRODUCT_INDEX, productId, document);
    
    console.log(`[SearchConsumer] Product ${productId} indexed successfully`);
  } catch (error) {
    console.error(`[SearchConsumer] Failed to index product ${productId}:`, error.message);
    throw error;
  }
}

/**
 * Handle PRODUCT_UPDATED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleProductUpdated(data, timestamp) {
  const { productId, product, updatedFields } = data;
  
  console.log(`[SearchConsumer] Updating product ${productId} in index`);
  
  try {
    // If full product data is provided, re-index
    if (product) {
      const document = transformProductForIndex(product);
      await elasticsearchClient.indexDocument(PRODUCT_INDEX, productId, document);
    } 
    // If only specific fields updated, do partial update
    else if (updatedFields) {
      const partialDoc = transformFieldsForUpdate(updatedFields);
      await elasticsearchClient.updateDocument(PRODUCT_INDEX, productId, partialDoc);
    }
    
    console.log(`[SearchConsumer] Product ${productId} updated in index`);
  } catch (error) {
    console.error(`[SearchConsumer] Failed to update product ${productId}:`, error.message);
    throw error;
  }
}

/**
 * Handle PRODUCT_DELETED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleProductDeleted(data, timestamp) {
  const { productId } = data;
  
  console.log(`[SearchConsumer] Removing product ${productId} from index`);
  
  try {
    await elasticsearchClient.deleteDocument(PRODUCT_INDEX, productId);
    
    console.log(`[SearchConsumer] Product ${productId} removed from index`);
  } catch (error) {
    // Ignore not found errors
    if (error.meta?.statusCode === 404) {
      console.log(`[SearchConsumer] Product ${productId} not found in index, skipping`);
      return;
    }
    console.error(`[SearchConsumer] Failed to delete product ${productId}:`, error.message);
    throw error;
  }
}

/**
 * Handle PRODUCT_STATUS_CHANGED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleProductStatusChanged(data, timestamp) {
  const { productId, status, previousStatus } = data;
  
  console.log(`[SearchConsumer] Updating product ${productId} status: ${previousStatus} -> ${status}`);
  
  try {
    // If product is now inactive/deleted, remove from index
    if (status === 'inactive' || status === 'deleted') {
      await elasticsearchClient.deleteDocument(PRODUCT_INDEX, productId);
      console.log(`[SearchConsumer] Product ${productId} removed (status: ${status})`);
    } 
    // If product is now active, update status in index
    else if (status === 'active') {
      await elasticsearchClient.updateDocument(PRODUCT_INDEX, productId, {
        status,
        isActive: true,
        updatedAt: timestamp,
      });
      console.log(`[SearchConsumer] Product ${productId} status updated to ${status}`);
    }
  } catch (error) {
    console.error(`[SearchConsumer] Failed to update product status:`, error.message);
    throw error;
  }
}

/**
 * Handle PRODUCT_INVENTORY_CHANGED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleInventoryChanged(data, timestamp) {
  const { productId, variantId, quantity, previousQuantity } = data;
  
  console.log(`[SearchConsumer] Updating inventory for product ${productId}`);
  
  try {
    const inStock = quantity > 0;
    
    await elasticsearchClient.updateDocument(PRODUCT_INDEX, productId, {
      inStock,
      stockQuantity: quantity,
      updatedAt: timestamp,
    });
    
    console.log(`[SearchConsumer] Product ${productId} inventory updated (inStock: ${inStock})`);
  } catch (error) {
    console.error(`[SearchConsumer] Failed to update inventory:`, error.message);
    // Don't throw - inventory updates are not critical for search
  }
}

/**
 * Handle CATEGORY_UPDATED event
 * @param {Object} data - Event data
 * @param {string} timestamp - Event timestamp
 */
async function handleCategoryUpdated(data, timestamp) {
  const { categoryId, name, slug, parentId } = data;
  
  console.log(`[SearchConsumer] Category ${categoryId} updated, updating related products`);
  
  try {
    // Update all products in this category
    await elasticsearchClient.updateByQuery(PRODUCT_INDEX, {
      query: {
        term: { categoryId },
      },
      script: {
        source: `
          ctx._source.categoryName = params.name;
          ctx._source.categorySlug = params.slug;
          ctx._source.updatedAt = params.timestamp;
        `,
        params: {
          name,
          slug,
          timestamp,
        },
      },
    });
    
    console.log(`[SearchConsumer] Products in category ${categoryId} updated`);
  } catch (error) {
    console.error(`[SearchConsumer] Failed to update category products:`, error.message);
    // Don't throw - category updates can be retried
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Transform product data for Elasticsearch index
 * @param {Object} product - Product data
 * @returns {Object} - Transformed document
 */
function transformProductForIndex(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.short_description,
    
    // Pricing
    price: product.price,
    originalPrice: product.original_price,
    discountPercent: product.discount_percent,
    
    // Category
    categoryId: product.category_id,
    categoryName: product.category?.name,
    categorySlug: product.category?.slug,
    
    // Shop/Partner
    shopId: product.shop_id,
    shopName: product.shop?.name,
    partnerId: product.partner_id,
    
    // Status
    status: product.status,
    isActive: product.status === 'active',
    inStock: product.stock_quantity > 0,
    stockQuantity: product.stock_quantity,
    
    // Ratings
    avgRating: product.avg_rating || 0,
    totalReviews: product.total_reviews || 0,
    
    // Sales
    totalSold: product.total_sold || 0,
    
    // Images
    thumbnailUrl: product.thumbnail_url,
    images: product.images?.map(img => img.url) || [],
    
    // Attributes for filtering
    attributes: product.attributes || {},
    tags: product.tags || [],
    
    // Variants
    hasVariants: product.variants?.length > 0,
    variantCount: product.variants?.length || 0,
    
    // Timestamps
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    
    // Search optimization
    searchText: [
      product.name,
      product.description,
      product.short_description,
      product.category?.name,
      product.shop?.name,
      ...(product.tags || []),
    ].filter(Boolean).join(' '),
  };
}

/**
 * Transform updated fields for partial update
 * @param {Object} fields - Updated fields
 * @returns {Object} - Transformed fields
 */
function transformFieldsForUpdate(fields) {
  const transformed = {};
  
  const fieldMapping = {
    name: 'name',
    slug: 'slug',
    description: 'description',
    short_description: 'shortDescription',
    price: 'price',
    original_price: 'originalPrice',
    discount_percent: 'discountPercent',
    stock_quantity: 'stockQuantity',
    avg_rating: 'avgRating',
    total_reviews: 'totalReviews',
    total_sold: 'totalSold',
    thumbnail_url: 'thumbnailUrl',
    status: 'status',
  };
  
  for (const [key, value] of Object.entries(fields)) {
    const mappedKey = fieldMapping[key] || key;
    transformed[mappedKey] = value;
  }
  
  // Add derived fields
  if (fields.stock_quantity !== undefined) {
    transformed.inStock = fields.stock_quantity > 0;
  }
  
  if (fields.status !== undefined) {
    transformed.isActive = fields.status === 'active';
  }
  
  transformed.updatedAt = new Date().toISOString();
  
  return transformed;
}

/**
 * Stop consumer
 */
async function stop() {
  console.log('[SearchConsumer] Stopping...');
}

module.exports = {
  initialize,
  start,
  stop,
  QUEUE_NAME,
  HANDLED_EVENTS,
  transformProductForIndex,
  transformFieldsForUpdate,
};
