/**
 * Product Module Entry Point
 * Exports all product-related components for use in the application
 */

// Routes
const { productRouter, categoryRouter, adminRouter, wishlistRouter } = require('./product.routes');

// Controller
const productController = require('./product.controller');

// Services
const productService = require('./product.service');
const categoryService = require('./services/category.service');
const inventoryService = require('./services/inventory.service');
const searchService = require('./services/search.service');
const reviewService = require('./services/review.service');
const wishlistService = require('./services/wishlist.service');
const approvalService = require('./services/approval.service');
const viewService = require('./services/view.service');

// Repository
const productRepository = require('./product.repository');
const categoryRepository = require('./category.repository');

// DTOs
const productDTO = require('./product.dto');

// Validators
const productValidator = require('./product.validator');

/**
 * Initialize product module
 * @param {Express} app - Express application instance
 */
function initializeModule(app) {
  // Mount routes
  app.use('/api/products', productRouter);
  app.use('/api/categories', categoryRouter);
  app.use('/api/admin/products', adminRouter);
  app.use('/api/wishlist', wishlistRouter);
  
  console.log('Product module initialized');
}

module.exports = {
  // Initialize
  initializeModule,
  
  // Routes
  productRouter,
  categoryRouter,
  adminRouter,
  wishlistRouter,
  
  // Controller
  productController,
  
  // Services
  productService,
  categoryService,
  inventoryService,
  searchService,
  reviewService,
  wishlistService,
  approvalService,
  viewService,
  
  // Repository
  productRepository,
  categoryRepository,
  
  // DTOs
  productDTO,
  
  // Validators
  productValidator,
};
