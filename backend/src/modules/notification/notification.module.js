/**
 * Notification Module Entry Point
 * Exports all notification-related components
 */

// Routes
const { notificationRouter, deviceRouter } = require('./notification.routes');

// Controller
const notificationController = require('./notification.controller');

// Services
const notificationService = require('./notification.service');
const pushService = require('./services/push.service');
const templateService = require('./services/template.service');
const preferenceService = require('./services/preference.service');

// Repository
const notificationRepository = require('./notification.repository');

// DTOs
const notificationDTO = require('./notification.dto');

// Validators
const notificationValidator = require('./notification.validator');

// Triggers
const orderTriggers = require('./triggers/order.triggers');
const partnerTriggers = require('./triggers/partner.triggers');
const shipperTriggers = require('./triggers/shipper.triggers');
const promoTriggers = require('./triggers/promo.triggers');
const shopTriggers = require('./triggers/shop.triggers');

/**
 * Initialize notification module
 * @param {Express} app - Express application instance
 */
function initializeModule(app) {
  app.use('/api/notifications', notificationRouter);
  app.use('/api/devices', deviceRouter);
  
  console.log('Notification module initialized');
}

module.exports = {
  // Module initializer
  initializeModule,
  
  // Routes
  notificationRouter,
  deviceRouter,
  
  // Controller
  notificationController,
  
  // Services
  notificationService,
  pushService,
  templateService,
  preferenceService,
  
  // Repository
  notificationRepository,
  
  // DTOs & Validators
  notificationDTO,
  notificationValidator,
  
  // Triggers
  triggers: {
    order: orderTriggers,
    partner: partnerTriggers,
    shipper: shipperTriggers,
    promo: promoTriggers,
    shop: shopTriggers,
  },
};
