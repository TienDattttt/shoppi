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
const { successResponse, errorResponse } = require('../../shared/utils/response.util');

// ============================================
// PRODUCT CRUD
// ============================================

/**
 * Create a new product
 * POST /api/products
 */
async function createProduct(req, res, next) {
  try {
    const shopId = req.user.shop_id || req.body.shop_id;
    
    const product = await productService.createProduct(shopId, req.body);
    
    return successResponse(res, {
      message: 'Product created successfully',
      data: serializeProduct(product),
    }, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Get product by ID
 * GET /api/products/:id
 */
async function getProduct(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const product = await productService.getProductById(id);
    
    // Track view (async, don't wait)
    viewService.trackView(id, userId, req.ip).catch(console.error);
    
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
    const shopId = req.user.shop_id;
    
    const product = await productService.updateProduct(id, shopId, req.body);
    
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
    const shopId = req.user.shop_id;
    
    await productService.deleteProduct(id, shopId);
    
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
    const { q, category_id, min_price, max_price, min_rating, sort, page, limit } = req.query;
    
    const result = await searchService.search({
      query: q,
      filters: {
        category_id,
        min_price: min_price ? parseFloat(min_price) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined,
        min_rating: min_rating ? parseFloat(min_rating) : undefined,
      },
      sort,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    
    return successResponse(res, {
      data: result.data.map(serializeProductSummary),
      pagination: result.pagination,
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
    const shopId = req.user.shop_id;
    
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
    const shopId = req.user.shop_id;
    
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
    const shopId = req.user.shop_id;
    
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
    const shopId = req.user.shop_id;
    
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
    const shopId = req.user.shop_id;
    
    await productService.removeImage(imageId, shopId);
    
    return successResponse(res, {
      message: 'Image deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}


// ============================================
// CATEGORIES
// ============================================

/**
 * Get categories
 * GET /api/categories
 */
async function getCategories(req, res, next) {
  try {
    const { tree } = req.query;
    
    let categories;
    if (tree === 'true') {
      categories = await categoryService.getCategoryTree();
    } else {
      categories = await categoryService.getAllCategories({ is_active: true });
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
    const { page, limit, sort } = req.query;
    
    const result = await reviewService.getProductReviews(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sort,
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
 * Create review
 * POST /api/products/:id/reviews
 */
async function createReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
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
    const partnerId = req.user.id;
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

module.exports = {
  // Products
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  
  // Variants
  addVariant,
  updateVariant,
  deleteVariant,
  
  // Inventory
  updateInventory,
  
  // Images
  uploadImages,
  deleteImage,
  
  // Categories
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory: deleteCategoryHandler,
  
  // Admin
  approveProduct,
  rejectProduct,
  requestRevision,
  
  // Reviews
  getReviews,
  createReview,
  replyToReview,
  
  // Wishlist
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
