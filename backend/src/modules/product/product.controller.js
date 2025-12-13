/**
 * Product Controller
 * HTTP request handlers for product endpoints
 */

const productService = require('./product.service');
const categoryService = require('./services/category.service');
const searchService = require('./services/search.service');
const reviewService = require('./services/review.service');
const wishlistService = require('./services/wishlist.service');
const inventoryService = require('./services/inventory.service');
const approvalService = require('./services/approval.service');
const viewService = require('./services/view.service');
const { serializeProduct, serializeProductSummary } = require('./product.dto');
const { sendSuccess: successResponse } = require('../../shared/utils/response.util');
const cacheService = require('../../shared/redis/cache.service');

/**
 * Helper to get shop_id from user token or database
 * @param {object} req - Express request
 * @returns {Promise<string>} Shop ID
 */
async function getShopIdFromUser(req) {
  if (req.user.shop_id) {
    return req.user.shop_id;
  }
  const shopService = require('../shop/shop.service');
  const shop = await shopService.getShopByPartnerId(req.user.userId);
  return shop.id;
}

// ============================================
// PRODUCT CRUD
// ============================================

/**
 * Create a new product
 * POST /api/products
 */
async function createProduct(req, res, next) {
  try {
    const shopId = await getShopIdFromUser(req);
    
    // Map frontend field names to backend field names
    const productData = {
      name: req.body.name || req.body.product_name,
      description: req.body.description || req.body.product_description,
      base_price: req.body.base_price || req.body.product_price,
      category_id: req.body.category_id,
      short_description: req.body.short_description,
      compare_at_price: req.body.compare_at_price,
      currency: req.body.currency,
      meta_title: req.body.meta_title,
      meta_description: req.body.meta_description,
      // For default variant inventory
      quantity: req.body.quantity || req.body.product_quantity || 0,
    };
    
    const product = await productService.createProduct(shopId, productData);
    
    // Handle product images if provided
    const imageUrls = req.body.product_images || req.body.images || [];
    const normalizedUrls = Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []);
    
    if (normalizedUrls.length > 0) {
      for (let i = 0; i < normalizedUrls.length; i++) {
        await productService.addImage(product.id, shopId, {
          url: normalizedUrls[i],
          sort_order: i,
          is_primary: i === 0,
        });
      }
    }
    
    // Fetch product with images
    const productWithImages = await productService.getProductById(product.id, true);
    
    return successResponse(res, {
      message: 'Product created successfully',
      data: serializeProduct(productWithImages),
    }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Check if string is a valid UUID
 * @param {string} str
 * @returns {boolean}
 */
function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get product by ID or slug (with Redis caching)
 * GET /api/products/:id
 */
async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    const viewerId = req.user?.userId || req.ip;
    
    let product;
    
    // Check if id is UUID or slug
    if (isUUID(id)) {
      // Try cache first for UUID
      product = await cacheService.getProduct(id);
      if (!product) {
        product = await productService.getProductById(id, true);
        // Cache for 1 hour
        await cacheService.setProduct(id, product);
      }
    } else {
      // It's a slug - get by slug first, then try cache with actual ID
      const basicProduct = await productService.getProductBySlug(id);
      product = await cacheService.getProduct(basicProduct.id);
      if (!product) {
        product = await productService.getProductById(basicProduct.id, true);
        await cacheService.setProduct(basicProduct.id, product);
      }
    }
    
    // Track view (async, don't wait)
    viewService.trackProductView(product.id, viewerId).catch(console.error);
    
    return successResponse(res, {
      data: serializeProduct(product),
    });
  } catch (error) {
    next(error);
  }
}


/**
 * Update product
 * PUT /api/products/:id
 */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = await getShopIdFromUser(req);
    
    // Map frontend field names to backend field names
    const updateData = {
      name: req.body.name || req.body.product_name,
      description: req.body.description || req.body.product_description,
      base_price: req.body.base_price || req.body.product_price,
      category_id: req.body.category_id,
      short_description: req.body.short_description,
      compare_at_price: req.body.compare_at_price,
      currency: req.body.currency,
      meta_title: req.body.meta_title,
      meta_description: req.body.meta_description,
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });
    
    const product = await productService.updateProduct(id, shopId, updateData);
    
    // Invalidate cache
    await cacheService.invalidateProduct(id);
    
    return successResponse(res, {
      message: 'Product updated successfully',
      data: serializeProduct(product),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete product
 * DELETE /api/products/:id
 */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = await getShopIdFromUser(req);
    
    await productService.deleteProduct(id, shopId);
    
    // Invalidate cache
    await cacheService.invalidateProduct(id);
    
    return successResponse(res, {
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Search products
 * GET /api/products
 */
async function searchProducts(req, res, next) {
  try {
    const { q, category_id, categoryId, shop_id, shopId, status, min_price, max_price, min_rating, minPrice, maxPrice, minRating, sort, sortBy, sortOrder, page, limit } = req.query;
    
    // Support both snake_case and camelCase query params
    const shopIdFilter = shop_id || shopId;
    const categoryIdFilter = category_id || categoryId;
    const minPriceFilter = min_price || minPrice;
    const maxPriceFilter = max_price || maxPrice;
    const minRatingFilter = min_rating || minRating;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    // Use search service (with Elasticsearch or database fallback) for all searches
    // This enables full-text search, filtering, and sorting via Elasticsearch
    const result = await searchService.search({
      query: q,
      filters: {
        shop_id: shopIdFilter,
        category_id: categoryIdFilter,
        status: status || 'active',
        min_price: minPriceFilter ? parseFloat(minPriceFilter) : undefined,
        max_price: maxPriceFilter ? parseFloat(maxPriceFilter) : undefined,
        min_rating: minRatingFilter ? parseFloat(minRatingFilter) : undefined,
      },
      sort: sortBy || sort,
      page: pageNum,
      limit: limitNum,
    });
    
    // Handle both ES response format and database fallback format
    const pagination = result.pagination || {
      page: result.page || pageNum,
      limit: result.limit || limitNum,
      total: result.count || 0,
      totalPages: result.totalPages || 0,
    };
    
    return successResponse(res, {
      data: result.data.map(serializeProductSummary),
      pagination,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// VARIANTS
// ============================================

/**
 * Add variant to product
 * POST /api/products/:id/variants
 */
async function addVariant(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = await getShopIdFromUser(req);
    
    const variant = await productService.addVariant(id, shopId, req.body);
    
    return successResponse(res, {
      message: 'Variant added successfully',
      data: variant,
    }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update variant
 * PUT /api/products/:id/variants/:variantId
 */
async function updateVariant(req, res, next) {
  try {
    const { variantId } = req.params;
    const shopId = await getShopIdFromUser(req);
    
    const variant = await productService.updateVariant(variantId, shopId, req.body);
    
    return successResponse(res, {
      message: 'Variant updated successfully',
      data: variant,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete variant
 * DELETE /api/products/:id/variants/:variantId
 */
async function deleteVariant(req, res, next) {
  try {
    const { variantId } = req.params;
    const shopId = await getShopIdFromUser(req);
    
    await productService.deleteVariant(variantId, shopId);
    
    return successResponse(res, {
      message: 'Variant deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// INVENTORY
// ============================================

/**
 * Update inventory
 * PUT /api/products/:id/inventory
 */
async function updateInventory(req, res, next) {
  try {
    const { variantId, quantity } = req.body;
    
    const result = await inventoryService.updateStock(variantId, quantity, 'manual_update');
    
    return successResponse(res, {
      message: 'Inventory updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check stock availability (real-time)
 * GET /api/products/stock/check?variantId=xxx&quantity=1
 */
async function checkStock(req, res, next) {
  try {
    const { variantId, quantity = 1 } = req.query;
    
    if (!variantId) {
      return successResponse(res, { 
        error: 'variantId is required',
        isAvailable: false,
      }, 400);
    }
    
    const result = await inventoryService.checkStockAvailability(variantId, parseInt(quantity));
    
    return successResponse(res, {
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check stock for multiple cart items (real-time)
 * POST /api/products/stock/check-cart
 * Body: { items: [{ variantId, quantity }] }
 */
async function checkCartStock(req, res, next) {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return successResponse(res, { 
        error: 'items array is required',
        data: [],
      }, 400);
    }
    
    const results = await inventoryService.checkCartStock(items);
    
    // Check if all items are available
    const allAvailable = results.every(item => item.isAvailable);
    const unavailableItems = results.filter(item => !item.isAvailable);
    
    return successResponse(res, {
      data: results,
      allAvailable,
      unavailableItems,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get shop inventory (Partner)
 * GET /api/products/inventory
 */
async function getShopInventory(req, res, next) {
  try {
    const shopId = await getShopIdFromUser(req);
    const { page = 1, limit = 50, lowStockOnly, outOfStockOnly, search } = req.query;
    
    const productRepository = require('./product.repository');
    const result = await productRepository.getShopInventory(shopId, {
      page: parseInt(page),
      limit: parseInt(limit),
      lowStockOnly: lowStockOnly === 'true',
      outOfStockOnly: outOfStockOnly === 'true',
      search,
    });
    
    // Calculate summary stats
    const allVariants = result.data;
    const summary = {
      totalVariants: result.count,
      lowStockCount: allVariants.filter(v => v.isLowStock).length,
      outOfStockCount: allVariants.filter(v => v.isOutOfStock).length,
      inStockCount: allVariants.filter(v => !v.isLowStock && !v.isOutOfStock).length,
    };
    
    return successResponse(res, {
      data: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count,
        totalPages: Math.ceil(result.count / parseInt(limit)),
      },
      summary,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update variant stock (Partner)
 * PATCH /api/products/inventory/:variantId
 */
async function updateVariantStock(req, res, next) {
  try {
    const { variantId } = req.params;
    const { quantity, lowStockThreshold } = req.body;
    const shopId = await getShopIdFromUser(req);
    
    // Verify ownership
    const productRepository = require('./product.repository');
    const variant = await productRepository.findVariantById(variantId);
    
    if (!variant) {
      return successResponse(res, { error: 'Variant not found' }, 404);
    }
    
    // Check product belongs to shop
    const product = await productService.getProductById(variant.product_id);
    if (product.shop_id !== shopId) {
      return successResponse(res, { error: 'Unauthorized' }, 403);
    }
    
    const updateData = {};
    if (quantity !== undefined) {
      updateData.quantity = parseInt(quantity);
      updateData.is_active = parseInt(quantity) > 0;
    }
    if (lowStockThreshold !== undefined) {
      updateData.low_stock_threshold = parseInt(lowStockThreshold);
    }
    
    const updatedVariant = await productRepository.updateVariant(variantId, updateData);
    
    return successResponse(res, {
      message: 'Stock updated successfully',
      data: {
        ...updatedVariant,
        availableQuantity: updatedVariant.quantity - updatedVariant.reserved_quantity,
        isLowStock: updatedVariant.quantity <= updatedVariant.low_stock_threshold && updatedVariant.quantity > 0,
        isOutOfStock: updatedVariant.quantity === 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// IMAGES
// ============================================

/**
 * Upload images
 * POST /api/products/:id/images
 */
async function uploadImages(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = await getShopIdFromUser(req);
    
    // Handle file uploads - in production, upload to Supabase Storage first
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const image = await productService.addImage(id, shopId, {
          url: file.path || file.location, // Depends on upload middleware
          alt_text: file.originalname,
          file_size: file.size,
          format: file.mimetype?.split('/')[1],
        });
        images.push(image);
      }
    }
    
    return successResponse(res, {
      message: 'Images uploaded successfully',
      data: images,
    }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete image
 * DELETE /api/products/:id/images/:imageId
 */
async function deleteImage(req, res, next) {
  try {
    const { imageId } = req.params;
    const shopId = await getShopIdFromUser(req);
    
    await productService.removeImage(imageId, shopId);
    
    return successResponse(res, {
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload temporary images (before product creation)
 * POST /api/products/upload/images
 */
async function uploadTempImages(req, res, next) {
  try {
    const storageClient = require('../../shared/supabase/storage.client');
    const { v4: uuidv4 } = require('uuid');
    
    if (!req.files || req.files.length === 0) {
      return successResponse(res, { data: [] });
    }
    
    const uploadedUrls = [];
    const tempId = uuidv4(); // Temporary folder ID
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const ext = file.originalname.split('.').pop() || 'jpg';
      const path = `temp/${tempId}/${i}_${Date.now()}.${ext}`;
      
      const result = await storageClient.uploadFile(
        storageClient.BUCKETS.PRODUCTS,
        path,
        file.buffer,
        { contentType: file.mimetype, upsert: true }
      );
      
      uploadedUrls.push(result.url);
    }
    
    return successResponse(res, {
      message: 'Images uploaded successfully',
      data: uploadedUrls,
    });
  } catch (error) {
    next(error);
  }
}


// ============================================
// CATEGORIES
// ============================================

/**
 * Get categories (with Redis caching)
 * GET /api/categories
 */
async function getCategories(req, res, next) {
  try {
    const { tree } = req.query;
    
    let categories;
    if (tree === 'true') {
      // Try cache first for category tree
      categories = await cacheService.getCategoryTree();
      if (!categories) {
        categories = await categoryService.getCategoryTree();
        await cacheService.setCategoryTree(categories);
      }
    } else {
      // Try cache first for category list
      categories = await cacheService.getCategoryList();
      if (!categories) {
        categories = await categoryService.getAllCategories({ is_active: true });
        await cacheService.setCategoryList(categories);
      }
    }
    
    return successResponse(res, { data: categories });
  } catch (error) {
    next(error);
  }
}

/**
 * Get category by ID
 * GET /api/categories/:id
 */
async function getCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    
    return successResponse(res, { data: category });
  } catch (error) {
    next(error);
  }
}

/**
 * Create category (Admin only)
 * POST /api/categories
 */
async function createCategory(req, res, next) {
  try {
    const category = await categoryService.createCategory(req.body);
    
    // Invalidate category cache
    await cacheService.invalidateCategories();
    
    return successResponse(res, {
      message: 'Category created successfully',
      data: category,
    }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update category (Admin only)
 * PUT /api/categories/:id
 */
async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const category = await categoryService.updateCategory(id, req.body);
    
    // Invalidate category cache
    await cacheService.invalidateCategories();
    
    return successResponse(res, {
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete category (Admin only)
 * DELETE /api/categories/:id
 */
async function deleteCategoryHandler(req, res, next) {
  try {
    const { id } = req.params;
    await categoryService.deleteCategory(id);
    
    // Invalidate category cache
    await cacheService.invalidateCategories();
    
    return successResponse(res, {
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// ADMIN APPROVAL
// ============================================

/**
 * Get pending products for approval (Admin only)
 * GET /api/admin/products/pending
 */
async function getPendingProducts(req, res, next) {
  try {
    const result = await approvalService.getPendingProducts();
    
    // Transform for frontend compatibility
    const products = result.data.map(p => ({
      ...p,
      _id: p.id,
      product_name: p.name,
      product_thumb: '', // No images in basic query
      product_price: p.base_price,
      product_type: p.category?.name || 'Uncategorized',
      shopName: p.shop?.shop_name || 'Unknown Shop',
      createdAt: new Date(p.created_at).toLocaleDateString('vi-VN')
    }));

    return successResponse(res, {
      data: products,
      count: result.count,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Approve product (Admin only)
 * POST /api/admin/products/:id/approve
 */
async function approveProduct(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const result = await approvalService.approveProduct(id, adminId);
    
    // Index in search
    await searchService.indexProduct(result.product);
    
    return successResponse(res, {
      message: 'Product approved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject product (Admin only)
 * POST /api/admin/products/:id/reject
 */
async function rejectProduct(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;
    
    const result = await approvalService.rejectProduct(id, adminId, reason);
    
    return successResponse(res, {
      message: 'Product rejected',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Request revision (Admin only)
 * POST /api/admin/products/:id/revision
 */
async function requestRevision(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { reason } = req.body;
    
    const result = await approvalService.requestRevision(id, adminId, reason);
    
    return successResponse(res, {
      message: 'Revision requested',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// REVIEWS
// ============================================

/**
 * Get product reviews
 * GET /api/products/:id/reviews
 */
async function getReviews(req, res, next) {
  try {
    const { id } = req.params;
    const { page, limit, sort, rating } = req.query;
    
    const result = await reviewService.getProductReviews(
      id,
      { rating: rating ? parseInt(rating, 10) : undefined }, // filters
      { // pagination
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        sort: sort || 'newest',
      }
    );
    
    return successResponse(res, {
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get review statistics
 * GET /api/products/:id/reviews/stats
 */
async function getReviewStats(req, res, next) {
  try {
    const { id } = req.params;
    
    const stats = await reviewService.getReviewStatistics(id);
    
    return successResponse(res, {
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create review
 * POST /api/products/:id/reviews
 */
async function createReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const review = await reviewService.createReview(userId, id, req.body);
    
    return successResponse(res, {
      message: 'Review created successfully',
      data: review,
    }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Reply to review (Partner only)
 * POST /api/products/:id/reviews/:reviewId/reply
 */
async function replyToReview(req, res, next) {
  try {
    const { reviewId } = req.params;
    const partnerId = req.user.userId;
    const { reply } = req.body;
    
    const review = await reviewService.replyToReview(reviewId, partnerId, reply);
    
    return successResponse(res, {
      message: 'Reply added successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// WISHLIST
// ============================================

/**
 * Get wishlist
 * GET /api/wishlist
 */
async function getWishlist(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    
    const result = await wishlistService.getWishlist(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    
    return successResponse(res, {
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add to wishlist
 * POST /api/wishlist/:productId
 */
async function addToWishlist(req, res, next) {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    
    await wishlistService.addToWishlist(userId, productId);
    
    return successResponse(res, {
      message: 'Added to wishlist',
    }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove from wishlist
 * DELETE /api/wishlist/:productId
 */
async function removeFromWishlist(req, res, next) {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    
    await wishlistService.removeFromWishlist(userId, productId);
    
    return successResponse(res, {
      message: 'Removed from wishlist',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get search suggestions (autocomplete)
 * GET /api/products/suggest?q=xxx
 */
async function getSuggestions(req, res, next) {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return successResponse(res, { data: [] });
    }
    
    const suggestions = await searchService.suggest(q.trim(), parseInt(limit));
    
    return successResponse(res, { data: suggestions });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  // Products
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getSuggestions,
  
  // Variants
  addVariant,
  updateVariant,
  deleteVariant,
  
  // Inventory
  updateInventory,
  checkStock,
  checkCartStock,
  getShopInventory,
  updateVariantStock,
  
  // Images
  uploadImages,
  uploadTempImages,
  deleteImage,
  
  // Categories
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory: deleteCategoryHandler,
  
  // Admin
  getPendingProducts,
  approveProduct,
  rejectProduct,
  requestRevision,
  
  // Reviews
  getReviews,
  getReviewStats,
  createReview,
  replyToReview,
  
  // Wishlist
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
