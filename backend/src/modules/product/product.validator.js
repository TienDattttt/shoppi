/**
 * Product Validators
 * Joi schemas for input validation
 */

const Joi = require('joi');

// Product name validation
const productNameSchema = Joi.string()
  .min(1)
  .max(200)
  .required()
  .messages({
    'string.min': 'Product name is required',
    'string.max': 'Product name must not exceed 200 characters',
    'any.required': 'Product name is required',
  });

// Product description validation
const productDescriptionSchema = Joi.string()
  .max(10000)
  .allow('')
  .messages({
    'string.max': 'Product description must not exceed 10000 characters',
  });

// Price validation
const priceSchema = Joi.number()
  .min(0)
  .max(999999999999)
  .precision(2)
  .messages({
    'number.min': 'Price must be a positive number',
    'number.max': 'Price exceeds maximum allowed value',
  });

// SKU validation
const skuSchema = Joi.string()
  .min(1)
  .max(100)
  .pattern(/^[A-Za-z0-9-_]+$/)
  .messages({
    'string.min': 'SKU is required',
    'string.max': 'SKU must not exceed 100 characters',
    'string.pattern.base': 'SKU can only contain letters, numbers, hyphens, and underscores',
  });

// Slug validation
const slugSchema = Joi.string()
  .min(1)
  .max(250)
  .pattern(/^[a-z0-9-]+$/)
  .messages({
    'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens',
  });

/**
 * Create Product Schema
 */
const createProductSchema = Joi.object({
  name: productNameSchema,
  description: productDescriptionSchema.optional(),
  shortDescription: Joi.string().max(500).allow('').optional(),
  categoryId: Joi.string().uuid().optional().allow(null),
  basePrice: priceSchema.required().messages({
    'any.required': 'Base price is required',
  }),
  compareAtPrice: priceSchema.optional().allow(null),
  currency: Joi.string().valid('VND', 'USD', 'EUR').default('VND'),
  metaTitle: Joi.string().max(100).allow('').optional(),
  metaDescription: Joi.string().max(200).allow('').optional(),
  // Variants can be created with product
  variants: Joi.array().items(
    Joi.object({
      sku: skuSchema.required(),
      name: Joi.string().max(200).optional(),
      attributes: Joi.object().pattern(
        Joi.string(),
        Joi.string().max(100)
      ).optional(),
      price: priceSchema.optional().allow(null),
      compareAtPrice: priceSchema.optional().allow(null),
      quantity: Joi.number().integer().min(0).default(0),
      lowStockThreshold: Joi.number().integer().min(0).default(10),
      imageUrl: Joi.string().uri().optional().allow(null),
    })
  ).optional(),
});


/**
 * Update Product Schema
 */
const updateProductSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  description: productDescriptionSchema.optional(),
  shortDescription: Joi.string().max(500).allow('').optional(),
  categoryId: Joi.string().uuid().optional().allow(null),
  basePrice: priceSchema.optional(),
  compareAtPrice: priceSchema.optional().allow(null),
  currency: Joi.string().valid('VND', 'USD', 'EUR').optional(),
  status: Joi.string().valid('draft', 'inactive').optional(), // Partners can only set draft/inactive
  metaTitle: Joi.string().max(100).allow('').optional(),
  metaDescription: Joi.string().max(200).allow('').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Create Variant Schema
 */
const createVariantSchema = Joi.object({
  sku: skuSchema.required(),
  name: Joi.string().max(200).optional(),
  attributes: Joi.object().pattern(
    Joi.string(),
    Joi.string().max(100)
  ).optional().default({}),
  price: priceSchema.optional().allow(null),
  compareAtPrice: priceSchema.optional().allow(null),
  quantity: Joi.number().integer().min(0).default(0),
  lowStockThreshold: Joi.number().integer().min(0).default(10),
  imageUrl: Joi.string().uri().optional().allow(null),
});

/**
 * Update Variant Schema
 */
const updateVariantSchema = Joi.object({
  sku: skuSchema.optional(),
  name: Joi.string().max(200).optional().allow(null),
  attributes: Joi.object().pattern(
    Joi.string(),
    Joi.string().max(100)
  ).optional(),
  price: priceSchema.optional().allow(null),
  compareAtPrice: priceSchema.optional().allow(null),
  lowStockThreshold: Joi.number().integer().min(0).optional(),
  imageUrl: Joi.string().uri().optional().allow(null),
  isActive: Joi.boolean().optional(),
}).min(1);

/**
 * Update Inventory Schema
 */
const updateInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(0).required().messages({
    'number.min': 'Quantity cannot be negative',
    'any.required': 'Quantity is required',
  }),
  reason: Joi.string().max(500).optional(),
});

/**
 * Create Category Schema
 */
const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Category name is required',
    'string.max': 'Category name must not exceed 100 characters',
    'any.required': 'Category name is required',
  }),
  parentId: Joi.string().uuid().optional().allow(null),
  description: Joi.string().max(500).allow('').optional(),
  imageUrl: Joi.string().uri().optional().allow(null),
  sortOrder: Joi.number().integer().min(0).default(0),
  metaTitle: Joi.string().max(100).allow('').optional(),
  metaDescription: Joi.string().max(200).allow('').optional(),
});

/**
 * Update Category Schema
 */
const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  parentId: Joi.string().uuid().optional().allow(null),
  description: Joi.string().max(500).allow('').optional(),
  imageUrl: Joi.string().uri().optional().allow(null),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  metaTitle: Joi.string().max(100).allow('').optional(),
  metaDescription: Joi.string().max(200).allow('').optional(),
}).min(1);

/**
 * Search Product Schema
 */
const searchProductSchema = Joi.object({
  q: Joi.string().max(200).optional(), // Search query
  categoryId: Joi.string().uuid().optional(),
  minPrice: priceSchema.optional(),
  maxPrice: priceSchema.optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  status: Joi.string().valid('active').optional(), // Public search only shows active
  sortBy: Joi.string().valid('price', 'rating', 'newest', 'best_selling', 'relevance').default('relevance'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Create Review Schema
 */
const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5',
    'any.required': 'Rating is required',
  }),
  title: Joi.string().max(200).optional(),
  content: Joi.string().max(5000).optional(),
});

/**
 * Reply Review Schema
 */
const replyReviewSchema = Joi.object({
  reply: Joi.string().min(1).max(2000).required().messages({
    'string.min': 'Reply is required',
    'string.max': 'Reply must not exceed 2000 characters',
    'any.required': 'Reply is required',
  }),
});

/**
 * Admin Approval Schema
 */
const approvalSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject', 'request_revision').required(),
  reason: Joi.string().max(1000).when('action', {
    is: Joi.valid('reject', 'request_revision'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});


/**
 * Image Upload Schema
 */
const imageUploadSchema = Joi.object({
  altText: Joi.string().max(200).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  isPrimary: Joi.boolean().optional(),
});

/**
 * Validate product name
 * @param {string} name
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateProductName(name) {
  const errors = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Product name is required');
  } else if (name.length > 200) {
    errors.push('Product name must not exceed 200 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate product description
 * @param {string} description
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateProductDescription(description) {
  const errors = [];
  
  if (description && description.length > 10000) {
    errors.push('Product description must not exceed 10000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate SKU format
 * @param {string} sku
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateSKU(sku) {
  const errors = [];
  
  if (!sku || sku.trim().length === 0) {
    errors.push('SKU is required');
  } else if (sku.length > 100) {
    errors.push('SKU must not exceed 100 characters');
  } else if (!/^[A-Za-z0-9-_]+$/.test(sku)) {
    errors.push('SKU can only contain letters, numbers, hyphens, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate price
 * @param {number} price
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validatePrice(price) {
  const errors = [];
  
  if (price === undefined || price === null) {
    errors.push('Price is required');
  } else if (typeof price !== 'number' || isNaN(price)) {
    errors.push('Price must be a valid number');
  } else if (price < 0) {
    errors.push('Price must be a positive number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate image file
 * @param {object} file - File object with mimetype and size
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateImageFile(file) {
  const errors = [];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!file) {
    errors.push('Image file is required');
  } else {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push('Image must be JPEG, PNG, or WebP format');
    }
    if (file.size > maxSize) {
      errors.push('Image size must not exceed 5MB');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
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
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
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
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
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
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  updateInventorySchema,
  createCategorySchema,
  updateCategorySchema,
  searchProductSchema,
  createReviewSchema,
  replyReviewSchema,
  approvalSchema,
  imageUploadSchema,
  
  // Individual field schemas
  productNameSchema,
  productDescriptionSchema,
  priceSchema,
  skuSchema,
  slugSchema,
  
  // Helpers
  validateProductName,
  validateProductDescription,
  validateSKU,
  validatePrice,
  validateImageFile,
  validate,
  validateQuery,
};
