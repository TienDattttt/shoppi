/**
 * Notification DTOs (Data Transfer Objects)
 * Defines data structures for notification operations and serialization
 */

/**
 * Serialize notification object for API response
 * @param {object} notification - Raw notification object from database
 * @returns {object|null} Serialized notification
 */
function serializeNotification(notification) {
  if (!notification) return null;

  return {
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    isRead: notification.is_read || false,
    readAt: notification.read_at ? new Date(notification.read_at).toISOString() : null,
    createdAt: notification.created_at ? new Date(notification.created_at).toISOString() : null,
  };
}

/**
 * Deserialize notification data from API request
 * Converts camelCase to snake_case
 * @param {object} data - Notification data from API request
 * @returns {object|null} Database-ready notification object
 */
function deserializeNotification(data) {
  if (!data) return null;

  return {
    id: data.id,
    user_id: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    data: data.data || {},
    is_read: data.isRead || false,
    read_at: data.readAt || null,
    created_at: data.createdAt || null,
  };
}

/**
 * Serialize notification list with pagination metadata
 * @param {object} result - Query result with data and pagination info
 * @returns {object} Serialized notification list with pagination
 */
function serializeNotificationList(result) {
  if (!result) return { data: [], pagination: {} };

  return {
    data: (result.data || []).map(serializeNotification),
    pagination: {
      total: result.total || 0,
      page: result.page || 1,
      limit: result.limit || 20,
      hasMore: result.hasMore || false,
      totalPages: Math.ceil((result.total || 0) / (result.limit || 20)),
    },
  };
}


/**
 * Serialize device token for API response
 * @param {object} device - Raw device token from database
 * @returns {object|null} Serialized device token
 */
function serializeDeviceToken(device) {
  if (!device) return null;

  return {
    id: device.id,
    userId: device.user_id,
    token: device.token,
    platform: device.platform,
    deviceInfo: device.device_info || {},
    isActive: device.is_active || false,
    lastUsedAt: device.last_used_at ? new Date(device.last_used_at).toISOString() : null,
    createdAt: device.created_at ? new Date(device.created_at).toISOString() : null,
  };
}

/**
 * Serialize notification preferences for API response
 * @param {object} preferences - Raw preferences from database
 * @returns {object|null} Serialized preferences
 */
function serializePreferences(preferences) {
  if (!preferences) return null;

  return {
    id: preferences.id,
    userId: preferences.user_id,
    pushEnabled: preferences.push_enabled ?? true,
    inAppEnabled: preferences.in_app_enabled ?? true,
    orderUpdates: preferences.order_updates ?? true,
    promotions: preferences.promotions ?? true,
    priceDrops: preferences.price_drops ?? true,
    newReviews: preferences.new_reviews ?? true,
    createdAt: preferences.created_at ? new Date(preferences.created_at).toISOString() : null,
    updatedAt: preferences.updated_at ? new Date(preferences.updated_at).toISOString() : null,
  };
}

/**
 * Deserialize preferences from API request
 * @param {object} data - Preferences data from API request
 * @returns {object|null} Database-ready preferences object
 */
function deserializePreferences(data) {
  if (!data) return null;

  const result = {};

  if (data.pushEnabled !== undefined) result.push_enabled = data.pushEnabled;
  if (data.inAppEnabled !== undefined) result.in_app_enabled = data.inAppEnabled;
  if (data.orderUpdates !== undefined) result.order_updates = data.orderUpdates;
  if (data.promotions !== undefined) result.promotions = data.promotions;
  if (data.priceDrops !== undefined) result.price_drops = data.priceDrops;
  if (data.newReviews !== undefined) result.new_reviews = data.newReviews;

  return result;
}

module.exports = {
  serializeNotification,
  deserializeNotification,
  serializeNotificationList,
  serializeDeviceToken,
  serializePreferences,
  deserializePreferences,
};
