/**
 * Notification Service
 * Core business logic for notification management
 */

const notificationRepository = require('./notification.repository');
const pushService = require('./services/push.service');

/**
 * Send a notification to a user
 * Creates in-app notification and optionally sends push notification
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {object} data - Notification data
 * @param {string} data.title - Notification title
 * @param {string} data.body - Notification body
 * @param {object} [data.payload] - Additional data payload
 * @param {boolean} [data.sendPush=true] - Whether to send push notification
 * @returns {Promise<object>} Created notification
 */
async function send(userId, type, data) {
  const { title, body, payload = {}, sendPush = true } = data;

  // Create in-app notification
  const notification = await notificationRepository.createNotification({
    user_id: userId,
    type,
    title,
    body,
    data: payload,
  });

  // Send push notification if enabled
  if (sendPush) {
    try {
      await pushService.sendPush(userId, {
        title,
        body,
        data: { notificationId: notification.id, type, ...payload },
      });
    } catch (error) {
      // Log error but don't fail the notification creation
      console.error(`Failed to send push notification: ${error.message}`);
    }
  }

  return notification;
}

/**
 * Send notifications to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {string} type - Notification type
 * @param {object} data - Notification data
 * @param {string} data.title - Notification title
 * @param {string} data.body - Notification body
 * @param {object} [data.payload] - Additional data payload
 * @param {boolean} [data.sendPush=true] - Whether to send push notifications
 * @returns {Promise<{notifications: object[], pushResult: object}>}
 */
async function sendBulk(userIds, type, data) {
  const { title, body, payload = {}, sendPush = true } = data;

  // Create in-app notifications for all users
  const notificationsData = userIds.map(userId => ({
    user_id: userId,
    type,
    title,
    body,
    data: payload,
  }));

  const notifications = await notificationRepository.createNotificationsBulk(notificationsData);

  // Send push notifications if enabled
  let pushResult = { success: true, successCount: 0, failureCount: 0 };
  if (sendPush && userIds.length > 0) {
    try {
      pushResult = await pushService.sendBatchPush(userIds, {
        title,
        body,
        data: { type, ...payload },
      });
    } catch (error) {
      console.error(`Failed to send batch push notifications: ${error.message}`);
      pushResult = { success: false, error: error.message };
    }
  }

  return { notifications, pushResult };
}


/**
 * Get notifications for a user with pagination
 * @param {string} userId - User ID
 * @param {object} [options] - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=20] - Items per page
 * @param {string} [options.type] - Filter by notification type
 * @param {boolean} [options.unreadOnly] - Filter unread only
 * @returns {Promise<{data: object[], total: number, page: number, limit: number, hasMore: boolean}>}
 */
async function getNotifications(userId, options = {}) {
  const result = await notificationRepository.getNotificationsByUser(userId, options);

  return {
    ...result,
    hasMore: result.page * result.limit < result.total,
  };
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<object>} Updated notification
 */
async function markAsRead(notificationId, userId) {
  // Verify notification exists and belongs to user
  const notification = await notificationRepository.findNotificationById(notificationId);

  if (!notification) {
    const error = new Error('Notification not found');
    error.code = 'NOTIFICATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (notification.user_id !== userId) {
    const error = new Error('Notification not found');
    error.code = 'NOTIFICATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  // Already read, return as is
  if (notification.is_read) {
    return notification;
  }

  return notificationRepository.markAsRead(notificationId, userId);
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<{updatedCount: number}>}
 */
async function markAllAsRead(userId) {
  const updatedCount = await notificationRepository.markAllAsRead(userId);
  return { updatedCount };
}

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<{count: number}>}
 */
async function getUnreadCount(userId) {
  const count = await notificationRepository.getUnreadCount(userId);
  return { count };
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<void>}
 */
async function deleteNotification(notificationId, userId) {
  // Verify notification exists and belongs to user
  const notification = await notificationRepository.findNotificationById(notificationId);

  if (!notification) {
    const error = new Error('Notification not found');
    error.code = 'NOTIFICATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (notification.user_id !== userId) {
    const error = new Error('Notification not found');
    error.code = 'NOTIFICATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  await notificationRepository.deleteNotification(notificationId, userId);
}

module.exports = {
  send,
  sendBulk,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};
