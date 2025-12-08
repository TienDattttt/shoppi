/**
 * Shop Service
 * Business logic for shop operations
 * 
 * Requirements: 1.1, 1.2, 3.1, 3.2, 4.1
 */

const shopRepository = require('./shop.repository');
const { validateCreateShop, validateUpdateShop } = require('./shop.validator');
const { geocode } = require('../../shared/google-maps/maps.client');
const { uploadShopImage, BUCKETS } = require('../../shared/supabase/storage.client');
const { AppError, NotFoundError, ValidationError, AuthorizationError, ConflictError } = require('../../shared/utils/error.util');
const rabbitmq = require('../../shared/rabbitmq/rabbitmq.client');

// ============================================
// EVENT PUBLISHING (Decoupled from Notification Module)
// ============================================

/**
 * Publish shop event to RabbitMQ
 * @param {string} eventType - Event type (approved, rejected, revision_required)
 * @param {object} data - Event data
 */
async function publishShopEvent(eventType, data) {
  try {
    await rabbitmq.publishToExchange(
      rabbitmq.EXCHANGES.EVENTS,
      `shop.${eventType}`,
      {
        event: `shop.${eventType}`,
        ...data,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error(`Failed to publish shop.${eventType} event:`, error.message);
  }
}

// ============================================
// ERROR CODES
// ============================================

const SHOP_ERRORS = {
  NOT_FOUND: { code: 'SHOP_001', message: 'Shop not found', statusCode: 404 },
  NAME_EXISTS: { code: 'SHOP_002', message: 'Shop name already exists', statusCode: 409 },
  VALIDATION_ERROR: { code: 'SHOP_003', message: 'Shop validation error', statusCode: 400 },
  NOT_ACTIVE: { code: 'SHOP_004', message: 'Shop is not active', statusCode: 403 },
  UNAUTHORIZED: { code: 'SHOP_005', message: 'Not authorized to perform this action', statusCode: 403 },
  PARTNER_HAS_SHOP: { code: 'SHOP_006', message: 'Partner already has a shop', statusCode: 409 },
  GEOCODING_FAILED: { code: 'GEO_001', message: 'Failed to geocode address', statusCode: 400 },
  INVALID_STATUS_TRANSITION: { code: 'SHOP_007', message: 'Invalid status transition', statusCode: 400 },
};

// Valid status transitions for admin operations
const VALID_STATUS_TRANSITIONS = {
  pending: ['active', 'rejected', 'revision_required'],
  revision_required: ['active', 'rejected', 'pending'],
};

// Critical fields that require re-approval when changed
const CRITICAL_FIELDS = ['shop_name', 'address'];

// ============================================
// HELPERS
// ============================================

/**
 * Generate slug from shop name
 * @param {string} name
 * @returns {string}
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate unique slug for shop
 * @param {string} name
 * @param {string} excludeId - Shop ID to exclude from uniqueness check
 * @returns {Promise<string>}
 */
async function generateUniqueSlug(name, excludeId = null) {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (await shopRepository.slugExists(slug, excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate shop ownership
 * @param {object} shop
 * @param {string} partnerId
 * @throws {AuthorizationError}
 */
function validateOwnership(shop, partnerId) {
  if (shop.partner_id !== partnerId) {
    throw new AuthorizationError(SHOP_ERRORS.UNAUTHORIZED.code, SHOP_ERRORS.UNAUTHORIZED.message);
  }
}

/**
 * Geocode address and return coordinates
 * @param {string} address
 * @returns {Promise<{lat: number, lng: number}|null>}
 */
async function geocodeAddress(address) {
  try {
    const result = await geocode(address);
    if (result) {
      return {
        lat: result.lat,
        lng: result.lng,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

// ============================================
// SHOP REGISTRATION (Requirement 1.1, 1.2)
// ============================================

/**
 * Create a new shop
 * @param {string} partnerId - Partner user ID
 * @param {object} shopData - Shop registration data
 * @returns {Promise<object>} Created shop
 */
async function createShop(partnerId, shopData) {
  // Validate input data
  const validation = validateCreateShop(shopData);
  if (!validation.isValid) {
    throw new ValidationError(SHOP_ERRORS.VALIDATION_ERROR.message, validation.errors);
  }

  const validatedData = validation.data;

  // Check if partner already has a shop
  const existingShop = await shopRepository.partnerHasShop(partnerId);
  if (existingShop) {
    throw new ConflictError(SHOP_ERRORS.PARTNER_HAS_SHOP.code, SHOP_ERRORS.PARTNER_HAS_SHOP.message);
  }

  // Check if shop name already exists (case-insensitive)
  const nameExists = await shopRepository.shopNameExists(validatedData.shop_name);
  if (nameExists) {
    throw new ConflictError(SHOP_ERRORS.NAME_EXISTS.code, SHOP_ERRORS.NAME_EXISTS.message);
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(validatedData.shop_name);

  // Geocode address to get coordinates (Requirement 1.2)
  let coordinates = { lat: null, lng: null };
  if (validatedData.address) {
    const fullAddress = [
      validatedData.address,
      validatedData.ward,
      validatedData.district,
      validatedData.city,
    ].filter(Boolean).join(', ');

    const geocodeResult = await geocodeAddress(fullAddress);
    if (geocodeResult) {
      coordinates = geocodeResult;
    }
  }

  // Create shop with pending status
  const shop = await shopRepository.createShop({
    partner_id: partnerId,
    shop_name: validatedData.shop_name,
    slug,
    description: validatedData.description || null,
    phone: validatedData.phone,
    email: validatedData.email || null,
    address: validatedData.address,
    city: validatedData.city || null,
    district: validatedData.district || null,
    ward: validatedData.ward || null,
    lat: coordinates.lat,
    lng: coordinates.lng,
    logo_url: validatedData.logo_url || null,
    banner_url: validatedData.banner_url || null,
    operating_hours: validatedData.operating_hours || null,
    category_ids: validatedData.category_ids || [],
    status: 'pending', // Always pending for new shops
  });

  return shop;
}

// ============================================
// SHOP RETRIEVAL (Requirement 4.1)
// ============================================

/**
 * Get shop by ID
 * @param {string} shopId
 * @returns {Promise<object>}
 */
async function getShopById(shopId) {
  const shop = await shopRepository.findShopById(shopId);

  if (!shop) {
    throw new NotFoundError(SHOP_ERRORS.NOT_FOUND.message);
  }

  return shop;
}

/**
 * Get shop by partner ID
 * @param {string} partnerId
 * @returns {Promise<object>}
 */
async function getShopByPartnerId(partnerId) {
  const shop = await shopRepository.findShopByPartnerId(partnerId);

  if (!shop) {
    throw new NotFoundError(SHOP_ERRORS.NOT_FOUND.message);
  }

  return shop;
}

/**
 * Get shop by slug
 * @param {string} slug
 * @returns {Promise<object>}
 */
async function getShopBySlug(slug) {
  const shop = await shopRepository.findShopBySlug(slug);

  if (!shop) {
    throw new NotFoundError(SHOP_ERRORS.NOT_FOUND.message);
  }

  return shop;
}

/**
 * Get shop profile for public view (only active shops)
 * @param {string} shopId
 * @returns {Promise<object>}
 */
async function getShopProfile(shopId) {
  const shop = await getShopById(shopId);

  if (shop.status !== 'active') {
    throw new AppError(SHOP_ERRORS.NOT_ACTIVE.code, SHOP_ERRORS.NOT_ACTIVE.message, SHOP_ERRORS.NOT_ACTIVE.statusCode);
  }

  return shop;
}

// ============================================
// SHOP UPDATE (Requirement 3.1, 3.2)
// ============================================

/**
 * Update shop information
 * @param {string} shopId
 * @param {string} partnerId - For ownership validation
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateShop(shopId, partnerId, updateData) {
  // Get existing shop
  const shop = await getShopById(shopId);
  
  // Validate ownership
  validateOwnership(shop, partnerId);

  // Validate update data
  const validation = validateUpdateShop(updateData);
  if (!validation.isValid) {
    throw new ValidationError(SHOP_ERRORS.VALIDATION_ERROR.message, validation.errors);
  }

  const validatedData = validation.data;
  const updates = {};

  // Check if shop name is being changed
  if (validatedData.shop_name && validatedData.shop_name !== shop.shop_name) {
    // Check if new name already exists
    const nameExists = await shopRepository.shopNameExists(validatedData.shop_name, shopId);
    if (nameExists) {
      throw new ConflictError(SHOP_ERRORS.NAME_EXISTS.code, SHOP_ERRORS.NAME_EXISTS.message);
    }
    updates.shop_name = validatedData.shop_name;
    updates.slug = await generateUniqueSlug(validatedData.shop_name, shopId);
  }

  // Check if address is being changed (Requirement 3.2)
  const addressChanged = validatedData.address && validatedData.address !== shop.address;
  if (addressChanged || validatedData.city || validatedData.district || validatedData.ward) {
    // Build full address for geocoding
    const fullAddress = [
      validatedData.address || shop.address,
      validatedData.ward || shop.ward,
      validatedData.district || shop.district,
      validatedData.city || shop.city,
    ].filter(Boolean).join(', ');

    // Recalculate coordinates
    const geocodeResult = await geocodeAddress(fullAddress);
    if (geocodeResult) {
      updates.lat = geocodeResult.lat;
      updates.lng = geocodeResult.lng;
    }
  }

  // Copy other validated fields
  const allowedFields = [
    'description', 'phone', 'email', 'address', 'city', 'district', 'ward',
    'logo_url', 'banner_url', 'operating_hours', 'category_ids'
  ];

  for (const field of allowedFields) {
    if (validatedData[field] !== undefined) {
      updates[field] = validatedData[field];
    }
  }

  // Check if critical fields changed - require re-approval (Requirement 3.5)
  const criticalFieldsChanged = CRITICAL_FIELDS.some(field => 
    updates[field] !== undefined && updates[field] !== shop[field]
  );

  if (criticalFieldsChanged && shop.status === 'active') {
    updates.status = 'pending';
  }

  // If no updates, return existing shop
  if (Object.keys(updates).length === 0) {
    return shop;
  }

  // Perform update
  const updatedShop = await shopRepository.updateShop(shopId, updates);

  return updatedShop;
}

// ============================================
// ADMIN OPERATIONS (Requirement 2.1, 2.2, 2.3, 2.4, 2.5)
// ============================================

/**
 * Validate status transition
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {boolean}
 */
function isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(newStatus);
}

/**
 * Get pending shops for admin review (Requirement 2.1)
 * @param {object} pagination - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getPendingShops(pagination = {}) {
  return shopRepository.findPendingShops(pagination);
}

/**
 * Approve a shop (Requirement 2.2)
 * Changes status to 'active' and notifies partner via email and SMS
 * @param {string} shopId - Shop ID
 * @param {string} adminId - Admin user ID
 * @returns {Promise<object>} Updated shop
 */
async function approveShop(shopId, adminId) {
  const shop = await getShopById(shopId);

  // Validate status transition
  if (!isValidStatusTransition(shop.status, 'active')) {
    throw new AppError(
      SHOP_ERRORS.INVALID_STATUS_TRANSITION.code,
      `Cannot approve shop with status '${shop.status}'`,
      SHOP_ERRORS.INVALID_STATUS_TRANSITION.statusCode
    );
  }

  // Update shop status
  const updatedShop = await shopRepository.updateShop(shopId, {
    status: 'active',
    approved_at: new Date().toISOString(),
    approved_by: adminId,
    rejection_reason: null, // Clear any previous rejection reason
  });

  // Publish shop approved event (decoupled from notification module)
  await publishShopEvent('approved', {
    shopId,
    partnerId: shop.partner_id,
    shopName: shop.shop_name,
  });

  return updatedShop;
}

/**
 * Reject a shop (Requirement 2.3)
 * Changes status to 'rejected' and notifies partner with rejection reason
 * @param {string} shopId - Shop ID
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<object>} Updated shop
 */
async function rejectShop(shopId, adminId, reason) {
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throw new ValidationError('Rejection reason is required');
  }

  const shop = await getShopById(shopId);

  // Validate status transition
  if (!isValidStatusTransition(shop.status, 'rejected')) {
    throw new AppError(
      SHOP_ERRORS.INVALID_STATUS_TRANSITION.code,
      `Cannot reject shop with status '${shop.status}'`,
      SHOP_ERRORS.INVALID_STATUS_TRANSITION.statusCode
    );
  }

  // Update shop status
  const updatedShop = await shopRepository.updateShop(shopId, {
    status: 'rejected',
    rejection_reason: reason.trim(),
    approved_at: null,
    approved_by: null,
  });

  // Publish shop rejected event (decoupled from notification module)
  await publishShopEvent('rejected', {
    shopId,
    partnerId: shop.partner_id,
    shopName: shop.shop_name,
    reason: reason.trim(),
  });

  return updatedShop;
}

/**
 * Request revision for a shop (Requirement 2.4)
 * Changes status to 'revision_required' and notifies partner with required changes
 * @param {string} shopId - Shop ID
 * @param {string} adminId - Admin user ID
 * @param {string} changes - Required changes description
 * @returns {Promise<object>} Updated shop
 */
async function requestRevision(shopId, adminId, changes) {
  if (!changes || typeof changes !== 'string' || changes.trim().length === 0) {
    throw new ValidationError('Required changes description is required');
  }

  const shop = await getShopById(shopId);

  // Validate status transition
  if (!isValidStatusTransition(shop.status, 'revision_required')) {
    throw new AppError(
      SHOP_ERRORS.INVALID_STATUS_TRANSITION.code,
      `Cannot request revision for shop with status '${shop.status}'`,
      SHOP_ERRORS.INVALID_STATUS_TRANSITION.statusCode
    );
  }

  // Update shop status
  const updatedShop = await shopRepository.updateShop(shopId, {
    status: 'revision_required',
    rejection_reason: changes.trim(), // Store required changes in rejection_reason field
    approved_at: null,
    approved_by: null,
  });

  // Publish shop revision required event (decoupled from notification module)
  await publishShopEvent('revision_required', {
    shopId,
    partnerId: shop.partner_id,
    shopName: shop.shop_name,
    requiredChanges: changes.trim(),
  });

  return updatedShop;
}

// ============================================
// PUBLIC OPERATIONS
// ============================================

/**
 * Get active shops with filters
 * @param {object} filters - Filter options
 * @param {object} pagination - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getActiveShops(filters = {}, pagination = {}) {
  return shopRepository.findActiveShops(filters, pagination);
}

/**
 * Search shops
 * @param {string} query - Search query
 * @param {object} filters - Additional filters
 * @param {object} pagination - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function searchShops(query, filters = {}, pagination = {}) {
  return shopRepository.searchShops(query, filters, pagination);
}

// ============================================
// IMAGE OPERATIONS
// ============================================

/**
 * Upload shop logo
 * @param {string} shopId
 * @param {string} partnerId - For ownership validation
 * @param {Buffer} imageData
 * @param {string} contentType
 * @returns {Promise<object>}
 */
async function uploadLogo(shopId, partnerId, imageData, contentType) {
  const shop = await getShopById(shopId);
  validateOwnership(shop, partnerId);

  let logoUrl;
  try {
    const result = await uploadShopImage(shopId, 'logo', imageData, contentType);
    logoUrl = result.url;
  } catch (uploadError) {
    console.error('Storage upload failed, using data URL fallback:', uploadError.message);
    // Fallback: convert to base64 data URL for development
    const base64 = imageData.toString('base64');
    logoUrl = `data:${contentType};base64,${base64}`;
  }
  
  await shopRepository.updateShop(shopId, { logo_url: logoUrl });

  return { logoUrl };
}

/**
 * Upload shop banner
 * @param {string} shopId
 * @param {string} partnerId - For ownership validation
 * @param {Buffer} imageData
 * @param {string} contentType
 * @returns {Promise<object>}
 */
async function uploadBanner(shopId, partnerId, imageData, contentType) {
  const shop = await getShopById(shopId);
  validateOwnership(shop, partnerId);

  let bannerUrl;
  try {
    const result = await uploadShopImage(shopId, 'banner', imageData, contentType);
    bannerUrl = result.url;
  } catch (uploadError) {
    console.error('Storage upload failed, using data URL fallback:', uploadError.message);
    // Fallback: convert to base64 data URL for development
    const base64 = imageData.toString('base64');
    bannerUrl = `data:${contentType};base64,${base64}`;
  }
  
  await shopRepository.updateShop(shopId, { banner_url: bannerUrl });

  return { bannerUrl };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Helpers
  generateSlug,
  generateUniqueSlug,
  validateOwnership,
  geocodeAddress,
  isValidStatusTransition,
  
  // Error codes
  SHOP_ERRORS,
  CRITICAL_FIELDS,
  VALID_STATUS_TRANSITIONS,
  
  // Shop registration
  createShop,
  
  // Shop retrieval
  getShopById,
  getShopByPartnerId,
  getShopBySlug,
  getShopProfile,
  
  // Shop update
  updateShop,
  
  // Admin operations
  getPendingShops,
  approveShop,
  rejectShop,
  requestRevision,
  
  // Public operations
  getActiveShops,
  searchShops,
  
  // Image operations
  uploadLogo,
  uploadBanner,
};
