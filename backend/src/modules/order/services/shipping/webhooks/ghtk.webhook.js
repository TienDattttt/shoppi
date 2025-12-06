/**
 * GHTK Webhook Handler
 * Handles status update webhooks from GHTK
 * 
 * Feature: shipping-provider-integration
 * Requirements: 4.1, 4.5
 */

const { getProvider } = require('../provider.factory');
const { ShippingStatus } = require('../shipping.interface');

/**
 * Handle GHTK webhook request
 * @param {Object} payload - Webhook payload from GHTK
 * @param {string} signature - Signature from X-GHTK-Signature header
 * @returns {Object} Processing result
 */
async function handleGHTKWebhook(payload, signature) {
  const provider = getProvider('ghtk');

  // Validate signature
  if (!provider.validateWebhook(payload, signature)) {
    return {
      success: false,
      error: 'Invalid webhook signature',
      statusCode: 401,
    };
  }

  // Parse payload to unified format
  const webhookData = provider.parseWebhookPayload(payload);

  return {
    success: true,
    data: webhookData,
    statusCode: 200,
  };
}

/**
 * Determine if status change should trigger order completion
 * @param {string} status - Unified status
 * @returns {boolean}
 */
function shouldTriggerOrderCompletion(status) {
  return status === ShippingStatus.DELIVERED;
}

/**
 * Determine if status change should trigger return/refund flow
 * @param {string} status - Unified status
 * @returns {boolean}
 */
function shouldTriggerReturnFlow(status) {
  return [
    ShippingStatus.RETURNED,
    ShippingStatus.FAILED,
    ShippingStatus.CANCELLED,
  ].includes(status);
}

/**
 * Get action to take based on status
 * @param {string} status - Unified status
 * @returns {string|null} Action type or null
 */
function getStatusAction(status) {
  switch (status) {
    case ShippingStatus.DELIVERED:
      return 'COMPLETE_ORDER';
    case ShippingStatus.RETURNED:
    case ShippingStatus.FAILED:
      return 'INITIATE_RETURN';
    case ShippingStatus.CANCELLED:
      return 'CANCEL_ORDER';
    case ShippingStatus.PICKED_UP:
      return 'UPDATE_TRACKING';
    case ShippingStatus.DELIVERING:
      return 'UPDATE_TRACKING';
    default:
      return 'UPDATE_STATUS';
  }
}

module.exports = {
  handleGHTKWebhook,
  shouldTriggerOrderCompletion,
  shouldTriggerReturnFlow,
  getStatusAction,
};
