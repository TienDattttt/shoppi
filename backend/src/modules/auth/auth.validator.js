/**
 * Auth Validators
 * Joi schemas for input validation
 */

const Joi = require('joi');

// Password complexity: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
    'any.required': 'Password is required',
  });

// Phone number validation (Vietnamese format or international)
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

/**
 * Customer Registration Schema
 */
const registerCustomerSchema = Joi.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  password: passwordSchema,
  fullName: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Full name is required',
    'string.max': 'Full name must not exceed 255 characters',
    'any.required': 'Full name is required',
  }),
}).or('email', 'phone').messages({
  'object.missing': 'Either email or phone is required',
});

/**
 * Partner Registration Schema
 */
const registerPartnerSchema = Joi.object({
  email: emailSchema.required(),
  phone: phoneSchema.required(),
  password: passwordSchema,
  fullName: Joi.string().min(1).max(255).required(),
  businessName: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Business name is required',
  }),
  taxId: Joi.string().min(1).max(50).required().messages({
    'any.required': 'Tax ID is required',
  }),
});

/**
 * Shipper Registration Schema
 */
const registerShipperSchema = Joi.object({
  phone: phoneSchema.required(),
  password: passwordSchema,
  fullName: Joi.string().min(1).max(255).required(),
  idCardNumber: Joi.string().min(9).max(20).required().messages({
    'any.required': 'ID card number is required',
  }),
  vehicleType: Joi.string().valid('motorcycle', 'car', 'bicycle', 'truck').required().messages({
    'any.only': 'Vehicle type must be one of: motorcycle, car, bicycle, truck',
    'any.required': 'Vehicle type is required',
  }),
  vehiclePlate: Joi.string().min(5).max(20).required().messages({
    'any.required': 'Vehicle plate is required',
  }),
});

/**
 * Login Schema
 */
const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Email or phone is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

/**
 * OTP Request Schema
 */
const otpRequestSchema = Joi.object({
  phone: phoneSchema.required(),
});

/**
 * OTP Verify Schema
 */
const otpVerifySchema = Joi.object({
  identifier: Joi.string().required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
    'string.length': 'OTP must be 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
    'any.required': 'OTP is required',
  }),
  purpose: Joi.string().valid('registration', 'login', 'password_reset').optional(),
});

/**
 * OTP Login Schema
 */
const otpLoginSchema = Joi.object({
  phone: phoneSchema.required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

/**
 * Password Reset Request Schema
 */
const passwordResetRequestSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'any.required': 'Email or phone is required',
  }),
});

/**
 * Password Reset Schema
 */
const passwordResetSchema = Joi.object({
  token: Joi.string().optional(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).optional(),
  identifier: Joi.string().optional(),
  newPassword: passwordSchema,
}).or('token', 'otp').messages({
  'object.missing': 'Either reset token or OTP is required',
});

/**
 * Refresh Token Schema
 */
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

/**
 * Validate password complexity
 * @param {string} password
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validatePasswordComplexity(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least 1 lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least 1 number');
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

module.exports = {
  // Schemas
  registerCustomerSchema,
  registerPartnerSchema,
  registerShipperSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  otpLoginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  refreshTokenSchema,
  passwordSchema,
  
  // Helpers
  validatePasswordComplexity,
  validate,
};
