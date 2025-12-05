/**
 * Notification Validators
 * Joi schemas for input validation
 */

const Joi = require('joi');

// Platform validation
const platformSchema = Joi.string()
  .valid('ios', 'android', 'web')
  .required()
  .messages({
    'any.only': 'Platform must be one of: ios, android, web',
    'any.required': 'Platform is required',
  });

// Device token validation
const deviceTokenSchema = Joi.string()
  .min(10)
  .max(500)
  .required()
  .messages({
    'string.min': 'Device token must be at least 10 characters',
    'string.max': 'Device token must not exceed 500 characters',
    'any.required': 'Device token is required',
  });

/**
 * Device Registration Schema
 */
const registerDeviceSchema = Joi.object({
  token: deviceTokenSchema,
  platform: platformSchema,
  deviceInfo: Joi.object({
    model: Joi.string().max(100).optional(),
    osVersion: Joi.string().max(50).optional(),
    appVersion: Joi.string().max(20).optional(),
  }).optional().default({}),
});

/**
 * Notification Preferences Schema
 */
const updatePreferencesSchema = Joi.object({
  pushEnabled: Joi.boolean().optional(),
  inAppEnabled: Joi.boolean().optional(),
  orderUpdates: Joi.boolean().optional(),
  promotions: Joi.boolean().optional(),
  priceDrops: Joi.boolean().optional(),
  newReviews: Joi.boolean().optional(),
}).min(1).messages({
  'object.min': 'At least one preference must be provided',
});

/**
 * Get Notifications Query Schema
 */
const getNotificationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  type: Joi.string().max(50).optional(),
  unreadOnly: Joi.boolean().optional(),
});

/**
 * Notification ID Parameter Schema
 */
const notificationIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid notification ID format',
    'any.required': 'Notification ID is required',
  }),
});

/**
 * Device Token Parameter Schema
 */
const deviceTokenParamSchema = Joi.object({
  token: Joi.string().min(10).max(500).required().messages({
    'any.required': 'Device token is required',
  }),
});

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema
 * @param {string} source - 'body', 'query', or 'params'
 * @returns {Function} Express middleware
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = {};
      error.details.forEach((detail) => {
        const key = detail.path.join('.');
        if (!details[key]) {
          details[key] = [];
        }
        details[key].push(detail.message);
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      });
    }

    if (source === 'body') {
      req.body = value;
    } else if (source === 'query') {
      req.query = value;
    } else {
      req.params = value;
    }

    next();
  };
}

/**
 * Validate device token format
 * @param {string} token
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateDeviceToken(token) {
  const errors = [];

  if (!token) {
    errors.push('Device token is required');
  } else if (token.length < 10) {
    errors.push('Device token must be at least 10 characters');
  } else if (token.length > 500) {
    errors.push('Device token must not exceed 500 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate platform
 * @param {string} platform
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validatePlatform(platform) {
  const validPlatforms = ['ios', 'android', 'web'];
  const errors = [];

  if (!platform) {
    errors.push('Platform is required');
  } else if (!validPlatforms.includes(platform)) {
    errors.push('Platform must be one of: ios, android, web');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  // Schemas
  registerDeviceSchema,
  updatePreferencesSchema,
  getNotificationsQuerySchema,
  notificationIdSchema,
  deviceTokenParamSchema,

  // Helpers
  validate,
  validateDeviceToken,
  validatePlatform,
};
