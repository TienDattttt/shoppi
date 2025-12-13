/**
 * RabbitMQ Consumers Index
 * Starts all message consumers
 */

const rabbitmqClient = require('../rabbitmq.client');

// Import all consumers
const orderConsumer = require('./order.consumer');
const notificationConsumer = require('./notification.consumer');
const searchConsumer = require('./search.consumer');
const shopConsumer = require('./shop.consumer');
const shipmentConsumer = require('./shipment.consumer');

/**
 * Start all consumers
 */
async function startAllConsumers() {
  // First check if RabbitMQ is available
  const channel = await rabbitmqClient.getChannel();
  if (!channel) {
    console.warn('[Consumers] RabbitMQ not available, consumers not started');
    return false;
  }
  
  console.log('[Consumers] Starting all message consumers...');
  
  const consumers = [
    { name: 'Order', consumer: orderConsumer },
    { name: 'Notification', consumer: notificationConsumer },
    { name: 'Search', consumer: searchConsumer },
    { name: 'Shop', consumer: shopConsumer },
    { name: 'Shipment', consumer: shipmentConsumer },
  ];
  
  for (const { name, consumer } of consumers) {
    try {
      await consumer.start();
      console.log(`[Consumers] ${name} consumer started`);
    } catch (error) {
      console.error(`[Consumers] ${name} consumer failed:`, error.message);
    }
  }
  
  console.log('[Consumers] Consumer initialization complete');
  return true;
}

/**
 * Stop all consumers (graceful shutdown)
 */
async function stopAllConsumers() {
  console.log('[Consumers] Stopping all consumers...');
  
  const consumers = [orderConsumer, notificationConsumer, shopConsumer, shipmentConsumer];
  
  for (const consumer of consumers) {
    if (consumer.stop) {
      try {
        await consumer.stop();
      } catch (error) {
        console.error('[Consumers] Error stopping consumer:', error.message);
      }
    }
  }
  
  console.log('[Consumers] All consumers stopped');
}

module.exports = {
  startAllConsumers,
  stopAllConsumers,
};
