/**
 * Product Routes
 * API endpoint definitions for products, categories, reviews, and wishlist
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const productController = require('./product.controller');
const { authenticate, authorize, optionalAuth } = require('../auth/auth.middleware');
const {
  searchLimiter,
  apiReadLimiter,
  apiWriteLimiter,
  uploadLimiter,
} = require('../../shared/middleware/rate-limit.middleware');

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// ============================================
// PRODUCT ROUTES - /api/products
// ============================================

const productRouter = express.Router();

// Public routes (with rate limiting)
productRouter.get('/', apiReadLimiter, optionalAuth, productController.searchProducts);
productRouter.get('/suggest', searchLimiter, productController.getSuggestions);

// General image upload (for product creation form) - MUST be before /:id routes
productRouter.post('/upload/images', uploadLimiter, authenticate, authorize('partner'), upload.array('images', 10), productController.uploadTempImages);

// Stock check endpoint (for real-time availability) - MUST be before /:id routes
productRouter.get('/stock/check', productController.checkStock);
productRouter.post('/stock/check-cart', productController.checkCartStock);

// Partner inventory management - MUST be before /:id routes
productRouter.get('/inventory', authenticate, authorize('partner'), productController.getShopInventory);
productRouter.patch('/inventory/:variantId', authenticate, authorize('partner'), productController.updateVariantStock);

productRouter.get('/:id', apiReadLimiter, optionalAuth, productController.getProduct);
productRouter.get('/:id/reviews', apiReadLimiter, productController.getReviews);
productRouter.get('/:id/reviews/stats', apiReadLimiter, productController.getReviewStats);

// Partner routes (authenticated with write rate limiting)
productRouter.post('/', apiWriteLimiter, authenticate, authorize('partner'), productController.createProduct);
productRouter.put('/:id', apiWriteLimiter, authenticate, authorize('partner'), productController.updateProduct);
productRouter.delete('/:id', apiWriteLimiter, authenticate, authorize('partner'), productController.deleteProduct);

// Variant routes
productRouter.post('/:id/variants', authenticate, authorize('partner'), productController.addVariant);
productRouter.put('/:id/variants/:variantId', authenticate, authorize('partner'), productController.updateVariant);
productRouter.delete('/:id/variants/:variantId', authenticate, authorize('partner'), productController.deleteVariant);

// Inventory routes
productRouter.put('/:id/inventory', authenticate, authorize('partner'), productController.updateInventory);

// Image routes (with upload rate limiting)
productRouter.post('/:id/images', uploadLimiter, authenticate, authorize('partner'), upload.array('images', 10), productController.uploadImages);
productRouter.delete('/:id/images/:imageId', apiWriteLimiter, authenticate, authorize('partner'), productController.deleteImage);

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

adminRouter.get('/pending', authenticate, authorize('admin'), productController.getPendingProducts);
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
