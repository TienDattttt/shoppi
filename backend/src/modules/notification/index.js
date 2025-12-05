/**
 * Notification Module - Public API
 * 
 * This file defines the public interface for the notification module.
 * Other modules should only import from this file, not from internal files.
 */

// Services (Public API)
const notificationService = require('./notification.service');
const pushService = require('./services/push.service');
const templateService = require('./services/template.service');
const preferenceService = require('./services/preference.service');

// Routes
const notificationRoutes = require('./notification.routes');

// Module initialization
const notificationModule = require('./notification.module');

// DTOs (for serialization)
const notificationDTO = require('./notification.dto');

module.exports = {
  // Services
  notificationService,
  pushService,
  templateService,
  preferenceService,
  
  // Routes
  routes: notificationRoutes,
  
  // Module
  initialize: notificationModule.initializeModule,
  
  // DTOs
  notificationDTO,
};
