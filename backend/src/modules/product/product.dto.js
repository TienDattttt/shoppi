/**
 * Product DTOs (Data Transfer Objects)
 * Defines data structures for product operations and serialization
 */

// Fields to exclude from public product responses
const INTERNAL_FIELDS = [
  'deleted_at',
];

// Fields for lightweight search results
const SUMMARY_FIELDS = [
  'id',
  'name',
  'slug',
  'short_description',
  'base_price',
  'compare_at_price',
  'currency',
  'status',
  'avg_rating',
  'review_count',
  'total_sold',
];

/**
 * Serialize product object for API response (full details)
 * @param {object} product - Raw product object from database
 * @returns {object} Serialized product
 */
function serializeProduct(product) {
  if (!product) return null;

  const serialized = {
    id: product.id,
    shopId: product.shop_id,
    categoryId: product.category_id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.short_description,
    basePrice: parseFloat(product.base_price) || 0,
    compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
    currency: product.currency || 'VND',
    status: product.status,
    rejectionReason: product.rejection_reason || null,
    totalSold: product.total_sold || 0,
    viewCount: product.view_count || 0,
    avgRating: parseFloat(product.avg_rating) || 0,
    reviewCount: product.review_count || 0,
    metaTitle: product.meta_title || null,
    metaDescription: product.meta_description || null,
    createdAt: product.created_at ? new Date(product.created_at).toISOString() : null,
    updatedAt: product.updated_at ? new Date(product.updated_at).toISOString() : null,
    publishedAt: product.published_at ? new Date(product.published_at).toISOString() : null,
  };

  // Include variants if present
  if (product.variants) {
    serialized.variants = product.variants.map(serializeVariant);
  }

  // Include images if present
  if (product.images) {
    serialized.images = product.images.map(serializeImage);
  }

  // Include category if present
  if (product.category) {
    serialized.category = serializeCategory(product.category);
  }

  // Include shop if present
  if (product.shop) {
    serialized.shop = {
      id: product.shop.id,
      shop_name: product.shop.shop_name,
      name: product.shop.shop_name, // alias for compatibility
      slug: product.shop.slug,
      logo_url: product.shop.logo_url,
      banner_url: product.shop.banner_url,
      rating: product.shop.avg_rating || product.shop.rating || 0,
      avg_rating: product.shop.avg_rating || product.shop.rating || 0,
      follower_count: product.shop.follower_count || 0,
      product_count: product.shop.product_count || 0,
      city: product.shop.city,
      address: product.shop.address,
      created_at: product.shop.created_at,
    };
  }

  return serialized;
}


/**
 * Serialize product for search results (lightweight)
 * @param {object} product - Raw product object from database
 * @returns {object} Serialized product summary
 */
function serializeProductSummary(product) {
  if (!product) return null;

  const serialized = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.short_description || null,
    basePrice: parseFloat(product.base_price) || 0,
    compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
    currency: product.currency || 'VND',
    status: product.status,
    avgRating: parseFloat(product.avg_rating) || 0,
    reviewCount: product.review_count || 0,
    totalSold: product.total_sold || 0,
    // Include all images for frontend
    images: product.images ? product.images.map(serializeImage) : [],
  };

  // Include primary image URL for convenience
  if (product.images && product.images.length > 0) {
    const primaryImage = product.images.find(img => img.is_primary) || product.images[0];
    serialized.imageUrl = primaryImage.url;
  } else if (product.primary_image_url) {
    serialized.imageUrl = product.primary_image_url;
  }

  return serialized;
}

/**
 * Serialize variant object
 * @param {object} variant - Raw variant object from database
 * @returns {object} Serialized variant
 */
function serializeVariant(variant) {
  if (!variant) return null;

  return {
    id: variant.id,
    productId: variant.product_id,
    sku: variant.sku,
    name: variant.name || null,
    attributes: variant.attributes || {},
    price: variant.price ? parseFloat(variant.price) : null,
    compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
    quantity: variant.quantity || 0,
    reservedQuantity: variant.reserved_quantity || 0,
    availableQuantity: (variant.quantity || 0) - (variant.reserved_quantity || 0),
    lowStockThreshold: variant.low_stock_threshold || 10,
    imageUrl: variant.image_url || null,
    isActive: variant.is_active !== false,
    createdAt: variant.created_at ? new Date(variant.created_at).toISOString() : null,
    updatedAt: variant.updated_at ? new Date(variant.updated_at).toISOString() : null,
  };
}

/**
 * Serialize image object
 * @param {object} image - Raw image object from database
 * @returns {object} Serialized image
 */
function serializeImage(image) {
  if (!image) return null;

  return {
    id: image.id,
    url: image.url,
    altText: image.alt_text || null,
    sortOrder: image.sort_order || 0,
    isPrimary: image.is_primary || false,
    width: image.width || null,
    height: image.height || null,
    format: image.format || null,
  };
}

/**
 * Serialize category object
 * @param {object} category - Raw category object from database
 * @returns {object} Serialized category
 */
function serializeCategory(category) {
  if (!category) return null;

  return {
    id: category.id,
    parentId: category.parent_id || null,
    name: category.name,
    slug: category.slug,
    description: category.description || null,
    imageUrl: category.image_url || null,
    level: category.level || 1,
    path: category.path || null,
  };
}

/**
 * Serialize review object
 * @param {object} review - Raw review object from database
 * @returns {object} Serialized review
 */
function serializeReview(review) {
  if (!review) return null;

  return {
    id: review.id,
    productId: review.product_id,
    userId: review.user_id,
    rating: review.rating,
    title: review.title || null,
    content: review.content || null,
    isVerifiedPurchase: review.is_verified_purchase || false,
    reply: review.reply || null,
    repliedAt: review.replied_at ? new Date(review.replied_at).toISOString() : null,
    helpfulCount: review.helpful_count || 0,
    createdAt: review.created_at ? new Date(review.created_at).toISOString() : null,
    // Include user info if present
    user: review.user ? {
      id: review.user.id,
      fullName: review.user.full_name,
      avatarUrl: review.user.avatar_url,
    } : null,
  };
}

/**
 * Serialize wishlist item
 * @param {object} wishlistItem - Raw wishlist item from database
 * @returns {object} Serialized wishlist item
 */
function serializeWishlistItem(wishlistItem) {
  if (!wishlistItem) return null;

  return {
    id: wishlistItem.id,
    productId: wishlistItem.product_id,
    priceAtAdd: wishlistItem.price_at_add ? parseFloat(wishlistItem.price_at_add) : null,
    createdAt: wishlistItem.created_at ? new Date(wishlistItem.created_at).toISOString() : null,
    product: wishlistItem.product ? serializeProductSummary(wishlistItem.product) : null,
  };
}


/**
 * Deserialize product data from API request
 * @param {object} data - Product data from API request
 * @returns {object} Database-ready product object
 */
function deserializeProduct(data) {
  if (!data) return null;

  const deserialized = {};

  const fieldMapping = {
    id: 'id',
    shopId: 'shop_id',
    categoryId: 'category_id',
    name: 'name',
    slug: 'slug',
    description: 'description',
    shortDescription: 'short_description',
    basePrice: 'base_price',
    compareAtPrice: 'compare_at_price',
    currency: 'currency',
    status: 'status',
    rejectionReason: 'rejection_reason',
    metaTitle: 'meta_title',
    metaDescription: 'meta_description',
  };

  for (const [camelKey, snakeKey] of Object.entries(fieldMapping)) {
    if (data[camelKey] !== undefined) {
      deserialized[snakeKey] = data[camelKey];
    }
  }

  return deserialized;
}

/**
 * Deserialize variant data from API request
 * @param {object} data - Variant data from API request
 * @returns {object} Database-ready variant object
 */
function deserializeVariant(data) {
  if (!data) return null;

  const deserialized = {};

  const fieldMapping = {
    id: 'id',
    productId: 'product_id',
    sku: 'sku',
    name: 'name',
    attributes: 'attributes',
    price: 'price',
    compareAtPrice: 'compare_at_price',
    quantity: 'quantity',
    lowStockThreshold: 'low_stock_threshold',
    imageUrl: 'image_url',
    isActive: 'is_active',
  };

  for (const [camelKey, snakeKey] of Object.entries(fieldMapping)) {
    if (data[camelKey] !== undefined) {
      deserialized[snakeKey] = data[camelKey];
    }
  }

  return deserialized;
}

/**
 * Serialize paginated results
 * @param {object[]} items - Array of items
 * @param {function} serializer - Serializer function for items
 * @param {object} pagination - Pagination info
 * @returns {object} Paginated response
 */
function serializePaginatedResult(items, serializer, pagination) {
  return {
    data: items.map(serializer),
    pagination: {
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 20,
      totalItems: pagination.totalItems || 0,
      totalPages: Math.ceil((pagination.totalItems || 0) / (pagination.pageSize || 20)),
      hasNextPage: (pagination.page || 1) < Math.ceil((pagination.totalItems || 0) / (pagination.pageSize || 20)),
      hasPrevPage: (pagination.page || 1) > 1,
    },
  };
}

module.exports = {
  INTERNAL_FIELDS,
  SUMMARY_FIELDS,
  // Product serialization
  serializeProduct,
  serializeProductSummary,
  deserializeProduct,
  // Variant serialization
  serializeVariant,
  deserializeVariant,
  // Other serializers
  serializeImage,
  serializeCategory,
  serializeReview,
  serializeWishlistItem,
  serializePaginatedResult,
};
