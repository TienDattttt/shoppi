/**
 * Shipper Routes
 * API routes for shipper module
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Management)
 */

const express = require('express');
const router = express.Router();
const shipperController = require('./shipper.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// ============================================
// SHIPPER ROUTES
// ============================================

// Public routes
router.get('/nearby', shipperController.findNearbyShippers);

// Authenticated routes
router.use(authenticate);

// Shipper profile management
router.post('/', shipperController.createShipper);
router.get('/me', shipperController.getMyShipperProfile);
router.get('/pending', authorize('admin'), shipperController.getPendingShippers);
router.get('/:id', shipperController.getShipperById);
router.patch('/:id', shipperController.updateShipper);

// Admin actions
router.post('/:id/approve', authorize('admin'), shipperController.approveShipper);
router.post('/:id/suspend', authorize('admin'), shipperController.suspendShipper);
router.post('/:id/reactivate', authorize('admin'), shipperController.reactivateShipper);

// Online status
router.post('/:id/online', shipperController.goOnline);
router.post('/:id/offline', shipperController.goOffline);

// Location
router.post('/:id/location', shipperController.updateLocation);
router.get('/:id/location', shipperController.getShipperLocation);

module.exports = router;
