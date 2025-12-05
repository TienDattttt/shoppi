/**
 * Notification Repository
 * Data access layer for notification and device token operations
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

/**
 * Device Token Repository Methods
 */

/**
 * Register a device token for push notifications
 * @param {object} deviceData - Device registration data
 * @param {string} deviceData.user_id - User ID
 * @param {string} deviceData.token - FCM device token
 * @param {string} deviceData.platform - Platform type (ios, android, web)
 * @param {object} [deviceData.device_info] - Additional device information
 * @returns {Promise<object>} Registered device token
 */
async function registerDevice(deviceData) {
  const { user_id, token, platform, device_info = {} } = deviceData;

  // Upsert: update if exists, insert if not
  const { data, error } = await supabaseAdmin
    .from('device_tokens')
    .upsert(
      {
        user_id,
        token,
        platform,
        device_info,
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,token',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register device: ${error.message}`);
  }

  return data;
}

/**
 * Remove a device token
 * @param {string} userId - User ID
 * @param {string} token - Device token to remove
 * @returns {Promise<void>}
 */
async function removeDevice(userId, token) {
  const { error } = await supabaseAdmin
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (error) {
    throw new Error(`Failed to remove device: ${error.message}`);
  }
}


/**
 * Get all active device tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<object[]>} Array of device tokens
 */
async function getDevicesByUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('device_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_used_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get devices: ${error.message}`);
  }

  return data || [];
}

/**
 * Mark a device token as invalid/inactive
 * @param {string} token - Device token to mark invalid
 * @returns {Promise<void>}
 */
async function markTokenInvalid(token) {
  const { error } = await supabaseAdmin
    .from('device_tokens')
    .update({ is_active: false })
    .eq('token', token);

  if (error) {
    throw new Error(`Failed to mark token invalid: ${error.message}`);
  }
}

/**
 * Update last used timestamp for a device token
 * @param {string} token - Device token
 * @returns {Promise<void>}
 */
async function updateTokenLastUsed(token) {
  const { error } = await supabaseAdmin
    .from('device_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', token);

  if (error) {
    throw new Error(`Failed to update token: ${error.message}`);
  }
}

/**
 * Remove all device tokens for a user (used on logout from all devices)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function removeAllUserDevices(userId) {
  const { error } = await supabaseAdmin
    .from('device_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to remove user devices: ${error.message}`);
  }
}

/**
 * Notification Repository Methods
 */

/**
 * Create a new notification
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} Created notification
 */
async function createNotification(notificationData) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      id: notificationData.id || uuidv4(),
      user_id: notificationData.user_id,
      type: notificationData.type,
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data;
}

/**
 * Create multiple notifications in bulk
 * @param {object[]} notifications - Array of notification data
 * @returns {Promise<object[]>} Created notifications
 */
async function createNotificationsBulk(notifications) {
  const notificationsToInsert = notifications.map((n) => ({
    id: n.id || uuidv4(),
    user_id: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data || {},
  }));

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert(notificationsToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to create notifications: ${error.message}`);
  }

  return data || [];
}


/**
 * Get notifications for a user with pagination
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=20] - Items per page
 * @param {string} [options.type] - Filter by notification type
 * @param {boolean} [options.unreadOnly] - Filter unread only
 * @returns {Promise<{data: object[], total: number, page: number, limit: number}>}
 */
async function getNotificationsByUser(userId, options = {}) {
  const { page = 1, limit = 20, type, unreadOnly } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    query = query.eq('type', type);
  }

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to get notifications: ${error.message}`);
  }

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
  };
}

/**
 * Find notification by ID
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object|null>}
 */
async function findNotificationById(notificationId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find notification: ${error.message}`);
  }

  return data || null;
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<object>}
 */
async function markAsRead(notificationId, userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }

  return data;
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of updated notifications
 */
async function markAllAsRead(userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select();

  if (error) {
    throw new Error(`Failed to mark all as read: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
async function getUnreadCount(userId) {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<void>}
 */
async function deleteNotification(notificationId, userId) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete notification: ${error.message}`);
  }
}

/**
 * Delete old notifications (cleanup job)
 * @param {number} daysOld - Delete notifications older than this many days
 * @returns {Promise<number>} Number of deleted notifications
 */
async function deleteOldNotifications(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select();

  if (error) {
    throw new Error(`Failed to delete old notifications: ${error.message}`);
  }

  return data?.length || 0;
}


module.exports = {
  // Device token operations
  registerDevice,
  removeDevice,
  getDevicesByUser,
  markTokenInvalid,
  updateTokenLastUsed,
  removeAllUserDevices,

  // Notification operations
  createNotification,
  createNotificationsBulk,
  getNotificationsByUser,
  findNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  deleteOldNotifications,
};
