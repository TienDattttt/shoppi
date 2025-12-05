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

/**
 * Public Routes (No authentication required)
 */

// Registration
router.post(
  '/register/customer',
  validate(registerCustomerSchema),
  authController.registerCustomer
);

router.post(
  '/register/partner',
  validate(registerPartnerSchema),
  authController.registerPartner
);

router.post(
  '/register/shipper',
  validate(registerShipperSchema),
  authController.registerShipper
);

// OTP Verification
router.post(
  '/verify-otp',
  validate(otpVerifySchema),
  authController.verifyOTP
);

// Login
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

// OTP Login
router.post(
  '/login/otp/request',
  validate(otpRequestSchema),
  authController.requestLoginOTP
);

router.post(
  '/login/otp/verify',
  validate(otpLoginSchema),
  authController.loginWithOTP
);

// OAuth
router.post('/oauth/google', authController.loginWithGoogle);
router.post('/oauth/facebook', authController.loginWithFacebook);

// Token Refresh
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

// Password Reset
router.post(
  '/password/reset/request',
  validate(passwordResetRequestSchema),
  authController.requestPasswordReset
);

router.post(
  '/password/reset/verify',
  validate(passwordResetSchema),
  authController.resetPassword
);

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
