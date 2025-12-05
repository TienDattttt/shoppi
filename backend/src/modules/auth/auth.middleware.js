/**
 * Auth Middleware
 * JWT validation and role-based access control
 */

const authService = require('./auth.service');
const { sendUnauthorized, sendForbidden } = require('../../shared/utils/response.util');

/**
 * Extract token from Authorization header
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return authHeader;
}

/**
 * JWT Authentication Middleware
 * Validates access token and attaches user info to request
 */
function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return sendUnauthorized(res, 'No token provided');
  }

  try {
    const decoded = authService.verifyAccessToken(token);
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    if (error.code === 'AUTH_TOKEN_EXPIRED') {
      return sendUnauthorized(res, 'Token has expired');
    }
    return sendUnauthorized(res, 'Invalid token');
  }
}

/**
 * Optional Authentication Middleware
 * Validates token if present, but doesn't require it
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = authService.verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };
  } catch {
    req.user = null;
  }

  next();
}

/**
 * Role-Based Access Control Middleware Factory
 * @param {...string} allowedRoles - Roles that are allowed to access
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Must be authenticated first
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const userRole = req.user.role;

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      return sendForbidden(res, `Access denied. Required role: ${allowedRoles.join(' or ')}`);
    }

    next();
  };
}

/**
 * Require Admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Require Partner role
 */
const requirePartner = requireRole('partner');

/**
 * Require Shipper role
 */
const requireShipper = requireRole('shipper');

/**
 * Require Customer role
 */
const requireCustomer = requireRole('customer');

/**
 * Require Admin or Partner role
 */
const requireAdminOrPartner = requireRole('admin', 'partner');

/**
 * Require any authenticated user
 */
const requireAuth = authenticate;

/**
 * Verify user owns the resource
 * @param {Function} getUserIdFromRequest - Function to extract resource owner ID from request
 * @returns {Function} Express middleware
 */
function requireOwnership(getUserIdFromRequest) {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    const resourceOwnerId = getUserIdFromRequest(req);
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check ownership
    if (req.user.userId !== resourceOwnerId) {
      return sendForbidden(res, 'Access denied. You can only access your own resources.');
    }

    next();
  };
}

module.exports = {
  // Core middleware
  authenticate,
  optionalAuth,
  requireRole,
  requireOwnership,
  
  // Convenience middleware
  requireAuth,
  requireAdmin,
  requirePartner,
  requireShipper,
  requireCustomer,
  requireAdminOrPartner,
  
  // Helpers
  extractToken,
};
