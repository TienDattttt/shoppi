/**
 * Shop Event Consumer
 * Handles shop-related events from RabbitMQ
 * 
 * This consumer listens for shop events and triggers notifications
 * Decouples shop module from notification module
 */

const rabbitmqClient = require('../rabbitmq.client');

// Lazy load notification service to avoid circular dependencies
let notificationService = null;

function getNotificationService() {
  if (!notificationService) {
    notificationService = require('../../../modules/notification/notification.service');
  }
  return notificationService;
}

const QUEUE_NAME = 'shop_events';
const ROUTING_KEYS = ['shop.approved', 'shop.rejected', 'shop.revision_required'];

/**
 * Handle shop approved event
 * @param {Object} data - Event data
 */
async function handleShopApproved(data) {
  const { shopId, partnerId, shopName } = data;
  
  console.log(`[Shop Consumer] Processing shop.approved for shop ${shopId}`);
  
  try {
    const notifService = getNotificationService();
    await notifService.send(partnerId, 'shop_approved', {
      title: 'Shop Approved',
      body: `Congratulations! Your shop "${shopName}" has been approved and is now visible to customers.`,
      payload: {
        shop_id: shopId,
        shop_name: shopName,
      },
    });
    console.log(`[Shop Consumer] Notification sent for shop approval: ${shopId}`);
  } catch (error) {
    console.error(`[Shop Consumer] Failed to send approval notification:`, error.message);
  }
}

/**
 * Handle shop rejected event
 * @param {Object} data - Event data
 */
async function handleShopRejected(data) {
  const { shopId, partnerId, shopName, reason } = data;
  
  console.log(`[Shop Consumer] Processing shop.rejected for shop ${shopId}`);
  
  try {
    const notifService = getNotificationService();
    await notifService.send(partnerId, 'shop_rejected', {
      title: 'Shop Registration Rejected',
      body: `Your shop "${shopName}" registration has been rejected. Reason: ${reason}`,
      payload: {
        shop_id: shopId,
        shop_name: shopName,
        reason,
      },
    });
    console.log(`[Shop Consumer] Notification sent for shop rejection: ${shopId}`);
  } catch (error) {
    console.error(`[Shop Consumer] Failed to send rejection notification:`, error.message);
  }
}

/**
 * Handle shop revision required event
 * @param {Object} data - Event data
 */
async function handleShopRevisionRequired(data) {
  const { shopId, partnerId, shopName, requiredChanges } = data;
  
  console.log(`[Shop Consumer] Processing shop.revision_required for shop ${shopId}`);
  
  try {
    const notifService = getNotificationService();
    await notifService.send(partnerId, 'shop_revision_required', {
      title: 'Shop Registration Requires Revision',
      body: `Your shop "${shopName}" registration requires some changes. Please review and update.`,
      payload: {
        shop_id: shopId,
        shop_name: shopName,
        required_changes: requiredChanges,
      },
    });
    console.log(`[Shop Consumer] Notification sent for shop revision: ${shopId}`);
  } catch (error) {
    console.error(`[Shop Consumer] Failed to send revision notification:`, error.message);
  }
}

/**
 * Process shop event message
 * @param {Object} message - Message content
 */
async function processMessage(message) {
  const { event, ...data } = message;
  
  switch (event) {
    case 'shop.approved':
      await handleShopApproved(data);
      break;
    case 'shop.rejected':
      await handleShopRejected(data);
      break;
    case 'shop.revision_required':
      await handleShopRevisionRequired(data);
      break;
    default:
      console.warn(`[Shop Consumer] Unknown event type: ${event}`);
  }
}

/**
 * Start the shop event consumer
 */
async function start() {
  try {
    const channel = await rabbitmqClient.getChannel();
    
    // Assert queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    // Bind queue to events exchange with routing keys
    for (const routingKey of ROUTING_KEYS) {
      await channel.bindQueue(QUEUE_NAME, rabbitmqClient.EXCHANGES.EVENTS, routingKey);
    }
    
    // Start consuming
    await rabbitmqClient.consume(QUEUE_NAME, processMessage);
    
    console.log(`[Shop Consumer] Started listening on queue: ${QUEUE_NAME}`);
  } catch (error) {
    console.error('[Shop Consumer] Failed to start:', error.message);
    throw error;
  }
}

/**
 * Stop the consumer (for graceful shutdown)
 */
async function stop() {
  console.log('[Shop Consumer] Stopping...');
}

module.exports = {
  start,
  stop,
  processMessage,
  QUEUE_NAME,
  ROUTING_KEYS,
};
