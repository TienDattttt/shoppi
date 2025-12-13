/**
 * Notification Routes
 * API endpoint definitions for notifications and device management
 */

const express = require('express');
const notificationRouter = express.Router();
const deviceRouter = express.Router();

const notificationController = require('./notification.controller');
const authMiddleware = require('../auth/auth.middleware');
const { validate } = require('./notification.validator');
const {
  registerDeviceSchema,
  updatePreferencesSchema,
} = require('./notification.validator');

/**
 * Notification Routes - /api/notifications
 * All routes require authentication
 */

// Get notifications list (paginated)
notificationRouter.get(
  '/',
  authMiddleware.authenticate,
  notificationController.getNotifications
);

// Get unread count
notificationRouter.get(
  '/unread-count',
  authMiddleware.authenticate,
  notificationController.getUnreadCount
);

// Get notification preferences
notificationRouter.get(
  '/preferences',
  authMiddleware.authenticate,
  notificationController.getPreferences
);

// Update notification preferences
notificationRouter.put(
  '/preferences',
  authMiddleware.authenticate,
  validate(updatePreferencesSchema),
  notificationController.updatePreferences
);

// Mark all notifications as read
notificationRouter.put(
  '/read-all',
  authMiddleware.authenticate,
  notificationController.markAllAsRead
);

// Mark single notification as read
notificationRouter.put(
  '/:id/read',
  authMiddleware.authenticate,
  notificationController.markAsRead
);

// Delete notification
notificationRouter.delete(
  '/:id',
  authMiddleware.authenticate,
  notificationController.deleteNotification
);

// Test endpoint - Send test notification (development only)
notificationRouter.post(
  '/test',
  authMiddleware.authenticate,
  notificationController.sendTestNotification
);

/**
 * Device Routes - /api/devices
 * All routes require authentication
 */

// Get user's devices
deviceRouter.get(
  '/',
  authMiddleware.authenticate,
  notificationController.getDevices
);

// Register device token
deviceRouter.post(
  '/',
  authMiddleware.authenticate,
  validate(registerDeviceSchema),
  notificationController.registerDevice
);

// Remove device token
deviceRouter.delete(
  '/:token',
  authMiddleware.authenticate,
  notificationController.removeDevice
);

module.exports = {
  notificationRouter,
  deviceRouter,
};
