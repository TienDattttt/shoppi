/**
 * Shop Module - Public API
 * 
 * This file defines the public interface for the shop module.
 * Other modules should only import from this file, not from internal files.
 */

// Services (Public API)
const shopService = require('./shop.service');
const followService = require('./follow.service');

// Routes
const shopRoutes = require('./shop.routes');

// Module initialization
const shopModule = require('./shop.module');

// DTOs (for serialization)
const shopDTO = require('./shop.dto');

module.exports = {
  // Services
  shopService,
  followService,
  
  // Routes
  routes: shopRoutes,
  
  // Module
  initialize: shopModule.initializeModule,
  
  // DTOs
  shopDTO,
};
