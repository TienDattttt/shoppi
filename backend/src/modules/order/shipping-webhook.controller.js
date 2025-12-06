/**
 * Shipping Webhook Controller
 * Handles webhook requests from shipping providers
 * 
 * Feature: shipping-provider-integration
 * Requirements: 4.2, 4.3, 4.4
 */

const { processWebhook } = require('./services/shipping/unified-shipping.service');
const externalShipmentRepo = require('./services/shipping/external-shipment.repository');
const { ShippingStatus } = require('./services/shipping/shipping.interface');
const { isSuccessStatus, isFailureStatus } = require('./services/shipping/status.mapper');
const { successResponse, errorResponse } = require('../../shared/utils/response.util');

/**
 * Handle GHTK webhook
 */
async function handleGHTKWebhook(req, res) {
  try {
    const signature = req.headers['x-ghtk-signature'] || req.headers['token'];
    const payload = req.body;

    console.log('[Webhook] GHTK webhook received:', JSON.stringify(payload));

    // Process webhook through unified service
    const webhookData = await processWebhook('ghtk', payload, signature);

    // Update shipment in database
    const shipment = await externalShipmentRepo.findByTrackingNumber(webhookData.trackingNumber);
    
    if (!shipment) {
      console.warn(`[Webhook] Shipment not found for tracking: ${webhookData.trackingNumber}`);
      return res.status(200).json({ success: true, message: 'Acknowledged' });
    }

    // Update shipment status
    await externalShipmentRepo.updateFromWebhook(webhookData.trackingNumber, webhookData);

    // Trigger appropriate flows based on status
    await handleStatusChange(shipment.sub_order_id, webhookData.status, webhookData);

    return successResponse(res, { received: true }, 'Webhook processed');
  } catch (error) {
    console.error('[Webhook] GHTK webhook error:', error.message);
    
    // Return 401 for signature errors
    if (error.code === 'INVALID_SIGNATURE') {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    // Return 200 for other errors to prevent retries
    return res.status(200).json({ success: false, error: error.message });
  }
}

/**
 * Handle GHN webhook (placeholder)
 */
async function handleGHNWebhook(req, res) {
  try {
    const signature = req.headers['x-ghn-signature'];
    const payload = req.body;

    console.log('[Webhook] GHN webhook received:', JSON.stringify(payload));

    // TODO: Implement when GHN provider is added
    return successResponse(res, { received: true }, 'Webhook acknowledged');
  } catch (error) {
    console.error('[Webhook] GHN webhook error:', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
}

/**
 * Handle Viettel Post webhook (placeholder)
 */
async function handleVTPWebhook(req, res) {
  try {
    const signature = req.headers['x-vtp-signature'];
    const payload = req.body;

    console.log('[Webhook] VTP webhook received:', JSON.stringify(payload));

    // TODO: Implement when VTP provider is added
    return successResponse(res, { received: true }, 'Webhook acknowledged');
  } catch (error) {
    console.error('[Webhook] VTP webhook error:', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
}

/**
 * Handle status change and trigger appropriate flows
 */
async function handleStatusChange(subOrderId, status, webhookData) {
  try {
    // Trigger order completion for delivered status
    if (isSuccessStatus(status)) {
      await triggerOrderCompletion(subOrderId, webhookData);
    }

    // Trigger return/refund flow for failure statuses
    if (isFailureStatus(status)) {
      await triggerReturnFlow(subOrderId, status, webhookData);
    }

    // Publish event for other services
    await publishShipmentStatusEvent(subOrderId, status, webhookData);
  } catch (error) {
    console.error('[Webhook] Status change handling error:', error.message);
    // Don't throw - webhook should still return success
  }
}

/**
 * Trigger order completion flow
 */
async function triggerOrderCompletion(subOrderId, webhookData) {
  console.log(`[Webhook] Triggering order completion for sub-order: ${subOrderId}`);
  
  // TODO: Integrate with order service to complete order
  // await orderService.completeSubOrder(subOrderId);
  
  // TODO: Trigger COD reconciliation if applicable
  // if (webhookData.data?.codAmount > 0) {
  //   await paymentService.reconcileCOD(subOrderId, webhookData.data.codAmount);
  // }
}

/**
 * Trigger return/refund flow
 */
async function triggerReturnFlow(subOrderId, status, webhookData) {
  console.log(`[Webhook] Triggering return flow for sub-order: ${subOrderId}, status: ${status}`);
  
  // TODO: Integrate with return service
  // if (status === ShippingStatus.RETURNED) {
  //   await returnService.processReturn(subOrderId, webhookData);
  // }
  
  // TODO: Handle COD refund if applicable
  // if (webhookData.data?.codAmount > 0) {
  //   await paymentService.refundCOD(subOrderId);
  // }
}

/**
 * Publish shipment status event to message queue
 */
async function publishShipmentStatusEvent(subOrderId, status, webhookData) {
  // TODO: Publish to RabbitMQ for other services
  // await rabbitmqClient.publish('shipment.status.updated', {
  //   subOrderId,
  //   status,
  //   trackingNumber: webhookData.trackingNumber,
  //   timestamp: webhookData.timestamp,
  // });
  
  console.log(`[Webhook] Published status event: ${subOrderId} -> ${status}`);
}

module.exports = {
  handleGHTKWebhook,
  handleGHNWebhook,
  handleVTPWebhook,
};
