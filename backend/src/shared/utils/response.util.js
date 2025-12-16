/**
 * Response Utility
 * Standardized API response helpers
 */

/**
 * Send success response
 * @param {import('express').Response} res
 * @param {object} data
 * @param {number} statusCode
 */
function sendSuccess(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Send created response (201)
 * @param {import('express').Response} res
 * @param {object} data
 */
function sendCreated(res, data = {}) {
  return sendSuccess(res, data, 201);
}

/**
 * Send no content response (204)
 * @param {import('express').Response} res
 */
function sendNoContent(res) {
  return res.status(204).send();
}

/**
 * Send error response
 * @param {import('express').Response} res
 * @param {string} code
 * @param {string} message
 * @param {number} statusCode
 * @param {object} details
 */
function sendError(res, code, message, statusCode = 400, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send validation error response
 * @param {import('express').Response} res
 * @param {object} details - Validation error details
 */
function sendValidationError(res, details) {
  return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, details);
}

/**
 * Send unauthorized response
 * @param {import('express').Response} res
 * @param {string} message
 */
function sendUnauthorized(res, message = 'Unauthorized') {
  return sendError(res, 'AUTH_UNAUTHORIZED', message, 401);
}

/**
 * Send forbidden response
 * @param {import('express').Response} res
 * @param {string} message
 */
function sendForbidden(res, message = 'Forbidden') {
  return sendError(res, 'AUTH_FORBIDDEN', message, 403);
}

/**
 * Send not found response
 * @param {import('express').Response} res
 * @param {string} message
 */
function sendNotFound(res, message = 'Resource not found') {
  return sendError(res, 'NOT_FOUND', message, 404);
}

/**
 * Send bad request response
 * @param {import('express').Response} res
 * @param {string} message
 */
function sendBadRequest(res, message = 'Bad request') {
  return sendError(res, 'BAD_REQUEST', message, 400);
}

/**
 * Send conflict response
 * @param {import('express').Response} res
 * @param {string} code
 * @param {string} message
 */
function sendConflict(res, code, message) {
  return sendError(res, code, message, 409);
}

/**
 * Send rate limit response
 * @param {import('express').Response} res
 * @param {string} message
 */
function sendRateLimited(res, message = 'Too many requests') {
  return sendError(res, 'RATE_LIMITED', message, 429);
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendBadRequest,
  sendConflict,
  sendRateLimited,
};
