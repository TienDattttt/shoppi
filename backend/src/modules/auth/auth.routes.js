/**
 * Auth Routes
 * API endpoint definitions for authentication
 */

const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const authMiddleware = require('./auth.middleware');
const { validate } = require('./auth.validator');
const {
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
} = require('./auth.validator');
const {
  loginLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
} = require('../../shared/middleware/rate-limit.middleware');

/**
 * Public Routes (No authentication required)
 */

// Registration (rate limited: 3/minute)
router.post(
  '/register/customer',
  registerLimiter,
  validate(registerCustomerSchema),
  authController.registerCustomer
);

router.post(
  '/register/partner',
  registerLimiter,
  validate(registerPartnerSchema),
  authController.registerPartner
);

router.post(
  '/register/shipper',
  registerLimiter,
  validate(registerShipperSchema),
  authController.registerShipper
);

// OTP Verification (rate limited: 3/minute)
router.post(
  '/verify-otp',
  otpLimiter,
  validate(otpVerifySchema),
  authController.verifyOTP
);

// Login (rate limited: 5/minute)
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  authController.login
);

// OTP Login (rate limited: 3/minute)
router.post(
  '/login/otp/request',
  otpLimiter,
  validate(otpRequestSchema),
  authController.requestLoginOTP
);

router.post(
  '/login/otp/verify',
  otpLimiter,
  validate(otpLoginSchema),
  authController.loginWithOTP
);

// OAuth (rate limited: 5/minute)
router.post('/oauth/google', loginLimiter, authController.loginWithGoogle);
router.post('/oauth/facebook', loginLimiter, authController.loginWithFacebook);

// Token Refresh
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

// Password Reset (rate limited: 3/5 minutes)
router.post(
  '/password/reset/request',
  passwordResetLimiter,
  validate(passwordResetRequestSchema),
  authController.requestPasswordReset
);

router.post(
  '/password/reset/verify',
  passwordResetLimiter,
  validate(passwordResetSchema),
  authController.resetPassword
);

/**
 * Public Location Data (for shipper registration)
 * No authentication required
 */

// Get provinces list
router.get('/locations/provinces', authController.getProvinces);

// Get wards by province
router.get('/locations/wards', authController.getWards);

// Get post offices by ward
router.get('/locations/post-offices', authController.getPostOfficesByWard);

/**
 * Protected Routes (Authentication required)
 */

// Logout
router.post(
  '/logout',
  authMiddleware.authenticate,
  authController.logout
);

// Sessions
router.get(
  '/sessions',
  authMiddleware.authenticate,
  authController.getSessions
);

router.delete(
  '/sessions/:id',
  authMiddleware.authenticate,
  authController.terminateSession
);

// Current User
router.get(
  '/me',
  authMiddleware.authenticate,
  authController.getCurrentUser
);

/**
 * Admin Routes (Admin role required)
 */

router.post(
  '/admin/approve/:userId',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  authController.approveAccount
);

router.post(
  '/admin/reject/:userId',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  authController.rejectAccount
);

module.exports = router;
