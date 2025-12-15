/**
 * Shipping Fee Routes
 * API routes for shipping fee calculation
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4 (Shipping Fee Calculation)
 */

const express = require('express');
const router = express.Router();
const shippingFeeController = require('./shipping-fee.controller');

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Calculate shipping fee
 * POST /api/shipping/calculate
 * 
 * Body:
 * - fromAddress: { lat, lng, address?, provinceCode?, wardCode? }
 * - toAddress: { lat, lng, address?, provinceCode?, wardCode? }
 * - weight: number (optional, in kg)
 * - specialHandling: boolean (optional)
 * - discount: number (optional, in VND)
 * 
 * Returns:
 * - fee: number (final fee in VND)
 * - originalFee: number (fee before discount)
 * - discount: number (discount amount)
 * - zoneType: string (same_district, same_city, same_region, different_region)
 * - estimatedDays: number
 * - breakdown: { baseFee, distanceFee, weightFee, surcharge }
 */
router.post('/calculate', shippingFeeController.calculateShippingFee);

/**
 * Get all shipping zones with pricing
 * GET /api/shipping/zones
 * 
 * Returns list of shipping zones with:
 * - zoneType: string
 * - zoneLabel: string (Vietnamese)
 * - baseFee: number
 * - perKmFee: number
 * - estimatedDays: number
 */
router.get('/zones', shippingFeeController.getShippingZones);

module.exports = router;
