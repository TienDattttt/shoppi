/**
 * Shipper Routes
 * API routes for shipper module
 * 
 * Requirements: 4 (Shipper Management), 5 (Shipment Management)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const shipperController = require('./shipper.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// Configure multer for document uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    },
});

// ============================================
// SHIPPER ROUTES
// ============================================

// Public routes
router.get('/nearby', shipperController.findNearbyShippers);

// Document upload (before authentication for registration flow)
router.post(
    '/upload-documents',
    upload.fields([
        { name: 'idCardFront', maxCount: 1 },
        { name: 'idCardBack', maxCount: 1 },
        { name: 'driverLicense', maxCount: 1 },
    ]),
    shipperController.uploadDocuments
);

// Authenticated routes
router.use(authenticate);

// Shipper profile management
router.post('/', shipperController.createShipper);
router.get('/me', shipperController.getMyShipperProfile);
router.get('/pending', authorize('admin'), shipperController.getPendingShippers);
router.get('/earnings', shipperController.getEarnings);
router.get('/:id', shipperController.getShipperById);
router.patch('/:id', shipperController.updateShipper);

// Admin actions
router.get('/flagged', authorize('admin'), shipperController.getFlaggedShippers);
router.post('/:id/approve', authorize('admin'), shipperController.approveShipper);
router.post('/:id/reject', authorize('admin'), shipperController.rejectShipper);
router.post('/:id/suspend', authorize('admin'), shipperController.suspendShipper);
router.post('/:id/reactivate', authorize('admin'), shipperController.reactivateShipper);
router.post('/:id/clear-flag', authorize('admin'), shipperController.clearShipperFlag);

// Online status
router.post('/:id/online', shipperController.goOnline);
router.post('/:id/offline', shipperController.goOffline);

// Location
router.post('/:id/location', shipperController.updateLocation);
router.get('/:id/location', shipperController.getShipperLocation);

// Ratings (Requirements: 15.3)
router.get('/:id/ratings', shipperController.getShipperRatings);

module.exports = router;

