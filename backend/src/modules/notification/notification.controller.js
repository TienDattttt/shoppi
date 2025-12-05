/**
 * Notification Controller
 * HTTP request handlers for notification endpoints
 */

const notificationService = require('./notification.service');
const notificationRepository = require('./notification.repository');
const preferenceService = require('./services/preference.service');
const { sendSuccess, sendCreated, sendError } = require('../../shared/utils/response.util');

/**
 * Get notifications for current user
 * GET /api/notifications
 */
async function getNotifications(req, res) {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20, type, unreadOnly } = req.query;

    const options = {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100),
      type,
      unreadOnly: unreadOnly === 'true',
    };

    const result = await notificationService.getNotifications(userId, options);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'NOTIFICATION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const { userId } = req.user;
    const count = await notificationService.getUnreadCount(userId);
    return sendSuccess(res, { count });
  } catch (error) {
    return sendError(res, error.code || 'NOTIFICATION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
async function markAsRead(req, res) {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);
    return sendSuccess(res, { notification });
  } catch (error) {
    return sendError(res, error.code || 'NOTIFICATION_ERROR', error.message, error.statusCode || 400);
  }
}


/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res) {
  try {
    const { userId } = req.user;
    const result = await notificationService.markAllAsRead(userId);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'NOTIFICATION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
async function deleteNotification(req, res) {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    await notificationService.deleteNotification(id, userId);
    return sendSuccess(res, { message: 'Notification deleted successfully' });
  } catch (error) {
    return sendError(res, error.code || 'NOTIFICATION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Register device token for push notifications
 * POST /api/devices
 */
async function registerDevice(req, res) {
  try {
    const { userId } = req.user;
    const { token, platform, deviceInfo } = req.body;

    const device = await notificationRepository.registerDevice({
      user_id: userId,
      token,
      platform,
      device_info: deviceInfo || {},
    });

    return sendCreated(res, { device });
  } catch (error) {
    return sendError(res, error.code || 'DEVICE_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Remove device token
 * DELETE /api/devices/:token
 */
async function removeDevice(req, res) {
  try {
    const { userId } = req.user;
    const { token } = req.params;

    await notificationRepository.removeDevice(userId, token);
    return sendSuccess(res, { message: 'Device removed successfully' });
  } catch (error) {
    return sendError(res, error.code || 'DEVICE_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Get user's registered devices
 * GET /api/devices
 */
async function getDevices(req, res) {
  try {
    const { userId } = req.user;
    const devices = await notificationRepository.getDevicesByUser(userId);
    return sendSuccess(res, { devices });
  } catch (error) {
    return sendError(res, error.code || 'DEVICE_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
async function getPreferences(req, res) {
  try {
    const { userId } = req.user;
    const preferences = await preferenceService.getPreferences(userId);
    return sendSuccess(res, { preferences });
  } catch (error) {
    return sendError(res, error.code || 'PREFERENCE_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
async function updatePreferences(req, res) {
  try {
    const { userId } = req.user;
    const preferences = await preferenceService.updatePreferences(userId, req.body);
    return sendSuccess(res, { preferences });
  } catch (error) {
    return sendError(res, error.code || 'PREFERENCE_ERROR', error.message, error.statusCode || 400);
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerDevice,
  removeDevice,
  getDevices,
  getPreferences,
  updatePreferences,
};
