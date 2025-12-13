/**
 * Shipment Routes
 * API routes for shipment management
 * 
 * Requirements: 5 (Shipment Management)
 */

const express = require('express');
const router = express.Router();
const shipperController = require('./shipper.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// ============================================
// PUBLIC ROUTES
// ============================================

// Track shipment by tracking number (public)
router.get('/track/:trackingNumber', shipperController.trackShipment);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

router.use(authenticate);

// Get shipments (filtered by role)
router.get('/', shipperController.getShipments);

// Get active shipments for current shipper
router.get('/active', authorize('shipper'), shipperController.getActiveShipments);

// Get shipment by ID
router.get('/:id', shipperController.getShipmentById);

// Get tracking history for shipment
router.get('/:id/tracking', shipperController.getTrackingHistory);

// Get real-time location for shipment
router.get('/:id/location', shipperController.getShipmentLocation);

// Update shipment status (shipper only)
router.patch('/:id/status', authorize('shipper'), shipperController.updateShipmentStatus);

// Assign shipper to shipment (admin only)
router.post('/:id/assign', authorize('admin'), shipperController.assignShipper);

// Auto-assign nearest shipper (admin only)
router.post('/:id/auto-assign', authorize('admin'), shipperController.autoAssignShipper);

// Rate shipment delivery (customer)
router.post('/:id/rate', shipperController.rateShipment);

module.exports = router;
