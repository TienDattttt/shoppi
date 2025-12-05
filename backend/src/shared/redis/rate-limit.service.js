/**
 * Rate Limit Service
 * Sliding window rate limiting using Redis
 * 
 * Requirements: API protection, DDoS prevention
 */

const { getRedisClient } = require('./redis.client');

// Rate limit configurations
const RATE_LIMITS = {
  // Default limits
  DEFAULT: { requests: 100, windowMs: 60000 },      // 100 requests per minute
  
  // Auth endpoints (stricter)
  AUTH_LOGIN: { requests: 5, windowMs: 60000 },     // 5 attempts per minute
  AUTH_REGISTER: { requests: 3, windowMs: 60000 },  // 3 registrations per minute
  AUTH_OTP: { requests: 3, windowMs: 60000 },       // 3 OTP requests per minute
  AUTH_PASSWORD_RESET: { requests: 3, windowMs: 300000 }, // 3 per 5 minutes
  
  // API endpoints
  API_READ: { requests: 200, windowMs: 60000 },     // 200 reads per minute
  API_WRITE: { requests: 50, windowMs: 60000 },     // 50 writes per minute
  API_SEARCH: { requests: 30, windowMs: 60000 },    // 30 searches per minute
  
  // Payment endpoints (very strict)
  PAYMENT: { requests: 10, windowMs: 60000 },       // 10 per minute
  
  // Upload endpoints
  UPLOAD: { requests: 10, windowMs: 60000 },        // 10 uploads per minute
  
  // Webhook endpoints (more lenient for external services)
  WEBHOOK: { requests: 500, windowMs: 60000 },      // 500 per minute
};

// Key prefix
const RATE_LIMIT_PREFIX = 'ratelimit:';

// ============================================
// SLIDING WINDOW RATE LIMITING
// ============================================

/**
 * Check if request is within rate limit (sliding window algorithm)
 * @param {string} identifier - Unique identifier (IP, user ID, etc.)
 * @param {string} limitType - Type of rate limit to apply
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
 */
async function checkLimit(identifier, limitType = 'DEFAULT') {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.DEFAULT;
  const { requests: maxRequests, windowMs } = config;
  
  const key = `${RATE_LIMIT_PREFIX}${limitType}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  try {
    const client = await getRedisClient();
    
    // Use Redis sorted set for sliding window
    // Remove old entries outside the window
    await client.zRemRangeByScore(key, 0, windowStart);
    
    // Count current requests in window
    const currentCount = await client.zCard(key);
    
    if (currentCount >= maxRequests) {
      // Get oldest entry to calculate reset time
      const oldest = await client.zRange(key, 0, 0, { BY: 'SCORE' });
      const resetTime = oldest.length > 0 
        ? parseInt(oldest[0]) + windowMs 
        : now + windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        limit: maxRequests,
        windowMs,
      };
    }
    
    // Add current request
    await client.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
    
    // Set expiry on the key
    await client.expire(key, Math.ceil(windowMs / 1000));
    
    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetTime: now + windowMs,
      limit: maxRequests,
      windowMs,
    };
  } catch (error) {
    console.error(`Rate limit check error for ${identifier}:`, error.message);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: now + windowMs,
      limit: maxRequests,
      windowMs,
    };
  }
}

/**
 * Increment counter for fixed window rate limiting (simpler, faster)
 * @param {string} identifier
 * @param {string} limitType
 * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
 */
async function incrementCounter(identifier, limitType = 'DEFAULT') {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.DEFAULT;
  const { requests: maxRequests, windowMs } = config;
  
  const windowSeconds = Math.ceil(windowMs / 1000);
  const windowKey = Math.floor(Date.now() / windowMs);
  const key = `${RATE_LIMIT_PREFIX}fixed:${limitType}:${identifier}:${windowKey}`;
  
  try {
    const client = await getRedisClient();
    
    // Increment counter
    const count = await client.incr(key);
    
    // Set expiry on first request
    if (count === 1) {
      await client.expire(key, windowSeconds);
    }
    
    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetTime = (windowKey + 1) * windowMs;
    
    return {
      allowed,
      remaining,
      resetTime,
      limit: maxRequests,
      windowMs,
      current: count,
    };
  } catch (error) {
    console.error(`Rate limit increment error for ${identifier}:`, error.message);
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: Date.now() + windowMs,
      limit: maxRequests,
      windowMs,
    };
  }
}

/**
 * Reset rate limit for an identifier
 * @param {string} identifier
 * @param {string} limitType
 * @returns {Promise<boolean>}
 */
async function resetLimit(identifier, limitType = 'DEFAULT') {
  const key = `${RATE_LIMIT_PREFIX}${limitType}:${identifier}`;
  
  try {
    const client = await getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Rate limit reset error for ${identifier}:`, error.message);
    return false;
  }
}

/**
 * Get current rate limit status without incrementing
 * @param {string} identifier
 * @param {string} limitType
 * @returns {Promise<{count: number, remaining: number, limit: number}>}
 */
async function getStatus(identifier, limitType = 'DEFAULT') {
  const config = RATE_LIMITS[limitType] || RATE_LIMITS.DEFAULT;
  const { requests: maxRequests, windowMs } = config;
  
  const key = `${RATE_LIMIT_PREFIX}${limitType}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  try {
    const client = await getRedisClient();
    
    // Remove old entries
    await client.zRemRangeByScore(key, 0, windowStart);
    
    // Count current requests
    const count = await client.zCard(key);
    
    return {
      count,
      remaining: Math.max(0, maxRequests - count),
      limit: maxRequests,
      windowMs,
    };
  } catch (error) {
    console.error(`Rate limit status error for ${identifier}:`, error.message);
    return {
      count: 0,
      remaining: maxRequests,
      limit: maxRequests,
      windowMs,
    };
  }
}

/**
 * Block an identifier temporarily
 * @param {string} identifier
 * @param {number} durationMs - Block duration in milliseconds
 * @param {string} reason
 * @returns {Promise<boolean>}
 */
async function blockIdentifier(identifier, durationMs = 3600000, reason = 'rate_limit_exceeded') {
  const key = `${RATE_LIMIT_PREFIX}blocked:${identifier}`;
  
  try {
    const client = await getRedisClient();
    await client.setEx(
      key,
      Math.ceil(durationMs / 1000),
      JSON.stringify({ reason, blockedAt: Date.now(), expiresAt: Date.now() + durationMs })
    );
    return true;
  } catch (error) {
    console.error(`Block identifier error for ${identifier}:`, error.message);
    return false;
  }
}

/**
 * Check if identifier is blocked
 * @param {string} identifier
 * @returns {Promise<{blocked: boolean, reason?: string, expiresAt?: number}>}
 */
async function isBlocked(identifier) {
  const key = `${RATE_LIMIT_PREFIX}blocked:${identifier}`;
  
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    
    if (data) {
      const blockInfo = JSON.parse(data);
      return {
        blocked: true,
        reason: blockInfo.reason,
        expiresAt: blockInfo.expiresAt,
      };
    }
    
    return { blocked: false };
  } catch (error) {
    console.error(`Check blocked error for ${identifier}:`, error.message);
    return { blocked: false };
  }
}

/**
 * Unblock an identifier
 * @param {string} identifier
 * @returns {Promise<boolean>}
 */
async function unblockIdentifier(identifier) {
  const key = `${RATE_LIMIT_PREFIX}blocked:${identifier}`;
  
  try {
    const client = await getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Unblock identifier error for ${identifier}:`, error.message);
    return false;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get rate limit configuration
 * @param {string} limitType
 * @returns {Object}
 */
function getConfig(limitType) {
  return RATE_LIMITS[limitType] || RATE_LIMITS.DEFAULT;
}

/**
 * Add custom rate limit configuration
 * @param {string} name
 * @param {Object} config
 */
function addConfig(name, config) {
  if (config.requests && config.windowMs) {
    RATE_LIMITS[name] = config;
  }
}

/**
 * Generate identifier from request
 * @param {Object} req - Express request object
 * @param {string} type - 'ip', 'user', or 'combined'
 * @returns {string}
 */
function getIdentifier(req, type = 'ip') {
  switch (type) {
    case 'user':
      return req.user?.id || 'anonymous';
    case 'combined':
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const userId = req.user?.id || 'anonymous';
      return `${ip}:${userId}`;
    case 'ip':
    default:
      return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}

module.exports = {
  // Core functions
  checkLimit,
  incrementCounter,
  resetLimit,
  getStatus,
  
  // Blocking
  blockIdentifier,
  isBlocked,
  unblockIdentifier,
  
  // Utilities
  getConfig,
  addConfig,
  getIdentifier,
  
  // Constants
  RATE_LIMITS,
  RATE_LIMIT_PREFIX,
};
