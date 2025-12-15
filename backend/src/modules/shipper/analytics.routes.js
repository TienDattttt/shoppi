/**
 * Delivery Analytics Routes
 * Admin endpoints for delivery analytics and reporting
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5 (Delivery Analytics Dashboard)
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../auth/auth.middleware');
const analyticsController = require('./analytics.controller');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/analytics/dashboard
 * Get comprehensive analytics dashboard data
 * Requirements: 16.1, 16.2, 16.4
 * 
 * Query params:
 * - startDate: ISO date string (optional, defaults to 30 days ago)
 * - endDate: ISO date string (optional, defaults to now)
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * GET /api/admin/analytics/deliveries
 * Get delivery counts by period
 * Requirements: 16.1
 * 
 * Query params:
 * - period: 'daily' | 'weekly' | 'monthly' (default: 'daily')
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get('/deliveries', analyticsController.getDeliveryCounts);

/**
 * GET /api/admin/analytics/success-rate
 * Get success rate and failure breakdown
 * Requirements: 16.2
 * 
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get('/success-rate', analyticsController.getSuccessRate);

/**
 * GET /api/admin/analytics/zones
 * Get zone-based analytics
 * Requirements: 16.4
 * 
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get('/zones', analyticsController.getZoneAnalytics);

/**
 * GET /api/admin/analytics/shipper-ranking
 * Get shipper ranking by various metrics
 * Requirements: 16.3
 * 
 * Query params:
 * - sortBy: 'deliveries' | 'rating' | 'ontime' | 'success' (default: 'deliveries')
 * - limit: number (default: 20)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get('/shipper-ranking', analyticsController.getShipperRanking);

/**
 * GET /api/admin/analytics/export
 * Export delivery statistics
 * Requirements: 16.5
 * 
 * Query params:
 * - format: 'csv' | 'json' (default: 'csv')
 * - type: 'deliveries' | 'shippers' | 'zones' (default: 'deliveries')
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
router.get('/export', analyticsController.exportAnalytics);

module.exports = router;
