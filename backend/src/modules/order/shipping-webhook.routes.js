/**
 * Shipping Webhook Routes
 * Handles webhooks from external shipping providers
 * 
 * Feature: shipping-provider-integration
 * Requirements: 4.1
 */

const express = require('express');
const router = express.Router();
const shippingWebhookController = require('./shipping-webhook.controller');

/**
 * GHTK Webhook
 * POST /api/webhooks/shipping/ghtk
 */
router.post('/ghtk', shippingWebhookController.handleGHTKWebhook);

/**
 * GHN Webhook (placeholder for future)
 * POST /api/webhooks/shipping/ghn
 */
router.post('/ghn', shippingWebhookController.handleGHNWebhook);

/**
 * Viettel Post Webhook (placeholder for future)
 * POST /api/webhooks/shipping/vtp
 */
router.post('/vtp', shippingWebhookController.handleVTPWebhook);

module.exports = router;
