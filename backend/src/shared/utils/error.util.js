/**
 * Error Utility
 * Custom error classes and error handling helpers
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends AppError {
  constructor(code, message) {
    super(code, message, 401);
  }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends AppError {
  constructor(code, message) {
    super(code, message, 403);
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super('VALIDATION_ERROR', message, 400);
    this.details = details;
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, 404);
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
  constructor(code, message) {
    super(code, message, 409);
  }
}

/**
 * Rate Limit Error (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super('RATE_LIMITED', message, 429);
  }
}

// Auth-specific error codes
const AUTH_ERRORS = {
  INVALID_CREDENTIALS: new AuthenticationError('AUTH_INVALID_CREDENTIALS', 'Invalid email/phone or password'),
  ACCOUNT_LOCKED: new AuthorizationError('AUTH_ACCOUNT_LOCKED', 'Account is locked due to too many failed attempts'),
  ACCOUNT_PENDING: new AuthorizationError('AUTH_ACCOUNT_PENDING', 'Account is pending approval'),
  ACCOUNT_INACTIVE: new AuthorizationError('AUTH_ACCOUNT_INACTIVE', 'Account is inactive'),
  TOKEN_EXPIRED: new AuthenticationError('AUTH_TOKEN_EXPIRED', 'Token has expired'),
  TOKEN_INVALID: new AuthenticationError('AUTH_TOKEN_INVALID', 'Token is invalid'),
  FORBIDDEN: new AuthorizationError('AUTH_FORBIDDEN', 'Access denied'),
  OTP_INVALID: new AppError('AUTH_OTP_INVALID', 'Invalid OTP code', 400),
  OTP_EXPIRED: new AppError('AUTH_OTP_EXPIRED', 'OTP has expired', 400),
  OTP_LOCKED: new RateLimitError('OTP verification is locked. Please try again later'),
  DUPLICATE_EMAIL: new ConflictError('AUTH_DUPLICATE_EMAIL', 'Email is already registered'),
  DUPLICATE_PHONE: new ConflictError('AUTH_DUPLICATE_PHONE', 'Phone number is already registered'),
  PASSWORD_WEAK: new ValidationError('Password does not meet complexity requirements'),
};

/**
 * Create a new error instance from error code
 * @param {string} errorCode
 * @returns {AppError}
 */
function createAuthError(errorCode) {
  const error = AUTH_ERRORS[errorCode];
  if (error) {
    // Return a new instance to avoid mutation
    return new AppError(error.code, error.message, error.statusCode);
  }
  return new AppError('UNKNOWN_ERROR', 'An unknown error occurred', 500);
}

/**
 * Not Found Handler Middleware
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
}

/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  console.error('Error:', {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.isOperational ? err.message : 'An unexpected error occurred'
    }
  };

  // Add details if available (validation errors)
  if (err.details) {
    errorResponse.error.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  AUTH_ERRORS,
  createAuthError,
  notFoundHandler,
  errorHandler,
};
