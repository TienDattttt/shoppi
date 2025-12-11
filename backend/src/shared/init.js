/**
 * Infrastructure Initialization
 * Initializes all external services on app startup
 */

const redis = require('./redis/redis.client');
const elasticsearch = require('./elasticsearch/elasticsearch.client');
const cassandra = require('./cassandra/cassandra.client');
const rabbitmq = require('./rabbitmq/rabbitmq.client');
const consumerManager = require('./rabbitmq/consumer.manager');
const firebase = require('./firebase/firebase.client');
const storage = require('./supabase/storage.client');

/**
 * Initialize all infrastructure services
 * @param {object} options - Initialization options
 */
async function initializeAll(options = {}) {
  const results = {
    redis: false,
    elasticsearch: false,
    cassandra: false,
    rabbitmq: false,
    firebase: false,
    storage: false,
  };

  // Redis
  if (options.redis !== false) {
    try {
      await redis.getRedisClient();
      results.redis = true;
      console.log('✓ Redis initialized');
    } catch (error) {
      console.warn('✗ Redis initialization failed:', error.message);
    }
  }

  // Elasticsearch
  if (options.elasticsearch !== false) {
    try {
      const available = await elasticsearch.isAvailable();
      if (available) {
        await elasticsearch.initializeIndex();
        results.elasticsearch = true;
        console.log('✓ Elasticsearch initialized');
      } else {
        console.warn('✗ Elasticsearch not available');
      }
    } catch (error) {
      console.warn('✗ Elasticsearch initialization failed:', error.message);
    }
  }

  // Cassandra
  if (options.cassandra !== false) {
    try {
      await cassandra.connect();
      await cassandra.initialize();
      results.cassandra = true;
      console.log('✓ Cassandra initialized');
    } catch (error) {
      console.warn('✗ Cassandra initialization failed:', error.message);
    }
  }

  // RabbitMQ
  if (options.rabbitmq !== false) {
    try {
      await rabbitmq.connect();
      await rabbitmq.getChannel();
      results.rabbitmq = true;
      console.log('✓ RabbitMQ initialized');
      
      // Start consumers if enabled
      if (options.consumers !== false) {
        try {
          await consumerManager.startAllConsumers(options.consumerOptions);
          consumerManager.registerShutdownHandlers();
          console.log('✓ RabbitMQ consumers started');
        } catch (consumerError) {
          console.warn('✗ RabbitMQ consumers failed:', consumerError.message);
        }
      }
    } catch (error) {
      console.warn('✗ RabbitMQ initialization failed:', error.message);
    }
  }

  // Firebase
  if (options.firebase !== false) {
    try {
      const app = firebase.initializeFirebase();
      results.firebase = !!app;
      if (app) {
        console.log('✓ Firebase initialized');
      } else {
        console.warn('✗ Firebase not configured');
      }
    } catch (error) {
      console.warn('✗ Firebase initialization failed:', error.message);
    }
  }

  // Supabase Storage
  if (options.storage !== false) {
    try {
      await storage.initializeBuckets();
      results.storage = true;
      console.log('✓ Supabase Storage initialized');
    } catch (error) {
      console.warn('✗ Supabase Storage initialization failed:', error.message);
    }
  }

  return results;
}

/**
 * Graceful shutdown of all services
 */
async function shutdownAll() {
  console.log('Shutting down infrastructure services...');

  try {
    await redis.closeRedisConnection();
    console.log('✓ Redis closed');
  } catch (error) {
    console.error('Error closing Redis:', error.message);
  }

  try {
    await cassandra.close();
    console.log('✓ Cassandra closed');
  } catch (error) {
    console.error('Error closing Cassandra:', error.message);
  }

  try {
    await consumerManager.stopAllConsumers();
    console.log('✓ RabbitMQ consumers stopped');
  } catch (error) {
    console.error('Error stopping consumers:', error.message);
  }

  try {
    await rabbitmq.close();
    console.log('✓ RabbitMQ closed');
  } catch (error) {
    console.error('Error closing RabbitMQ:', error.message);
  }

  console.log('All services shut down');
}

/**
 * Health check for all services
 */
async function healthCheck() {
  const health = {
    redis: redis.isRedisConnected(),
    elasticsearch: await elasticsearch.isAvailable(),
    cassandra: false,
    rabbitmq: rabbitmq.isConnected(),
    consumers: consumerManager.healthCheck(),
    timestamp: new Date().toISOString(),
  };

  try {
    const cassandraClient = cassandra.getClient();
    if (cassandraClient) {
      await cassandraClient.execute('SELECT now() FROM system.local');
      health.cassandra = true;
    }
  } catch {
    health.cassandra = false;
  }

  health.overall = Object.values(health)
    .filter(v => typeof v === 'boolean')
    .every(v => v);

  return health;
}

module.exports = {
  initializeAll,
  initializeServices: initializeAll, // Alias for app.js compatibility
  shutdownAll,
  healthCheck,
};
