/**
 * Product Routes
 * API endpoint definitions for products, categories, reviews, and wishlist
 */

const express = require('express');
const router = express.Router();
const productController = require('./product.controller');
const { authenticate, authorize, optionalAuth } = require('../auth/auth.middleware');

// ============================================
// PRODUCT ROUTES - /api/products
// ============================================

const productRouter = express.Router();

// Public routes
productRouter.get('/', optionalAuth, productController.searchProducts);
productRouter.get('/:id', optionalAuth, productController.getProduct);
productRouter.get('/:id/reviews', productController.getReviews);

// Partner routes (authenticated)
productRouter.post('/', authenticate, authorize('partner'), productController.createProduct);
productRouter.put('/:id', authenticate, authorize('partner'), productController.updateProduct);
productRouter.delete('/:id', authenticate, authorize('partner'), productController.deleteProduct);

// Variant routes
productRouter.post('/:id/variants', authenticate, authorize('partner'), productController.addVariant);
productRouter.put('/:id/variants/:variantId', authenticate, authorize('partner'), productController.updateVariant);
productRouter.delete('/:id/variants/:variantId', authenticate, authorize('partner'), productController.deleteVariant);

// Inventory routes
productRouter.put('/:id/inventory', authenticate, authorize('partner'), productController.updateInventory);

// Image routes
productRouter.post('/:id/images', authenticate, authorize('partner'), productController.uploadImages);
productRouter.delete('/:id/images/:imageId', authenticate, authorize('partner'), productController.deleteImage);

// Review routes (Customer)
productRouter.post('/:id/reviews', authenticate, authorize('customer'), productController.createReview);
productRouter.post('/:id/reviews/:reviewId/reply', authenticate, authorize('partner'), productController.replyToReview);


// ============================================
// CATEGORY ROUTES - /api/categories
// ============================================

const categoryRouter = express.Router();

// Public routes
categoryRouter.get('/', productController.getCategories);
categoryRouter.get('/:id', productController.getCategory);

// Admin routes
categoryRouter.post('/', authenticate, authorize('admin'), productController.createCategory);
categoryRouter.put('/:id', authenticate, authorize('admin'), productController.updateCategory);
categoryRouter.delete('/:id', authenticate, authorize('admin'), productController.deleteCategory);

// ============================================
// ADMIN ROUTES - /api/admin/products
// ============================================

const adminRouter = express.Router();

adminRouter.post('/:id/approve', authenticate, authorize('admin'), productController.approveProduct);
adminRouter.post('/:id/reject', authenticate, authorize('admin'), productController.rejectProduct);
adminRouter.post('/:id/revision', authenticate, authorize('admin'), productController.requestRevision);

// ============================================
// WISHLIST ROUTES - /api/wishlist
// ============================================

const wishlistRouter = express.Router();

wishlistRouter.get('/', authenticate, productController.getWishlist);
wishlistRouter.post('/:productId', authenticate, productController.addToWishlist);
wishlistRouter.delete('/:productId', authenticate, productController.removeFromWishlist);

// ============================================
// EXPORTS
// ============================================

module.exports = {
  productRouter,
  categoryRouter,
  adminRouter,
  wishlistRouter,
};
