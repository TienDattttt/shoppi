/**
 * Shipper Module
 * Entry point for shipper module
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Management)
 */

const shipperRoutes = require('./shipper.routes');
const shipmentRoutes = require('./shipment.routes');
const shipperService = require('./shipper.service');
const shipmentService = require('./shipment.service');
const locationService = require('./location.service');
const trackingService = require('./tracking.service');
const assignmentService = require('./assignment.service');
const shipperRepository = require('./shipper.repository');
const shipmentRepository = require('./shipment.repository');
const shipperDto = require('./shipper.dto');
const shipperValidator = require('./shipper.validator');

/**
 * Initialize shipper module
 * @param {Express} app - Express application
 */
function initializeModule(app) {
  // Mount routes
  app.use('/api/shippers', shipperRoutes);
  app.use('/api/shipments', shipmentRoutes);
  
  console.log('[ShipperModule] Routes mounted: /api/shippers, /api/shipments');
}

/**
 * Get module info
 * @returns {Object}
 */
function getModuleInfo() {
  return {
    name: 'shipper',
    version: '1.0.0',
    description: 'Shipper and shipment management module',
    routes: [
      'POST /api/shippers - Create shipper profile',
      'GET /api/shippers/me - Get own shipper profile',
      'GET /api/shippers/pending - Get pending shippers (admin)',
      'GET /api/shippers/nearby - Find nearby shippers',
      'GET /api/shippers/:id - Get shipper by ID',
      'PATCH /api/shippers/:id - Update shipper',
      'POST /api/shippers/:id/approve - Approve shipper (admin)',
      'POST /api/shippers/:id/suspend - Suspend shipper (admin)',
      'POST /api/shippers/:id/reactivate - Reactivate shipper (admin)',
      'POST /api/shippers/:id/online - Go online',
      'POST /api/shippers/:id/offline - Go offline',
      'POST /api/shippers/:id/location - Update location',
      'GET /api/shippers/:id/location - Get shipper location',
      '',
      'GET /api/shipments - Get shipments',
      'GET /api/shipments/active - Get active shipments',
      'GET /api/shipments/track/:trackingNumber - Track shipment',
      'GET /api/shipments/:id - Get shipment by ID',
      'GET /api/shipments/:id/tracking - Get tracking history',
      'GET /api/shipments/:id/location - Get shipment location',
      'PATCH /api/shipments/:id/status - Update shipment status',
      'POST /api/shipments/:id/assign - Assign shipper (admin)',
      'POST /api/shipments/:id/auto-assign - Auto-assign shipper (admin)',
      'POST /api/shipments/:id/rate - Rate delivery',
    ],
  };
}

module.exports = {
  // Initialize
  initializeModule,
  getModuleInfo,
  
  // Routes
  shipperRoutes,
  shipmentRoutes,
  
  // Services
  shipperService,
  shipmentService,
  locationService,
  trackingService,
  assignmentService,
  
  // Repositories
  shipperRepository,
  shipmentRepository,
  
  // DTOs and Validators
  shipperDto,
  shipperValidator,
};
