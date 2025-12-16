/**
 * Location Routes (Public)
 */

const express = require('express');
const router = express.Router();
const locationController = require('./location.controller');

// Public routes - No authentication middleware
router.get('/provinces', locationController.getProvinces);
router.get('/wards', locationController.getWards);
router.get('/post-offices', locationController.getPostOffices);

module.exports = router;
