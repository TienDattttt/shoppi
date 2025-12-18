/**
 * Banner Routes
 * API routes for homepage banner management
 */

const express = require('express');
const router = express.Router();
const bannerController = require('./banner.controller');
const { authenticate, authorize } = require('../auth/auth.middleware');

// Public route - get active banners
router.get('/public', bannerController.getActiveBanners);

// Admin routes
router.get('/', authenticate, authorize('admin'), bannerController.getAllBanners);
router.post('/', authenticate, authorize('admin'), bannerController.createBanner);
router.put('/:id', authenticate, authorize('admin'), bannerController.updateBanner);
router.delete('/:id', authenticate, authorize('admin'), bannerController.deleteBanner);

module.exports = router;
