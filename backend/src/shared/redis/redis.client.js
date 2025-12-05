/**
 * Redis Client
 * Initializes and exports Redis client with connection pooling and error handling
 */

const { createClient } = require('redis');
const config = require('../../config');

let redisClient = null;
let isConnected = false;

/**
 * Creates and connects Redis client
 * @returns {Promise<import('redis').RedisClientType>}
 */
async function getRedisClient() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Max reconnection attempts reached');
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
    password: config.redis.password || undefined,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
    isConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('Redis: Connected');
    isConnected = true;
  });

  redisClient.on('disconnect', () => {
    console.log('Redis: Disconnected');
    isConnected = false;
  });

  await redisClient.connect();
  return redisClient;
}

/**
 * Closes Redis connection
 */
async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Check if Redis is connected
 * @returns {boolean}
 */
function isRedisConnected() {
  return isConnected;
}

module.exports = {
  getRedisClient,
  closeRedisConnection,
  isRedisConnected,
};
