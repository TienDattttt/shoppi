/**
 * Application Entry Point
 * Initializes and starts the Express server with Socket.io
 */

const http = require('http');
const app = require('./app');
const config = require('./config');

// Import services for initialization
const { startAllConsumers } = require('./shared/rabbitmq/consumers');
const cassandraClient = require('./shared/cassandra/cassandra.client');
const { initializeSocket } = require('./shared/socket/socket.service');

const PORT = config.port;

// Create HTTP server for both Express and Socket.io
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

/**
 * Initialize async services
 */
async function initializeServices() {
  // Initialize Cassandra (optional - will fallback if not available)
  try {
    await cassandraClient.connect();
    console.log('[Init] Cassandra connected');
  } catch (error) {
    console.warn('[Init] Cassandra not available:', error.message);
  }
  
  // Start RabbitMQ consumers (optional - will skip if not available)
  try {
    await startAllConsumers();
  } catch (error) {
    console.warn('[Init] RabbitMQ consumers not started:', error.message);
  }
}

// Start server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  console.log(`Socket.io ready for real-time connections`);
  
  // Initialize async services after server starts
  await initializeServices();
});
