/**
 * Shop DTOs (Data Transfer Objects)
 * Defines data structures for shop operations and serialization
 */

// Sensitive fields that should never be exposed to customers
const SENSITIVE_FIELDS = [
  'partner_id',
  'approved_by',
  'rejection_reason',
  'response_rate',
];

// Internal analytics fields excluded from customer view
const INTERNAL_ANALYTICS_FIELDS = [
  'revenue',
  'total_orders',
  'conversion_rate',
  'internal_notes',
];

// Fields for lightweight shop list results
const SUMMARY_FIELDS = [
  'id',
  'shop_name',
  'slug',
  'logo_url',
  'city',
  'district',
  'avg_rating',
  'review_count',
  'follower_count',
  'product_count',
  'status',
];

/**
 * Serialize shop object for API response (full details - Partner/Admin view)
 * @param {object} shop - Raw shop object from database
 * @returns {object|null} Serialized shop
 */
function serializeShop(shop) {
  if (!shop) return null;

  return {
    id: shop.id,
    partnerId: shop.partner_id,
    shopName: shop.shop_name,
    slug: shop.slug,
    description: shop.description || null,
    phone: shop.phone || null,
    email: shop.email || null,
    address: shop.address || null,
    city: shop.city || null,
    district: shop.district || null,
    ward: shop.ward || null,
    lat: shop.lat ? parseFloat(shop.lat) : null,
    lng: shop.lng ? parseFloat(shop.lng) : null,
    logoUrl: shop.logo_url || null,
    bannerUrl: shop.banner_url || null,
    operatingHours: shop.operating_hours || null,
    followerCount: shop.follower_count || 0,
    productCount: shop.product_count || 0,
    avgRating: shop.avg_rating ? parseFloat(shop.avg_rating) : 0,
    reviewCount: shop.review_count || 0,
    responseRate: shop.response_rate ? parseFloat(shop.response_rate) : 0,
    status: shop.status,
    rejectionReason: shop.rejection_reason || null,
    categoryIds: shop.category_ids || [],
    createdAt: shop.created_at ? new Date(shop.created_at).toISOString() : null,
    updatedAt: shop.updated_at ? new Date(shop.updated_at).toISOString() : null,
    approvedAt: shop.approved_at ? new Date(shop.approved_at).toISOString() : null,
    approvedBy: shop.approved_by || null,
  };
}


/**
 * Serialize shop for Customer view (excludes sensitive Partner internal data)
 * @param {object} shop - Raw shop object from database
 * @returns {object|null} Serialized shop for customer
 */
function serializeShopForCustomer(shop) {
  if (!shop) return null;

  // Only return active shops to customers
  if (shop.status !== 'active') {
    return null;
  }

  return {
    id: shop.id,
    shopName: shop.shop_name,
    slug: shop.slug,
    description: shop.description || null,
    phone: shop.phone || null,
    email: shop.email || null,
    address: shop.address || null,
    city: shop.city || null,
    district: shop.district || null,
    ward: shop.ward || null,
    lat: shop.lat ? parseFloat(shop.lat) : null,
    lng: shop.lng ? parseFloat(shop.lng) : null,
    logoUrl: shop.logo_url || null,
    bannerUrl: shop.banner_url || null,
    operatingHours: shop.operating_hours || null,
    followerCount: shop.follower_count || 0,
    productCount: shop.product_count || 0,
    avgRating: shop.avg_rating ? parseFloat(shop.avg_rating) : 0,
    reviewCount: shop.review_count || 0,
    categoryIds: shop.category_ids || [],
    createdAt: shop.created_at ? new Date(shop.created_at).toISOString() : null,
  };
}

/**
 * Serialize shop summary for list views
 * @param {object} shop - Raw shop object from database
 * @returns {object|null} Serialized shop summary
 */
function serializeShopSummary(shop) {
  if (!shop) return null;

  return {
    id: shop.id,
    shopName: shop.shop_name,
    slug: shop.slug,
    logoUrl: shop.logo_url || null,
    city: shop.city || null,
    district: shop.district || null,
    avgRating: shop.avg_rating ? parseFloat(shop.avg_rating) : 0,
    reviewCount: shop.review_count || 0,
    followerCount: shop.follower_count || 0,
    productCount: shop.product_count || 0,
    status: shop.status,
  };
}

/**
 * Serialize shop list with pagination metadata
 * @param {object[]} shops - Array of raw shop objects
 * @param {object} pagination - Pagination info { page, pageSize, totalItems }
 * @param {boolean} forCustomer - Whether to use customer serialization
 * @returns {object} Serialized shop list with pagination
 */
function serializeShopList(shops, pagination = {}, forCustomer = false) {
  const { page = 1, pageSize = 20, totalItems = 0 } = pagination;
  const serializer = forCustomer ? serializeShopForCustomer : serializeShopSummary;
  
  const serializedShops = (shops || [])
    .map(serializer)
    .filter(shop => shop !== null);

  return {
    data: serializedShops,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
      hasNextPage: page < Math.ceil(totalItems / pageSize),
      hasPrevPage: page > 1,
    },
  };
}


/**
 * Deserialize shop data from API request
 * Converts camelCase to snake_case for database
 * @param {object} data - Shop data from API request
 * @returns {object|null} Database-ready shop object
 */
function deserializeShop(data) {
  if (!data) return null;

  const deserialized = {};

  const fieldMapping = {
    id: 'id',
    partnerId: 'partner_id',
    shopName: 'shop_name',
    slug: 'slug',
    description: 'description',
    phone: 'phone',
    email: 'email',
    address: 'address',
    city: 'city',
    district: 'district',
    ward: 'ward',
    lat: 'lat',
    lng: 'lng',
    logoUrl: 'logo_url',
    bannerUrl: 'banner_url',
    operatingHours: 'operating_hours',
    categoryIds: 'category_ids',
    status: 'status',
    rejectionReason: 'rejection_reason',
  };

  for (const [camelKey, snakeKey] of Object.entries(fieldMapping)) {
    if (data[camelKey] !== undefined) {
      deserialized[snakeKey] = data[camelKey];
    }
  }

  return deserialized;
}

/**
 * Check if a field is sensitive (should not be exposed to customers)
 * @param {string} field - Field name (snake_case)
 * @returns {boolean}
 */
function isSensitiveField(field) {
  return SENSITIVE_FIELDS.includes(field) || INTERNAL_ANALYTICS_FIELDS.includes(field);
}

/**
 * Remove sensitive fields from shop object
 * @param {object} shop - Shop object
 * @returns {object} Shop object without sensitive fields
 */
function removeSensitiveFields(shop) {
  if (!shop) return null;

  const cleaned = { ...shop };
  
  for (const field of [...SENSITIVE_FIELDS, ...INTERNAL_ANALYTICS_FIELDS]) {
    delete cleaned[field];
  }

  return cleaned;
}

module.exports = {
  SENSITIVE_FIELDS,
  INTERNAL_ANALYTICS_FIELDS,
  SUMMARY_FIELDS,
  serializeShop,
  serializeShopForCustomer,
  serializeShopSummary,
  serializeShopList,
  deserializeShop,
  isSensitiveField,
  removeSensitiveFields,
};
