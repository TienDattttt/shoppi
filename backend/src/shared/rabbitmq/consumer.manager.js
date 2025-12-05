/**
 * Consumer Manager
 * Manages all RabbitMQ consumers lifecycle
 * 
 * Requirements: Event-driven architecture, graceful shutdown
 */

const orderConsumer = require('./consumers/order.consumer');
const paymentConsumer = require('./consumers/payment.consumer');
const shipmentConsumer = require('./consumers/shipment.consumer');
const searchConsumer = require('./consumers/search.consumer');
const shopConsumer = require('./consumers/shop.consumer');
const rabbitmqClient = require('./rabbitmq.client');

// All registered consumers
const consumers = [
  { name: 'order', module: orderConsumer },
  { name: 'payment', module: paymentConsumer },
  { name: 'shipment', module: shipmentConsumer },
  { name: 'search', module: searchConsumer },
  { name: 'shop', module: shopConsumer },
];

// Consumer status
const consumerStatus = {};

/**
 * Start all consumers
 * @param {Object} options
 * @param {string[]} options.only - Only start these consumers
 * @param {string[]} options.exclude - Exclude these consumers
 * @returns {Promise<void>}
 */
async function startAllConsumers(options = {}) {
  const { only, exclude = [] } = options;
  
  console.log('[ConsumerManager] Starting consumers...');
  
  // Ensure RabbitMQ is connected
  await rabbitmqClient.connect();
  
  const consumersToStart = consumers.filter(c => {
    if (only && only.length > 0) {
      return only.includes(c.name);
    }
    return !exclude.includes(c.name);
  });
  
  const results = await Promise.allSettled(
    consumersToStart.map(async (consumer) => {
      try {
        console.log(`[ConsumerManager] Starting ${consumer.name} consumer...`);
        await consumer.module.start();
        consumerStatus[consumer.name] = {
          status: 'running',
          startedAt: new Date().toISOString(),
          queue: consumer.module.QUEUE_NAME,
          events: consumer.module.HANDLED_EVENTS,
        };
        console.log(`[ConsumerManager] ${consumer.name} consumer started`);
        return { name: consumer.name, success: true };
      } catch (error) {
        consumerStatus[consumer.name] = {
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString(),
        };
        console.error(`[ConsumerManager] Failed to start ${consumer.name} consumer:`, error.message);
        return { name: consumer.name, success: false, error: error.message };
      }
    })
  );
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).length;
  
  console.log(`[ConsumerManager] Started ${successful}/${consumersToStart.length} consumers (${failed} failed)`);
}

/**
 * Stop all consumers
 * @returns {Promise<void>}
 */
async function stopAllConsumers() {
  console.log('[ConsumerManager] Stopping all consumers...');
  
  await Promise.allSettled(
    consumers.map(async (consumer) => {
      try {
        if (consumerStatus[consumer.name]?.status === 'running') {
          await consumer.module.stop();
          consumerStatus[consumer.name] = {
            status: 'stopped',
            stoppedAt: new Date().toISOString(),
          };
          console.log(`[ConsumerManager] ${consumer.name} consumer stopped`);
        }
      } catch (error) {
        console.error(`[ConsumerManager] Error stopping ${consumer.name} consumer:`, error.message);
      }
    })
  );
  
  // Close RabbitMQ connection
  await rabbitmqClient.close();
  
  console.log('[ConsumerManager] All consumers stopped');
}

/**
 * Start a specific consumer
 * @param {string} name - Consumer name
 * @returns {Promise<void>}
 */
async function startConsumer(name) {
  const consumer = consumers.find(c => c.name === name);
  
  if (!consumer) {
    throw new Error(`Consumer '${name}' not found`);
  }
  
  if (consumerStatus[name]?.status === 'running') {
    console.log(`[ConsumerManager] ${name} consumer is already running`);
    return;
  }
  
  await rabbitmqClient.connect();
  await consumer.module.start();
  
  consumerStatus[name] = {
    status: 'running',
    startedAt: new Date().toISOString(),
    queue: consumer.module.QUEUE_NAME,
    events: consumer.module.HANDLED_EVENTS,
  };
  
  console.log(`[ConsumerManager] ${name} consumer started`);
}

/**
 * Stop a specific consumer
 * @param {string} name - Consumer name
 * @returns {Promise<void>}
 */
async function stopConsumer(name) {
  const consumer = consumers.find(c => c.name === name);
  
  if (!consumer) {
    throw new Error(`Consumer '${name}' not found`);
  }
  
  if (consumerStatus[name]?.status !== 'running') {
    console.log(`[ConsumerManager] ${name} consumer is not running`);
    return;
  }
  
  await consumer.module.stop();
  
  consumerStatus[name] = {
    status: 'stopped',
    stoppedAt: new Date().toISOString(),
  };
  
  console.log(`[ConsumerManager] ${name} consumer stopped`);
}

/**
 * Restart a specific consumer
 * @param {string} name - Consumer name
 * @returns {Promise<void>}
 */
async function restartConsumer(name) {
  await stopConsumer(name);
  await startConsumer(name);
}

/**
 * Get status of all consumers
 * @returns {Object}
 */
function getStatus() {
  return {
    consumers: consumers.map(c => ({
      name: c.name,
      queue: c.module.QUEUE_NAME,
      events: c.module.HANDLED_EVENTS,
      ...consumerStatus[c.name],
    })),
    rabbitmq: {
      connected: rabbitmqClient.isConnected(),
    },
  };
}

/**
 * Get list of available consumers
 * @returns {Object[]}
 */
function getAvailableConsumers() {
  return consumers.map(c => ({
    name: c.name,
    queue: c.module.QUEUE_NAME,
    events: c.module.HANDLED_EVENTS,
  }));
}

/**
 * Health check for consumers
 * @returns {Object}
 */
function healthCheck() {
  const running = Object.values(consumerStatus).filter(s => s.status === 'running').length;
  const total = consumers.length;
  
  return {
    healthy: running === total && rabbitmqClient.isConnected(),
    running,
    total,
    rabbitmqConnected: rabbitmqClient.isConnected(),
    consumers: consumerStatus,
  };
}

/**
 * Register shutdown handlers
 */
function registerShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`[ConsumerManager] Received ${signal}, shutting down gracefully...`);
    await stopAllConsumers();
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  console.log('[ConsumerManager] Shutdown handlers registered');
}

module.exports = {
  // Lifecycle
  startAllConsumers,
  stopAllConsumers,
  startConsumer,
  stopConsumer,
  restartConsumer,
  
  // Status
  getStatus,
  getAvailableConsumers,
  healthCheck,
  
  // Utilities
  registerShutdownHandlers,
  
  // Constants
  consumers,
};
