/**
 * Shipper Mobile Routes
 * API routes for shipper mobile app
 * 
 * Requirements: 13 (Mobile Shipper App API Integration)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const shipperMobileController = require('./shipper-mobile.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// Configure multer for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// ============================================
// SHIPMENT ROUTES (Requirements: 13.2, 13.3)
// ============================================

/**
 * GET /api/shipper/shipments
 * Get shipments for current shipper
 * Filter by status (pending, active, completed)
 * Requirements: 13.2
 */
router.get('/shipments', shipperMobileController.getShipments);

/**
 * GET /api/shipper/shipments/:id
 * Get shipment details
 */
router.get('/shipments/:id', shipperMobileController.getShipmentById);

/**
 * POST /api/shipper/shipments/:id/status
 * Update shipment status
 * Requirements: 7.1, 8.1, 13.3
 */
router.post('/shipments/:id/status', shipperMobileController.updateShipmentStatus);

/**
 * POST /api/shipper/shipments/:id/reject
 * Reject assigned shipment
 * Requirements: 3.4
 */
router.post('/shipments/:id/reject', shipperMobileController.rejectShipment);

// ============================================
// BARCODE SCAN ROUTES (Pickup & Delivery)
// ============================================

/**
 * POST /api/shipper/shipments/scan/validate
 * Validate barcode/tracking number without updating status
 * Returns shipment info if valid and assigned to shipper
 */
router.post('/shipments/scan/validate', shipperMobileController.validateBarcode);

/**
 * POST /api/shipper/shipments/scan/pickup
 * Scan barcode to confirm pickup at shop
 * Updates status: assigned -> picked_up
 */
router.post('/shipments/scan/pickup', shipperMobileController.scanPickup);

/**
 * POST /api/shipper/shipments/scan/delivery
 * Scan barcode to confirm delivery to customer
 * Requires: photoUrl, codCollected (for COD orders)
 * Updates status: delivering -> delivered
 */
router.post('/shipments/scan/delivery', shipperMobileController.scanDelivery);

/**
 * POST /api/shipper/shipments/scan/batch-pickup
 * Batch scan multiple packages for pickup at shop
 * Max 50 packages per batch
 */
router.post('/shipments/scan/batch-pickup', shipperMobileController.batchScanPickup);

// ============================================
// PHOTO UPLOAD ROUTES (Requirements: 13.6)
// ============================================

/**
 * POST /api/shipper/upload/photo
 * Upload delivery/pickup photo to Supabase Storage
 * Requirements: 13.6 - Capture photo, upload to Supabase Storage
 */
router.post('/upload/photo', upload.single('photo'), shipperMobileController.uploadPhoto);

// ============================================
// LOCATION ROUTES (Requirements: 4.1, 13.4)
// ============================================

/**
 * POST /api/shipper/location
 * Update shipper location
 * Requirements: 4.1, 13.4
 */
router.post('/location', shipperMobileController.updateLocation);

// ============================================
// EARNINGS ROUTES (Requirements: 10.1, 10.3)
// ============================================

/**
 * GET /api/shipper/earnings
 * Get shipper earnings for date range
 * Requirements: 10.1, 10.3
 */
router.get('/earnings', shipperMobileController.getEarnings);

// ============================================
// COD ROUTES (Requirements: 6.4)
// ============================================

/**
 * GET /api/shipper/cod-balance
 * Get shipper's daily COD balance for reconciliation
 * Requirements: 6.4
 */
router.get('/cod-balance', shipperMobileController.getCodBalance);

// ============================================
// DASHBOARD/STATISTICS ROUTES (Requirements: 9.1, 9.4)
// ============================================

/**
 * GET /api/shipper/dashboard
 * Get shipper dashboard with statistics
 * Requirements: 9.4 - Display success rate, average rating, and daily statistics
 */
router.get('/dashboard', shipperMobileController.getDashboard);

/**
 * GET /api/shipper/statistics
 * Get detailed statistics for shipper
 * Requirements: 9.1, 9.4
 */
router.get('/statistics', shipperMobileController.getStatistics);

module.exports = router;
