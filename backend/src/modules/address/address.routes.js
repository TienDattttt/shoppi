/**
 * Address Routes
 * API routes cho địa chỉ autocomplete và geocoding
 */

const express = require('express');
const router = express.Router();
const addressController = require('./address.controller');
const { authenticate } = require('../auth/auth.middleware');

// Public routes (no auth required for autocomplete)
router.get('/autocomplete', addressController.autocomplete);
router.get('/place/:placeId', addressController.getPlaceDetail);

// Protected routes
router.get('/geocode', authenticate, addressController.geocode);
router.get('/reverse-geocode', authenticate, addressController.reverseGeocode);
router.get('/distance', authenticate, addressController.getDistance);

module.exports = router;
