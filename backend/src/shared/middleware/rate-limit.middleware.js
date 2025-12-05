/**
 * Rate Limit Middleware
 * Express middleware for rate limiting API requests
 * 
 * Requirements: API protection, DDoS prevention
 */

const rateLimitService = require('../redis/rate-limit.service');

/**
 * Create rate limit middleware
 * @param {Object} options
 * @param {string} options.limitType - Type of rate limit (from RATE_LIMITS)
 * @param {string} options.identifierType - 'ip', 'user', or 'combined'
 * @param {boolean} options.skipSuccessfulRequests - Don't count successful requests
 * @param {Function} options.skip - Function to skip rate limiting
 * @param {Function} options.keyGenerator - Custom key generator
 * @param {Function} options.handler - Custom handler when limit exceeded
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const {
    limitType = 'DEFAULT',
    identifierType = 'ip',
    skipSuccessfulRequests = false,
    skip = null,
    keyGenerator = null,
    handler = null,
  } = options;

  return async (req, res, next) => {
    try {
      // Check if should skip rate limiting
      if (skip && await skip(req)) {
        return next();
      }

      // Generate identifier
      const identifier = keyGenerator 
        ? keyGenerator(req) 
        : rateLimitService.getIdentifier(req, identifierType);

      // Check if blocked
      const blockStatus = await rateLimitService.isBlocked(identifier);
      if (blockStatus.blocked) {
        return sendRateLimitResponse(res, {
          allowed: false,
          remaining: 0,
          resetTime: blockStatus.expiresAt,
          blocked: true,
          reason: blockStatus.reason,
        }, handler);
      }

      // Check rate limit
      const result = await rateLimitService.checkLimit(identifier, limitType);

      // Set rate limit headers
      setRateLimitHeaders(res, result);

      if (!result.allowed) {
        return sendRateLimitResponse(res, result, handler);
      }

      // If skipSuccessfulRequests, we need to handle response
      if (skipSuccessfulRequests) {
        const originalEnd = res.end;
        res.end = function(...args) {
          // If response was successful (2xx), decrement counter
          if (res.statusCode >= 200 && res.statusCode < 300) {
            rateLimitService.resetLimit(identifier, limitType).catch(() => {});
          }
          return originalEnd.apply(this, args);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error.message);
      // On error, allow the request (fail open)
      next();
    }
  };
}

/**
 * Set rate limit headers on response
 * @param {Object} res - Express response
 * @param {Object} result - Rate limit result
 */
function setRateLimitHeaders(res, result) {
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    res.setHeader('Retry-After', Math.max(1, retryAfter));
  }
}

/**
 * Send rate limit exceeded response
 * @param {Object} res - Express response
 * @param {Object} result - Rate limit result
 * @param {Function} customHandler - Custom handler function
 */
function sendRateLimitResponse(res, result, customHandler) {
  if (customHandler) {
    return customHandler(res, result);
  }

  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
  
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: result.blocked 
        ? `You have been temporarily blocked. Please try again later.`
        : `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter,
      ...(result.blocked && { reason: result.reason }),
    },
  });
}

// ============================================
// PRE-CONFIGURED MIDDLEWARES
// ============================================

/**
 * Default rate limiter (100 requests/minute)
 */
const defaultLimiter = createRateLimiter({
  limitType: 'DEFAULT',
  identifierType: 'ip',
});

/**
 * Auth login rate limiter (5 attempts/minute)
 */
const loginLimiter = createRateLimiter({
  limitType: 'AUTH_LOGIN',
  identifierType: 'ip',
});

/**
 * Auth register rate limiter (3 registrations/minute)
 */
const registerLimiter = createRateLimiter({
  limitType: 'AUTH_REGISTER',
  identifierType: 'ip',
});

/**
 * OTP request rate limiter (3 requests/minute)
 */
const otpLimiter = createRateLimiter({
  limitType: 'AUTH_OTP',
  identifierType: 'ip',
});

/**
 * Password reset rate limiter (3 requests/5 minutes)
 */
const passwordResetLimiter = createRateLimiter({
  limitType: 'AUTH_PASSWORD_RESET',
  identifierType: 'ip',
});

/**
 * API read rate limiter (200 requests/minute)
 */
const apiReadLimiter = createRateLimiter({
  limitType: 'API_READ',
  identifierType: 'combined',
});

/**
 * API write rate limiter (50 requests/minute)
 */
const apiWriteLimiter = createRateLimiter({
  limitType: 'API_WRITE',
  identifierType: 'combined',
});

/**
 * Search rate limiter (30 requests/minute)
 */
const searchLimiter = createRateLimiter({
  limitType: 'API_SEARCH',
  identifierType: 'combined',
});

/**
 * Payment rate limiter (10 requests/minute)
 */
const paymentLimiter = createRateLimiter({
  limitType: 'PAYMENT',
  identifierType: 'user',
  skip: (req) => !req.user, // Skip if not authenticated
});

/**
 * Upload rate limiter (10 uploads/minute)
 */
const uploadLimiter = createRateLimiter({
  limitType: 'UPLOAD',
  identifierType: 'user',
});

/**
 * Webhook rate limiter (500 requests/minute)
 */
const webhookLimiter = createRateLimiter({
  limitType: 'WEBHOOK',
  identifierType: 'ip',
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictLimiter = createRateLimiter({
  limitType: 'AUTH_LOGIN',
  identifierType: 'combined',
  handler: (res, result) => {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many attempts. Your account may be temporarily locked.',
        retryAfter,
      },
    });
  },
});

// ============================================
// DYNAMIC RATE LIMITER
// ============================================

/**
 * Create dynamic rate limiter based on user role
 * @param {Object} roleLimits - Limits per role
 * @returns {Function} Express middleware
 */
function createRoleLimiter(roleLimits = {}) {
  const defaultLimits = {
    admin: { requests: 1000, windowMs: 60000 },
    partner: { requests: 500, windowMs: 60000 },
    shipper: { requests: 300, windowMs: 60000 },
    customer: { requests: 100, windowMs: 60000 },
    anonymous: { requests: 50, windowMs: 60000 },
  };

  const limits = { ...defaultLimits, ...roleLimits };

  return async (req, res, next) => {
    try {
      const role = req.user?.role || 'anonymous';
      const config = limits[role] || limits.anonymous;
      
      // Add dynamic config
      const limitType = `ROLE_${role.toUpperCase()}`;
      rateLimitService.addConfig(limitType, config);

      const identifier = rateLimitService.getIdentifier(req, 'combined');
      const result = await rateLimitService.checkLimit(identifier, limitType);

      setRateLimitHeaders(res, result);

      if (!result.allowed) {
        return sendRateLimitResponse(res, result);
      }

      next();
    } catch (error) {
      console.error('Role rate limiter error:', error.message);
      next();
    }
  };
}

module.exports = {
  // Factory
  createRateLimiter,
  createRoleLimiter,
  
  // Pre-configured middlewares
  defaultLimiter,
  loginLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
  apiReadLimiter,
  apiWriteLimiter,
  searchLimiter,
  paymentLimiter,
  uploadLimiter,
  webhookLimiter,
  strictLimiter,
  
  // Utilities
  setRateLimitHeaders,
  sendRateLimitResponse,
};
