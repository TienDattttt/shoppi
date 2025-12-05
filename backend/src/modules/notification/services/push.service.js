/**
 * Push Service
 * Handles sending push notifications via Firebase Cloud Messaging
 */

const { sendToDevice, sendToDevices } = require('../../../shared/firebase/firebase.client');
const notificationRepository = require('../notification.repository');

/**
 * Handle FCM error and mark invalid tokens
 * @param {Error} error - FCM error
 * @param {string} token - Device token that caused the error
 * @returns {Promise<void>}
 */
async function handleFCMError(error, token) {
  // Check if token is invalid
  if (
    error.code === 'INVALID_TOKEN' ||
    error.code === 'messaging/invalid-registration-token' ||
    error.code === 'messaging/registration-token-not-registered'
  ) {
    // Mark token as invalid in database
    await notificationRepository.markTokenInvalid(token);
    console.log(`Marked invalid token: ${token.substring(0, 20)}...`);
  }
}

/**
 * Send push notification to a single user (all their devices)
 * @param {string} userId - User ID
 * @param {object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {object} [payload.data] - Additional data payload
 * @returns {Promise<{success: boolean, sentCount: number, failedCount: number}>}
 */
async function sendPush(userId, payload) {
  // Get all active device tokens for the user
  const devices = await notificationRepository.getDevicesByUser(userId);

  if (devices.length === 0) {
    return { success: true, sentCount: 0, failedCount: 0, message: 'No devices registered' };
  }

  const tokens = devices.map(d => d.token);
  let sentCount = 0;
  let failedCount = 0;

  // Send to each device
  for (const device of devices) {
    try {
      await sendToDevice(device.token, payload);
      sentCount++;
      
      // Update last used timestamp
      await notificationRepository.updateTokenLastUsed(device.token);
    } catch (error) {
      failedCount++;
      await handleFCMError(error, device.token);
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    failedCount,
    totalDevices: devices.length,
  };
}


/**
 * Send push notification to multiple users (batch)
 * @param {string[]} userIds - Array of user IDs
 * @param {object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {object} [payload.data] - Additional data payload
 * @returns {Promise<{success: boolean, successCount: number, failureCount: number, invalidTokens: string[]}>}
 */
async function sendBatchPush(userIds, payload) {
  if (userIds.length === 0) {
    return { success: true, successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  // Collect all device tokens for all users
  const allTokens = [];
  for (const userId of userIds) {
    const devices = await notificationRepository.getDevicesByUser(userId);
    allTokens.push(...devices.map(d => d.token));
  }

  if (allTokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0, invalidTokens: [], message: 'No devices registered' };
  }

  // Use batch API for efficiency
  const result = await sendToDevices(allTokens, payload);

  // Mark invalid tokens
  if (result.invalidTokens && result.invalidTokens.length > 0) {
    for (const token of result.invalidTokens) {
      await notificationRepository.markTokenInvalid(token);
    }
  }

  return {
    success: result.successCount > 0,
    successCount: result.successCount,
    failureCount: result.failureCount,
    invalidTokens: result.invalidTokens || [],
    totalTokens: allTokens.length,
  };
}

/**
 * Send push notification to specific device tokens
 * @param {string[]} tokens - Array of device tokens
 * @param {object} payload - Notification payload
 * @returns {Promise<object>}
 */
async function sendToTokens(tokens, payload) {
  if (tokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0 };
  }

  const result = await sendToDevices(tokens, payload);

  // Mark invalid tokens
  if (result.invalidTokens && result.invalidTokens.length > 0) {
    for (const token of result.invalidTokens) {
      await notificationRepository.markTokenInvalid(token);
    }
  }

  return result;
}

module.exports = {
  sendPush,
  sendBatchPush,
  sendToTokens,
  handleFCMError,
};
