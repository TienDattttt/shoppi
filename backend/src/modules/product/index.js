/**
 * Product Module - Public API
 * 
 * This file defines the public interface for the product module.
 * Other modules should only import from this file, not from internal files.
 */

// Services (Public API)
const productService = require('./product.service');
const categoryService = require('./services/category.service');
const searchService = require('./services/search.service');
const reviewService = require('./services/review.service');
const wishlistService = require('./services/wishlist.service');
const inventoryService = require('./services/inventory.service');
const approvalService = require('./services/approval.service');
const viewService = require('./services/view.service');

// Routes
const productRoutes = require('./product.routes');

// Module initialization
const productModule = require('./product.module');

// DTOs (for serialization)
const productDTO = require('./product.dto');

module.exports = {
  // Services
  productService,
  categoryService,
  searchService,
  reviewService,
  wishlistService,
  inventoryService,
  approvalService,
  viewService,
  
  // Routes
  routes: productRoutes,
  
  // Module
  initialize: productModule.initializeModule,
  
  // DTOs
  productDTO,
};
