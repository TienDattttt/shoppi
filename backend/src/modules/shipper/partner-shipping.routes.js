/**
 * Partner Shipping Routes
 * API routes for partner shipping management
 * 
 * Requirements: 2 (Partner Shipment Management)
 */

const express = require('express');
const router = express.Router();
const partnerShippingController = require('./partner-shipping.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// All routes require authentication and partner role
router.use(authenticate);
router.use(authorize('partner'));

// ============================================
// PARTNER SHIPPING ENDPOINTS
// ============================================

/**
 * POST /api/partner/shipping/orders/:subOrderId/ready-to-ship
 * Mark sub-order as ready to ship and create shipment
 * Requirements: 2.2
 */
router.post('/orders/:subOrderId/ready-to-ship', partnerShippingController.markReadyToShip);

/**
 * GET /api/partner/shipping/shipments
 * Get partner's shipments with filters
 * Requirements: 2.1, 2.4
 */
router.get('/shipments', partnerShippingController.getPartnerShipments);

/**
 * GET /api/partner/shipping/shipments/:id
 * Get shipment details
 * Requirements: 2.4
 */
router.get('/shipments/:id', partnerShippingController.getShipmentById);

/**
 * POST /api/partner/shipping/shipments/:id/request-pickup
 * Request pickup for a shipment
 * Requirements: 2.6
 */
router.post('/shipments/:id/request-pickup', partnerShippingController.requestPickup);

/**
 * GET /api/partner/shipping/shipments/:id/label
 * Get shipping label data for printing (includes barcode)
 * Returns: tracking number, barcode data, addresses, etc.
 */
router.get('/shipments/:id/label', partnerShippingController.getShippingLabel);

module.exports = router;
