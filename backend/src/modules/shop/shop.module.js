/**
 * Shop Module Entry Point
 * Exports all shop-related components for Shop & Social functionality
 * 
 * Requirements: All (1.1-11.5)
 */

// Routes
const { shopRoutes, userFollowRoutes } = require('./shop.routes');

// Controller
const shopController = require('./shop.controller');

// Services
const shopService = require('./shop.service');
const followService = require('./follow.service');

// Repositories
const shopRepository = require('./shop.repository');
const followRepository = require('./follow.repository');

// DTOs
const shopDTO = require('./shop.dto');

// Validators
const shopValidator = require('./shop.validator');

/**
 * Initialize shop module
 * Mounts shop routes to the Express application
 * @param {Express} app - Express application instance
 */
function initializeModule(app) {
  // Mount shop routes at /api/shops
  app.use('/api/shops', shopRoutes);
  
  // Mount user follow routes at /api/users (for /api/users/me/following)
  app.use('/api/users', userFollowRoutes);
  
  console.log('Shop module initialized');
}

module.exports = {
  // Module initializer
  initializeModule,
  
  // Routes
  shopRoutes,
  userFollowRoutes,
  
  // Controller
  shopController,
  
  // Services
  shopService,
  followService,
  
  // Repositories
  shopRepository,
  followRepository,
  
  // DTOs & Validators
  shopDTO,
  shopValidator,
};
