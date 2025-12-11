/**
 * Product Repository
 * Data access layer for product operations
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// ============================================
// PRODUCT OPERATIONS
// ============================================

/**
 * Create a new product
 * @param {object} productData
 * @returns {Promise<object>} Created product
 */
async function createProduct(productData) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      id: productData.id || uuidv4(),
      shop_id: productData.shop_id,
      category_id: productData.category_id,
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      short_description: productData.short_description,
      base_price: productData.base_price,
      compare_at_price: productData.compare_at_price,
      currency: productData.currency || 'VND',
      status: productData.status || 'pending',
      meta_title: productData.meta_title,
      meta_description: productData.meta_description,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }

  return data;
}

/**
 * Find product by ID
 * @param {string} productId
 * @returns {Promise<object|null>}
 */
async function findProductById(productId) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', productId)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find product: ${error.message}`);
  }

  return data || null;
}

/**
 * Find all pending products for admin approval
 * @returns {Promise<object[]>}
 */
async function findPendingProducts() {
  // Simple query without relations to avoid join issues
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to find pending products: ${error.message}`);
  }

  // Fetch related data separately
  const result = [];
  for (const p of (products || [])) {
    let shopName = 'Unknown Shop';
    let categoryName = 'Uncategorized';

    if (p.shop_id) {
      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('shop_name')
        .eq('id', p.shop_id)
        .single();
      if (shop) shopName = shop.shop_name;
    }

    if (p.category_id) {
      const { data: cat } = await supabaseAdmin
        .from('categories')
        .select('name')
        .eq('id', p.category_id)
        .single();
      if (cat) categoryName = cat.name;
    }

    result.push({
      ...p,
      shop: { shop_name: shopName },
      category: { name: categoryName }
    });
  }

  return result;
}


/**
 * Find product by ID with relations (variants, images)
 * @param {string} productId
 * @returns {Promise<object|null>}
 */
async function findProductByIdWithRelations(productId) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('id', productId)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find product: ${error.message}`);
  }

  return data || null;
}

/**
 * Find product by slug
 * @param {string} slug
 * @returns {Promise<object|null>}
 */
async function findProductBySlug(slug) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find product: ${error.message}`);
  }

  return data || null;
}

/**
 * Find products by shop ID
 * @param {string} shopId
 * @param {object} options - Pagination and filter options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function findProductsByShopId(shopId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('products')
    .select('*, images:product_images(*)', { count: 'exact' })
    .eq('shop_id', shopId)
    .is('deleted_at', null);

  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to find products: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Find products by category ID
 * @param {string} categoryId
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function findProductsByCategoryId(categoryId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to find products: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Update product
 * @param {string} productId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateProduct(productId, updateData) {
  const { data, error } = await supabaseAdmin
    .from('products')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`);
  }

  return data;
}

/**
 * Soft delete product
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function softDeleteProduct(productId) {
  return updateProduct(productId, {
    deleted_at: new Date().toISOString(),
    status: 'inactive',
  });
}

/**
 * Check if slug exists
 * @param {string} slug
 * @param {string} excludeId - Product ID to exclude
 * @returns {Promise<boolean>}
 */
async function slugExists(slug, excludeId = null) {
  let query = supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)
    .is('deleted_at', null);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check slug: ${error.message}`);
  }

  return count > 0;
}

/**
 * Increment view count
 * @param {string} productId
 * @returns {Promise<object>}
 */
async function incrementViewCount(productId) {
  const { data, error } = await supabaseAdmin
    .rpc('increment_product_view_count', { product_id: productId });

  if (error) {
    // Fallback to manual increment
    const product = await findProductById(productId);
    if (product) {
      return updateProduct(productId, {
        view_count: (product.view_count || 0) + 1,
      });
    }
    throw new Error(`Failed to increment view count: ${error.message}`);
  }

  return data;
}

/**
 * Update product rating
 * @param {string} productId
 * @param {number} avgRating
 * @param {number} reviewCount
 * @returns {Promise<object>}
 */
async function updateProductRating(productId, avgRating, reviewCount) {
  return updateProduct(productId, {
    avg_rating: avgRating,
    review_count: reviewCount,
  });
}


// ============================================
// VARIANT OPERATIONS
// ============================================

/**
 * Get shop inventory (all variants with stock info)
 * @param {string} shopId
 * @param {object} options - Pagination and filter options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getShopInventory(shopId, options = {}) {
  const { page = 1, limit = 50, lowStockOnly = false, outOfStockOnly = false, search } = options;
  const offset = (page - 1) * limit;

  // First get all products for this shop
  let productQuery = supabaseAdmin
    .from('products')
    .select('id, name, status')
    .eq('shop_id', shopId)
    .is('deleted_at', null);

  const { data: products, error: productError } = await productQuery;
  
  if (productError) {
    throw new Error(`Failed to get products: ${productError.message}`);
  }

  if (!products || products.length === 0) {
    return { data: [], count: 0 };
  }

  const productIds = products.map(p => p.id);
  const productMap = new Map(products.map(p => [p.id, p]));

  // Get variants for these products
  let variantQuery = supabaseAdmin
    .from('product_variants')
    .select('*', { count: 'exact' })
    .in('product_id', productIds)
    .is('deleted_at', null);

  if (lowStockOnly) {
    // Filter where quantity <= low_stock_threshold AND quantity > 0
    variantQuery = variantQuery.lte('quantity', supabaseAdmin.raw('low_stock_threshold')).gt('quantity', 0);
  }

  if (outOfStockOnly) {
    variantQuery = variantQuery.eq('quantity', 0);
  }

  if (search) {
    variantQuery = variantQuery.or(`sku.ilike.%${search}%,name.ilike.%${search}%`);
  }

  variantQuery = variantQuery
    .order('quantity', { ascending: true }) // Show low stock first
    .range(offset, offset + limit - 1);

  const { data: variants, error: variantError, count } = await variantQuery;

  if (variantError) {
    throw new Error(`Failed to get variants: ${variantError.message}`);
  }

  // Enrich variants with product info
  const enrichedVariants = (variants || []).map(v => ({
    ...v,
    product: productMap.get(v.product_id),
    availableQuantity: v.quantity - v.reserved_quantity,
    isLowStock: v.quantity <= v.low_stock_threshold && v.quantity > 0,
    isOutOfStock: v.quantity === 0,
  }));

  return { data: enrichedVariants, count: count || 0 };
}

/**
 * Generate unique SKU
 * @param {string} productId
 * @param {object} attributes
 * @returns {string}
 */
function generateSKU(productId, attributes = {}) {
  const prefix = productId.substring(0, 8).toUpperCase();
  const attrPart = Object.values(attributes)
    .map(v => String(v).substring(0, 3).toUpperCase())
    .join('-');
  const timestamp = Date.now().toString(36).toUpperCase();
  
  return attrPart ? `${prefix}-${attrPart}-${timestamp}` : `${prefix}-${timestamp}`;
}

/**
 * Create a new variant
 * @param {object} variantData
 * @returns {Promise<object>}
 */
async function createVariant(variantData) {
  const sku = variantData.sku || generateSKU(variantData.product_id, variantData.attributes);
  
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .insert({
      id: variantData.id || uuidv4(),
      product_id: variantData.product_id,
      sku,
      name: variantData.name,
      attributes: variantData.attributes || {},
      price: variantData.price,
      compare_at_price: variantData.compare_at_price,
      quantity: variantData.quantity || 0,
      reserved_quantity: variantData.reserved_quantity || 0,
      low_stock_threshold: variantData.low_stock_threshold || 10,
      image_url: variantData.image_url,
      is_active: variantData.is_active !== false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create variant: ${error.message}`);
  }

  return data;
}

/**
 * Find variant by ID
 * @param {string} variantId
 * @returns {Promise<object|null>}
 */
async function findVariantById(variantId) {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('id', variantId)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find variant: ${error.message}`);
  }

  return data || null;
}

/**
 * Find variant by SKU
 * @param {string} sku
 * @returns {Promise<object|null>}
 */
async function findVariantBySKU(sku) {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('sku', sku)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find variant: ${error.message}`);
  }

  return data || null;
}

/**
 * Find variants by product ID
 * @param {string} productId
 * @returns {Promise<object[]>}
 */
async function findVariantsByProductId(productId) {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to find variants: ${error.message}`);
  }

  return data || [];
}

/**
 * Update variant
 * @param {string} variantId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateVariant(variantId, updateData) {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', variantId)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update variant: ${error.message}`);
  }

  return data;
}

/**
 * Soft delete variant
 * @param {string} variantId
 * @returns {Promise<object>}
 */
async function softDeleteVariant(variantId) {
  return updateVariant(variantId, {
    deleted_at: new Date().toISOString(),
    is_active: false,
  });
}

/**
 * Check if SKU exists
 * @param {string} sku
 * @param {string} excludeId - Variant ID to exclude
 * @returns {Promise<boolean>}
 */
async function skuExists(sku, excludeId = null) {
  let query = supabaseAdmin
    .from('product_variants')
    .select('id', { count: 'exact', head: true })
    .eq('sku', sku)
    .is('deleted_at', null);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check SKU: ${error.message}`);
  }

  return count > 0;
}

/**
 * Update variant inventory
 * @param {string} variantId
 * @param {number} quantity
 * @param {number} reservedQuantity
 * @returns {Promise<object>}
 */
async function updateVariantInventory(variantId, quantity, reservedQuantity = null) {
  const updateData = { quantity };
  if (reservedQuantity !== null) {
    updateData.reserved_quantity = reservedQuantity;
  }
  return updateVariant(variantId, updateData);
}

/**
 * Reserve stock for variant
 * @param {string} variantId
 * @param {number} quantity
 * @returns {Promise<object>}
 */
async function reserveStock(variantId, quantity) {
  const variant = await findVariantById(variantId);
  if (!variant) {
    throw new Error('Variant not found');
  }

  const availableStock = variant.quantity - variant.reserved_quantity;
  if (availableStock < quantity) {
    throw new Error('Insufficient stock');
  }

  return updateVariant(variantId, {
    reserved_quantity: variant.reserved_quantity + quantity,
  });
}

/**
 * Release reserved stock
 * @param {string} variantId
 * @param {number} quantity
 * @returns {Promise<object>}
 */
async function releaseStock(variantId, quantity) {
  const variant = await findVariantById(variantId);
  if (!variant) {
    throw new Error('Variant not found');
  }

  const newReserved = Math.max(0, variant.reserved_quantity - quantity);
  return updateVariant(variantId, {
    reserved_quantity: newReserved,
  });
}

/**
 * Confirm stock (reduce quantity after order completion)
 * @param {string} variantId
 * @param {number} quantity
 * @returns {Promise<object>}
 */
async function confirmStock(variantId, quantity) {
  const variant = await findVariantById(variantId);
  if (!variant) {
    throw new Error('Variant not found');
  }

  return updateVariant(variantId, {
    quantity: variant.quantity - quantity,
    reserved_quantity: Math.max(0, variant.reserved_quantity - quantity),
  });
}


// ============================================
// IMAGE OPERATIONS
// ============================================

/**
 * Add image to product
 * @param {object} imageData
 * @returns {Promise<object>}
 */
async function addImage(imageData) {
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .insert({
      id: imageData.id || uuidv4(),
      product_id: imageData.product_id,
      url: imageData.url,
      alt_text: imageData.alt_text,
      sort_order: imageData.sort_order || 0,
      is_primary: imageData.is_primary || false,
      file_size: imageData.file_size,
      width: imageData.width,
      height: imageData.height,
      format: imageData.format,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add image: ${error.message}`);
  }

  return data;
}

/**
 * Find images by product ID
 * @param {string} productId
 * @returns {Promise<object[]>}
 */
async function findImagesByProductId(productId) {
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to find images: ${error.message}`);
  }

  return data || [];
}

/**
 * Find image by ID
 * @param {string} imageId
 * @returns {Promise<object|null>}
 */
async function findImageById(imageId) {
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find image: ${error.message}`);
  }

  return data || null;
}

/**
 * Remove image
 * @param {string} imageId
 * @returns {Promise<void>}
 */
async function removeImage(imageId) {
  const { error } = await supabaseAdmin
    .from('product_images')
    .delete()
    .eq('id', imageId);

  if (error) {
    throw new Error(`Failed to remove image: ${error.message}`);
  }
}

/**
 * Update image
 * @param {string} imageId
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateImage(imageId, updateData) {
  const { data, error } = await supabaseAdmin
    .from('product_images')
    .update(updateData)
    .eq('id', imageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update image: ${error.message}`);
  }

  return data;
}

/**
 * Set primary image
 * @param {string} productId
 * @param {string} imageId
 * @returns {Promise<object>}
 */
async function setPrimaryImage(productId, imageId) {
  // First, unset all primary images for this product
  await supabaseAdmin
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId);

  // Then set the new primary image
  return updateImage(imageId, { is_primary: true });
}

/**
 * Reorder images
 * @param {string} productId
 * @param {string[]} imageIds - Array of image IDs in desired order
 * @returns {Promise<object[]>}
 */
async function reorderImages(productId, imageIds) {
  const updates = imageIds.map((id, index) => ({
    id,
    sort_order: index,
  }));

  const results = [];
  for (const update of updates) {
    const result = await updateImage(update.id, { sort_order: update.sort_order });
    results.push(result);
  }

  return results;
}

// ============================================
// SEARCH OPERATIONS
// ============================================

/**
 * Search products with filters (database fallback for Elasticsearch)
 * @param {object} options - Search options
 * @returns {Promise<{data: object[], count: number, page: number, limit: number, totalPages: number}>}
 */
async function searchProducts(options = {}) {
  const {
    query,
    categoryId,
    status = 'active',
    minPrice,
    maxPrice,
    minRating,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = options;

  let queryBuilder = supabaseAdmin
    .from('products')
    .select(`
      *,
      images:product_images(id, url, alt_text, sort_order, is_primary)
    `, { count: 'exact' })
    .is('deleted_at', null);

  // Status filter
  if (status) {
    queryBuilder = queryBuilder.eq('status', status);
  }

  // Category filter
  if (categoryId) {
    queryBuilder = queryBuilder.eq('category_id', categoryId);
  }

  // Text search
  if (query && query.trim()) {
    queryBuilder = queryBuilder.or(`name.ilike.%${query}%,short_description.ilike.%${query}%`);
  }

  // Price range
  if (minPrice !== undefined) {
    queryBuilder = queryBuilder.gte('base_price', minPrice);
  }
  if (maxPrice !== undefined) {
    queryBuilder = queryBuilder.lte('base_price', maxPrice);
  }

  // Rating filter
  if (minRating !== undefined) {
    queryBuilder = queryBuilder.gte('avg_rating', minRating);
  }

  // Sorting
  const sortColumn = sortBy === 'total_sold' ? 'total_sold' 
    : sortBy === 'price' ? 'base_price'
    : sortBy === 'rating' ? 'avg_rating'
    : 'created_at';
  queryBuilder = queryBuilder.order(sortColumn, { ascending: sortOrder === 'asc' });

  // Pagination
  const from = (page - 1) * limit;
  queryBuilder = queryBuilder.range(from, from + limit - 1);

  const { data, error, count } = await queryBuilder;

  if (error) {
    throw new Error(`Failed to search products: ${error.message}`);
  }

  return {
    data: data || [],
    count: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Product operations
  createProduct,
  searchProducts,
  findProductById,
  findPendingProducts,
  findProductByIdWithRelations,
  findProductBySlug,
  findProductsByShopId,
  findProductsByCategoryId,
  updateProduct,
  softDeleteProduct,
  slugExists,
  incrementViewCount,
  updateProductRating,
  
  // Variant operations
  getShopInventory,
  generateSKU,
  createVariant,
  findVariantById,
  findVariantBySKU,
  findVariantsByProductId,
  updateVariant,
  softDeleteVariant,
  skuExists,
  updateVariantInventory,
  reserveStock,
  releaseStock,
  confirmStock,
  
  // Image operations
  addImage,
  findImagesByProductId,
  findImageById,
  removeImage,
  updateImage,
  setPrimaryImage,
  reorderImages,
};
