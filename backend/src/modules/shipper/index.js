/**
 * Shipper Module - Public API
 * 
 * This file defines the public interface for the shipper module.
 * Other modules should only import from this file, not from internal files.
 */

// Services (Public API)
const shipperService = require('./shipper.service');
const shipmentService = require('./shipment.service');
const locationService = require('./location.service');

// Routes
const shipperRoutes = require('./shipper.routes');
const shipmentRoutes = require('./shipment.routes');

// Module initialization
const shipperModule = require('./shipper.module');

// DTOs (for serialization)
const shipperDTO = require('./shipper.dto');

module.exports = {
  // Services
  shipperService,
  shipmentService,
  locationService,
  
  // Routes
  routes: shipperRoutes,
  shipmentRoutes,
  
  // Module
  initialize: shipperModule.initializeModule,
  
  // DTOs
  shipperDTO,
};
