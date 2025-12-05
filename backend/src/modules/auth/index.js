/**
 * Auth Module Entry Point
 * Exports all auth-related components for use in the application
 */

module.exports = {
  // Routes
  authRoutes: require('./auth.routes'),
  
  // Middleware
  authMiddleware: require('./auth.middleware'),
  
  // Service
  authService: require('./auth.service'),
  
  // Repository
  authRepository: require('./auth.repository'),
  
  // DTOs
  authDTO: require('./auth.dto'),
  
  // Validators
  authValidator: require('./auth.validator'),
};
