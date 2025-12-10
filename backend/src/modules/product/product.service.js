/**
 * Product Service
 * Business logic for product operations
 */

const productRepository = require('./product.repository');
const categoryRepository = require('./category.repository');
const { AppError, NotFoundError, ValidationError, AuthorizationError } = require('../../shared/utils/error.util');
const rabbitmq = require('../../shared/rabbitmq/rabbitmq.client');

/**
 * Publish product event to RabbitMQ
 * @param {string} eventType - created, updated, deleted
 * @param {Object} product - Product data
 */
async function publishProductEvent(eventType, product) {
  try {
    await rabbitmq.publishToExchange(
      rabbitmq.EXCHANGES.EVENTS,
      `product.${eventType}`,
      {
        event: `product.${eventType}`,
        productId: product.id,
        shopId: product.shop_id,
        name: product.name,
        slug: product.slug,
        categoryId: product.category_id,
        status: product.status,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error(`Failed to publish product.${eventType} event:`, error.message);
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Generate slug from name
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
 * Generate unique slug for product
 * @param {string} name
 * @param {string} excludeId
 * @returns {Promise<string>}
 */
async function generateUniqueSlug(name, excludeId = null) {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (await productRepository.slugExists(slug, excludeId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate product ownership
 * @param {object} product
 * @param {string} shopId
 * @throws {AuthorizationError}
 */
function validateOwnership(product, shopId) {
  if (product.shop_id !== shopId) {
    throw new AuthorizationError('PRODUCT_UNAUTHORIZED', 'You do not have permission to modify this product');
  }
}


// ============================================
// PRODUCT OPERATIONS
// ============================================

/**
 * Create a new product
 * Products are created with 'pending' status awaiting admin approval
 * @param {string} shopId - Shop ID (Partner's shop)
 * @param {object} data - Product data
 * @returns {Promise<object>} Created product
 */
async function createProduct(shopId, data) {
  const { 
    name, 
    description, 
    short_description,
    category_id, 
    base_price, 
    compare_at_price,
    currency,
    meta_title,
    meta_description,
  } = data;

  // Validate required fields
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Product name is required');
  }

  if (name.length > 200) {
    throw new ValidationError('Product name must not exceed 200 characters');
  }

  if (description && description.length > 10000) {
    throw new ValidationError('Product description must not exceed 10000 characters');
  }

  if (!base_price || base_price <= 0) {
    throw new ValidationError('Base price must be a positive number');
  }

  // Validate category exists if provided
  if (category_id) {
    const category = await categoryRepository.findCategoryById(category_id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(name);

  // Create product with pending status
  const product = await productRepository.createProduct({
    shop_id: shopId,
    category_id: category_id || null,
    name: name.trim(),
    slug,
    description,
    short_description: short_description || (description ? description.substring(0, 500) : null),
    base_price,
    compare_at_price,
    currency: currency || 'VND',
    status: 'pending', // Always pending for new products
    meta_title: meta_title || name.substring(0, 100),
    meta_description: meta_description || (description ? description.substring(0, 200) : null),
  });

  // Auto-create default variant for inventory management
  try {
    await productRepository.createVariant({
      product_id: product.id,
      sku: productRepository.generateSKU(product.id, {}),
      name: 'Mặc định',
      attributes: {},
      price: null, // Use base product price
      quantity: data.quantity || data.product_quantity || 0,
      low_stock_threshold: 10,
      is_active: true,
    });
  } catch (variantError) {
    console.error('Failed to create default variant:', variantError.message);
  }

  // Publish PRODUCT_CREATED event
  await publishProductEvent('created', product);

  return product;
}

/**
 * Get product by ID
 * @param {string} productId
 * @param {boolean} includeRelations - Include variants and images
 * @returns {Promise<object>}
 */
async function getProductById(productId, includeRelations = false) {
  const product = includeRelations
    ? await productRepository.findProductByIdWithRelations(productId)
    : await productRepository.findProductById(productId);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

/**
 * Get product by slug
 * @param {string} slug
 * @returns {Promise<object>}
 */
async function getProductBySlug(slug) {
  const product = await productRepository.findProductBySlug(slug);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}

/**
 * Get products by shop
 * @param {string} shopId
 * @param {object} options - Pagination and filter options
 * @returns {Promise<{data: object[], count: number, page: number, limit: number}>}
 */
async function getProductsByShop(shopId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  const result = await productRepository.findProductsByShopId(shopId, { page, limit, status });

  return {
    data: result.data,
    count: result.count,
    page,
    limit,
    totalPages: Math.ceil(result.count / limit),
  };
}

/**
 * Get products by category
 * @param {string} categoryId
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number, page: number, limit: number}>}
 */
async function getProductsByCategory(categoryId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const result = await productRepository.findProductsByCategoryId(categoryId, { page, limit });

  return {
    data: result.data,
    count: result.count,
    page,
    limit,
    totalPages: Math.ceil(result.count / limit),
  };
}


/**
 * Update product
 * @param {string} productId
 * @param {string} shopId - For ownership validation
 * @param {object} data - Update data
 * @returns {Promise<object>}
 */
async function updateProduct(productId, shopId, data) {
  const product = await getProductById(productId);
  validateOwnership(product, shopId);

  const updateData = {};

  // Update name and regenerate slug if name changed
  if (data.name && data.name !== product.name) {
    if (data.name.length > 200) {
      throw new ValidationError('Product name must not exceed 200 characters');
    }
    updateData.name = data.name.trim();
    updateData.slug = await generateUniqueSlug(data.name, productId);
  }

  // Validate description length
  if (data.description !== undefined) {
    if (data.description && data.description.length > 10000) {
      throw new ValidationError('Product description must not exceed 10000 characters');
    }
    updateData.description = data.description;
  }

  // Update other fields
  if (data.short_description !== undefined) updateData.short_description = data.short_description;
  if (data.base_price !== undefined) {
    if (data.base_price <= 0) {
      throw new ValidationError('Base price must be a positive number');
    }
    updateData.base_price = data.base_price;
  }
  if (data.compare_at_price !== undefined) updateData.compare_at_price = data.compare_at_price;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.meta_title !== undefined) updateData.meta_title = data.meta_title;
  if (data.meta_description !== undefined) updateData.meta_description = data.meta_description;

  // Update category
  if (data.category_id !== undefined && data.category_id !== product.category_id) {
    if (data.category_id) {
      const category = await categoryRepository.findCategoryById(data.category_id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }
    }
    updateData.category_id = data.category_id;
  }

  // Reset status to pending if significant changes made (requires re-approval)
  const significantFields = ['name', 'description', 'base_price', 'category_id'];
  const hasSignificantChanges = significantFields.some(field => updateData[field] !== undefined);
  if (hasSignificantChanges && product.status === 'active') {
    updateData.status = 'pending';
  }

  if (Object.keys(updateData).length === 0) {
    return product;
  }

  const updatedProduct = await productRepository.updateProduct(productId, updateData);

  // Publish PRODUCT_UPDATED event
  await publishProductEvent('updated', updatedProduct);

  return updatedProduct;
}

/**
 * Delete product (soft delete)
 * @param {string} productId
 * @param {string} shopId - For ownership validation
 * @returns {Promise<void>}
 */
async function deleteProduct(productId, shopId) {
  const product = await getProductById(productId);
  validateOwnership(product, shopId);

  await productRepository.softDeleteProduct(productId);

  // Publish PRODUCT_DELETED event
  await publishProductEvent('deleted', product);
}

/**
 * View product (increment view count)
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function viewProduct(productId) {
  const product = await getProductById(productId, true);

  // Only count views for active products
  if (product.status === 'active') {
    await productRepository.incrementViewCount(productId);
  }

  return product;
}


// ============================================
// VARIANT OPERATIONS
// ============================================

/**
 * Add variant to product
 * @param {string} productId
 * @param {string} shopId - For ownership validation
 * @param {object} data - Variant data
 * @returns {Promise<object>}
 */
async function addVariant(productId, shopId, data) {
  const product = await getProductById(productId);
  validateOwnership(product, shopId);

  const { name, attributes, price, compare_at_price, quantity, low_stock_threshold, image_url, sku } = data;

  // Validate SKU uniqueness if provided
  if (sku) {
    const exists = await productRepository.skuExists(sku);
    if (exists) {
      throw new AppError('SKU_DUPLICATE', 'SKU already exists', 409);
    }
  }

  // Validate price if provided
  if (price !== undefined && price !== null && price < 0) {
    throw new ValidationError('Variant price cannot be negative');
  }

  const variant = await productRepository.createVariant({
    product_id: productId,
    sku,
    name,
    attributes: attributes || {},
    price, // Can be null to use base product price
    compare_at_price,
    quantity: quantity || 0,
    low_stock_threshold: low_stock_threshold || 10,
    image_url,
  });

  return variant;
}

/**
 * Update variant
 * @param {string} variantId
 * @param {string} shopId - For ownership validation
 * @param {object} data - Update data
 * @returns {Promise<object>}
 */
async function updateVariant(variantId, shopId, data) {
  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  // Validate ownership through product
  const product = await getProductById(variant.product_id);
  validateOwnership(product, shopId);

  const updateData = {};

  // Update SKU if changed
  if (data.sku && data.sku !== variant.sku) {
    const exists = await productRepository.skuExists(data.sku, variantId);
    if (exists) {
      throw new AppError('SKU_DUPLICATE', 'SKU already exists', 409);
    }
    updateData.sku = data.sku;
  }

  // Update other fields
  if (data.name !== undefined) updateData.name = data.name;
  if (data.attributes !== undefined) updateData.attributes = data.attributes;
  if (data.price !== undefined) {
    if (data.price !== null && data.price < 0) {
      throw new ValidationError('Variant price cannot be negative');
    }
    updateData.price = data.price;
  }
  if (data.compare_at_price !== undefined) updateData.compare_at_price = data.compare_at_price;
  if (data.low_stock_threshold !== undefined) updateData.low_stock_threshold = data.low_stock_threshold;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  if (Object.keys(updateData).length === 0) {
    return variant;
  }

  return productRepository.updateVariant(variantId, updateData);
}

/**
 * Delete variant (soft delete)
 * @param {string} variantId
 * @param {string} shopId - For ownership validation
 * @returns {Promise<void>}
 */
async function deleteVariant(variantId, shopId) {
  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  // Validate ownership through product
  const product = await getProductById(variant.product_id);
  validateOwnership(product, shopId);

  await productRepository.softDeleteVariant(variantId);
}

/**
 * Get variant price (variant price or base product price)
 * @param {object} variant
 * @param {object} product
 * @returns {number}
 */
function getVariantPrice(variant, product) {
  // Use variant price if set, otherwise use base product price
  return variant.price !== null && variant.price !== undefined 
    ? variant.price 
    : product.base_price;
}

/**
 * Get variants for product
 * @param {string} productId
 * @returns {Promise<object[]>}
 */
async function getVariantsByProduct(productId) {
  return productRepository.findVariantsByProductId(productId);
}


// ============================================
// IMAGE OPERATIONS
// ============================================

/**
 * Add image to product
 * @param {string} productId
 * @param {string} shopId - For ownership validation
 * @param {object} imageData
 * @returns {Promise<object>}
 */
async function addImage(productId, shopId, imageData) {
  const product = await getProductById(productId);
  validateOwnership(product, shopId);

  const { url, alt_text, sort_order, is_primary, file_size, width, height, format } = imageData;

  if (!url) {
    throw new ValidationError('Image URL is required');
  }

  // Validate format
  const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
  if (format && !validFormats.includes(format.toLowerCase())) {
    throw new AppError('IMAGE_INVALID_FORMAT', 'Invalid image format. Allowed: JPEG, PNG, WebP', 400);
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file_size && file_size > maxSize) {
    throw new AppError('IMAGE_SIZE_EXCEEDED', 'Image size exceeds 5MB limit', 400);
  }

  return productRepository.addImage({
    product_id: productId,
    url,
    alt_text,
    sort_order: sort_order || 0,
    is_primary: is_primary || false,
    file_size,
    width,
    height,
    format: format ? format.toLowerCase() : null,
  });
}

/**
 * Remove image from product
 * @param {string} imageId
 * @param {string} shopId - For ownership validation
 * @returns {Promise<void>}
 */
async function removeImage(imageId, shopId) {
  const image = await productRepository.findImageById(imageId);
  if (!image) {
    throw new NotFoundError('Image not found');
  }

  // Validate ownership through product
  const product = await getProductById(image.product_id);
  validateOwnership(product, shopId);

  await productRepository.removeImage(imageId);
}

/**
 * Set primary image
 * @param {string} productId
 * @param {string} imageId
 * @param {string} shopId - For ownership validation
 * @returns {Promise<object>}
 */
async function setPrimaryImage(productId, imageId, shopId) {
  const product = await getProductById(productId);
  validateOwnership(product, shopId);

  const image = await productRepository.findImageById(imageId);
  if (!image || image.product_id !== productId) {
    throw new NotFoundError('Image not found');
  }

  return productRepository.setPrimaryImage(productId, imageId);
}

/**
 * Reorder images
 * @param {string} productId
 * @param {string[]} imageIds
 * @param {string} shopId - For ownership validation
 * @returns {Promise<object[]>}
 */
async function reorderImages(productId, imageIds, shopId) {
  const product = await getProductById(productId);
  validateOwnership(product, shopId);

  return productRepository.reorderImages(productId, imageIds);
}

/**
 * Get images for product
 * @param {string} productId
 * @returns {Promise<object[]>}
 */
async function getImagesByProduct(productId) {
  return productRepository.findImagesByProductId(productId);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Helpers
  generateSlug,
  generateUniqueSlug,
  
  // Product operations
  createProduct,
  getProductById,
  getProductBySlug,
  getProductsByShop,
  getProductsByCategory,
  updateProduct,
  deleteProduct,
  viewProduct,
  
  // Variant operations
  addVariant,
  updateVariant,
  deleteVariant,
  getVariantPrice,
  getVariantsByProduct,
  
  // Image operations
  addImage,
  removeImage,
  setPrimaryImage,
  reorderImages,
  getImagesByProduct,
};
