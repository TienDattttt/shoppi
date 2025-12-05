/**
 * Shop Validators
 * Joi schemas for shop input validation
 * 
 * Requirements: 1.5, 3.1
 */

const Joi = require('joi');

// Shop name validation - max 100 characters (Requirement 1.5)
const shopNameSchema = Joi.string()
  .min(1)
  .max(100)
  .required()
  .messages({
    'string.min': 'Shop name is required',
    'string.max': 'Shop name must not exceed 100 characters',
    'any.required': 'Shop name is required',
  });

// Shop description validation - max 2000 characters (Requirement 1.5)
const shopDescriptionSchema = Joi.string()
  .max(2000)
  .allow('')
  .messages({
    'string.max': 'Shop description must not exceed 2000 characters',
  });

// Phone validation (Vietnamese format)
const phoneSchema = Joi.string()
  .pattern(/^(\+84|84|0)?[0-9]{9,10}$/)
  .messages({
    'string.pattern.base': 'Invalid phone number format',
  });

// Email validation
const emailSchema = Joi.string()
  .email()
  .max(255)
  .messages({
    'string.email': 'Invalid email format',
    'string.max': 'Email must not exceed 255 characters',
  });

// Slug validation
const slugSchema = Joi.string()
  .min(1)
  .max(120)
  .pattern(/^[a-z0-9-]+$/)
  .messages({
    'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens',
    'string.max': 'Slug must not exceed 120 characters',
  });


// Address validation
const addressSchema = Joi.string()
  .min(1)
  .max(500)
  .messages({
    'string.min': 'Address is required',
    'string.max': 'Address must not exceed 500 characters',
  });

// Operating hours schema
const operatingHoursSchema = Joi.object().pattern(
  Joi.string().valid('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'),
  Joi.object({
    open: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    close: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    isClosed: Joi.boolean().default(false),
  })
).messages({
  'string.pattern.base': 'Time must be in HH:MM format',
});

/**
 * Create Shop Schema (Requirement 1.1, 1.5)
 * Used when Partner registers a new shop
 */
const createShopSchema = Joi.object({
  shop_name: shopNameSchema,
  description: shopDescriptionSchema.optional(),
  phone: phoneSchema.required().messages({
    'any.required': 'Phone number is required',
  }),
  email: emailSchema.optional(),
  address: addressSchema.required().messages({
    'any.required': 'Address is required',
  }),
  city: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  ward: Joi.string().max(100).optional(),
  logo_url: Joi.string().uri().optional().allow(null),
  banner_url: Joi.string().uri().optional().allow(null),
  operating_hours: operatingHoursSchema.optional(),
  category_ids: Joi.array().items(Joi.string().uuid()).optional(),
});

/**
 * Update Shop Schema (Requirement 3.1)
 * Used when Partner updates shop information
 */
const updateShopSchema = Joi.object({
  shop_name: Joi.string().min(1).max(100).optional().messages({
    'string.max': 'Shop name must not exceed 100 characters',
  }),
  description: shopDescriptionSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  ward: Joi.string().max(100).optional(),
  logo_url: Joi.string().uri().optional().allow(null),
  banner_url: Joi.string().uri().optional().allow(null),
  operating_hours: operatingHoursSchema.optional(),
  category_ids: Joi.array().items(Joi.string().uuid()).optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});


/**
 * Admin Approval Schema (Requirement 2.2, 2.3, 2.4)
 */
const shopApprovalSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject', 'request_revision').required(),
  reason: Joi.string().max(1000).when('action', {
    is: Joi.valid('reject', 'request_revision'),
    then: Joi.required().messages({
      'any.required': 'Reason is required for rejection or revision request',
    }),
    otherwise: Joi.optional(),
  }),
});

/**
 * Search Shops Schema (Requirement 4.1)
 */
const searchShopsSchema = Joi.object({
  q: Joi.string().max(200).optional(),
  city: Joi.string().max(100).optional(),
  district: Joi.string().max(100).optional(),
  category_id: Joi.string().uuid().optional(),
  status: Joi.string().valid('active').optional(), // Public search only shows active
  sortBy: Joi.string().valid('name', 'rating', 'followers', 'newest').default('newest'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Validate shop name
 * @param {string} name
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateShopName(name) {
  const errors = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Shop name is required');
  } else if (name.length > 100) {
    errors.push('Shop name must not exceed 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate shop description
 * @param {string} description
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateShopDescription(description) {
  const errors = [];
  
  if (description && description.length > 2000) {
    errors.push('Shop description must not exceed 2000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate shop image file (logo or banner)
 * @param {object} file - File object with mimetype and size
 * @param {string} type - 'logo' or 'banner'
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateShopImageFile(file, type = 'image') {
  const errors = [];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 2 * 1024 * 1024; // 2MB for shop images (Requirement 1.3)
  
  if (!file) {
    errors.push(`${type} file is required`);
  } else {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`${type} must be JPEG, PNG, or WebP format`);
    }
    if (file.size > maxSize) {
      errors.push(`${type} size must not exceed 2MB`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}


/**
 * Validate shop data for creation
 * @param {object} data - Shop data
 * @returns {{ isValid: boolean, errors: object, data: object|null }}
 */
function validateCreateShop(data) {
  const { error, value } = createShopSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    return {
      isValid: false,
      errors,
      data: null,
    };
  }

  return {
    isValid: true,
    errors: {},
    data: value,
  };
}

/**
 * Validate shop data for update
 * @param {object} data - Shop update data
 * @returns {{ isValid: boolean, errors: object, data: object|null }}
 */
function validateUpdateShop(data) {
  const { error, value } = updateShopSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = {};
    error.details.forEach((detail) => {
      const key = detail.path.join('.');
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(detail.message);
    });

    return {
      isValid: false,
      errors,
      data: null,
    };
  }

  return {
    isValid: true,
    errors: {},
    data: value,
  };
}

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
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
          code: 'SHOP_003',
          message: 'Shop validation error',
          details,
        },
      });
    }

    req.body = value;
    next();
  };
}

/**
 * Query validation middleware factory
 * @param {Joi.Schema} schema
 * @returns {Function} Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
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
          code: 'SHOP_003',
          message: 'Shop validation error',
          details,
        },
      });
    }

    req.query = value;
    next();
  };
}

module.exports = {
  // Schemas
  createShopSchema,
  updateShopSchema,
  shopApprovalSchema,
  searchShopsSchema,
  
  // Individual field schemas
  shopNameSchema,
  shopDescriptionSchema,
  phoneSchema,
  emailSchema,
  slugSchema,
  addressSchema,
  operatingHoursSchema,
  
  // Validation helpers
  validateShopName,
  validateShopDescription,
  validateShopImageFile,
  validateCreateShop,
  validateUpdateShop,
  
  // Middleware
  validate,
  validateQuery,
};
