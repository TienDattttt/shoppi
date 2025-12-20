/**
 * Auth Controller
 * HTTP request handlers for authentication endpoints
 */

const authService = require('./auth.service');
const { sendSuccess, sendCreated, sendError } = require('../../shared/utils/response.util');

/**
 * Register Customer
 * POST /api/auth/register/customer
 */
async function registerCustomer(req, res) {
  try {
    const result = await authService.registerCustomer(req.body);
    return sendCreated(res, result);
  } catch (error) {
    return sendError(res, error.code || 'REGISTRATION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Register Partner
 * POST /api/auth/register/partner
 */
async function registerPartner(req, res) {
  try {
    const result = await authService.registerPartner(req.body);
    return sendCreated(res, result);
  } catch (error) {
    return sendError(res, error.code || 'REGISTRATION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Register Shipper
 * POST /api/auth/register/shipper
 */
async function registerShipper(req, res) {
  try {
    const result = await authService.registerShipper(req.body);
    return sendCreated(res, result);
  } catch (error) {
    return sendError(res, error.code || 'REGISTRATION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
async function verifyOTP(req, res) {
  try {
    const { identifier, otp, purpose } = req.body;
    const result = await authService.verifyOTP(identifier, otp, purpose || 'registration');
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'OTP_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Login with email/phone and password
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const deviceInfo = {
      deviceType: req.body.deviceType || req.headers['x-device-type'] || 'unknown',
      deviceName: req.body.deviceName || req.headers['x-device-name'] || 'unknown',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.login(req.body, deviceInfo);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'LOGIN_ERROR', error.message, error.statusCode || 401);
  }
}

/**
 * Request OTP for login
 * POST /api/auth/login/otp/request
 */
async function requestLoginOTP(req, res) {
  try {
    const { phone } = req.body;
    const result = await authService.requestOTP(phone, 'login');
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'OTP_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Login with OTP
 * POST /api/auth/login/otp/verify
 */
async function loginWithOTP(req, res) {
  try {
    const deviceInfo = {
      deviceType: req.body.deviceType || req.headers['x-device-type'] || 'unknown',
      deviceName: req.body.deviceName || req.headers['x-device-name'] || 'unknown',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.loginWithOTP(req.body, deviceInfo);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'LOGIN_ERROR', error.message, error.statusCode || 401);
  }
}

/**
 * Login with Google OAuth
 * POST /api/auth/oauth/google
 */
async function loginWithGoogle(req, res) {
  try {
    const { idToken, accessToken } = req.body;
    
    // TODO: Verify Google token and extract user info
    // For now, expect client to send user data
    const { providerId, email, name, avatarUrl } = req.body;

    const deviceInfo = {
      deviceType: req.body.deviceType || 'unknown',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.loginWithOAuth('google', {
      providerId,
      email,
      name,
      avatarUrl,
    }, deviceInfo);

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'OAUTH_ERROR', error.message, error.statusCode || 401);
  }
}

/**
 * Login with Facebook OAuth
 * POST /api/auth/oauth/facebook
 */
async function loginWithFacebook(req, res) {
  try {
    const { providerId, email, name, avatarUrl } = req.body;

    const deviceInfo = {
      deviceType: req.body.deviceType || 'unknown',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await authService.loginWithOAuth('facebook', {
      providerId,
      email,
      name,
      avatarUrl,
    }, deviceInfo);

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'OAUTH_ERROR', error.message, error.statusCode || 401);
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'TOKEN_ERROR', error.message, error.statusCode || 401);
  }
}

/**
 * Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const { userId, sessionId } = req.user;
    const result = await authService.logout(userId, sessionId);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'LOGOUT_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Request password reset
 * POST /api/auth/password/reset/request
 */
async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body;
    const result = await authService.requestPasswordReset(identifier);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'RESET_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Reset password with OTP
 * POST /api/auth/password/reset/verify
 */
async function resetPassword(req, res) {
  try {
    const result = await authService.resetPassword(req.body);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'RESET_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Get active sessions
 * GET /api/auth/sessions
 */
async function getSessions(req, res) {
  try {
    const { userId } = req.user;
    const sessions = await authService.getSessions(userId);
    return sendSuccess(res, { sessions });
  } catch (error) {
    return sendError(res, error.code || 'SESSION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Terminate a session
 * DELETE /api/auth/sessions/:id
 */
async function terminateSession(req, res) {
  try {
    const { userId } = req.user;
    const { id: sessionId } = req.params;
    const result = await authService.terminateSession(userId, sessionId);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'SESSION_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  try {
    const { userId } = req.user;
    const user = await authService.getCurrentUser(userId);
    return sendSuccess(res, { user });
  } catch (error) {
    return sendError(res, error.code || 'USER_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Update current user profile
 * PATCH /api/auth/me
 */
async function updateProfile(req, res) {
  try {
    const { userId } = req.user;
    const { fullName, gender, dateOfBirth, avatarUrl } = req.body;
    const user = await authService.updateProfile(userId, { fullName, gender, dateOfBirth, avatarUrl });
    return sendSuccess(res, { user });
  } catch (error) {
    return sendError(res, error.code || 'UPDATE_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Upload avatar
 * POST /api/auth/me/avatar
 */
async function uploadAvatar(req, res) {
  try {
    const { userId } = req.user;
    const storageClient = require('../../shared/supabase/storage.client');
    
    if (!req.file) {
      return sendError(res, 'UPLOAD_ERROR', 'No file provided', 400);
    }
    
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const path = `avatars/${userId}.${ext}`;
    
    const result = await storageClient.uploadFile(
      storageClient.BUCKETS.AVATARS,
      path,
      req.file.buffer,
      { contentType: req.file.mimetype, upsert: true }
    );
    
    // Update user avatar_url
    const user = await authService.updateProfile(userId, { avatarUrl: result.url });
    
    return sendSuccess(res, { url: result.url, user });
  } catch (error) {
    return sendError(res, error.code || 'UPLOAD_ERROR', error.message, error.statusCode || 500);
  }
}

/**
 * Approve account (Admin only)
 * POST /api/auth/admin/approve/:userId
 */
async function approveAccount(req, res) {
  try {
    const { userId } = req.params;
    const result = await authService.approveAccount(userId);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'APPROVAL_ERROR', error.message, error.statusCode || 400);
  }
}

/**
 * Reject account (Admin only)
 * POST /api/auth/admin/reject/:userId
 */
async function rejectAccount(req, res) {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const result = await authService.rejectAccount(userId, reason);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.code || 'REJECTION_ERROR', error.message, error.statusCode || 400);
  }
}

// ============================================
// PUBLIC LOCATION DATA (for shipper registration)
// ============================================

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');

/**
 * Get provinces list
 * GET /api/auth/locations/provinces
 */
async function getProvinces(req, res) {
  try {
    const { region } = req.query;
    
    let query = supabaseAdmin
      .from('provinces')
      .select('code, name, full_name, region')
      .order('name');
    
    if (region) {
      query = query.eq('region', region);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return sendSuccess(res, { provinces: data });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

/**
 * Get wards by province
 * GET /api/auth/locations/wards?province_code=79
 */
async function getWards(req, res) {
  try {
    const { province_code } = req.query;
    
    if (!province_code) {
      return sendError(res, 'VALIDATION_ERROR', 'province_code is required', 400);
    }
    
    const { data, error } = await supabaseAdmin
      .from('wards')
      .select('code, name, province_code, ward_type')
      .eq('province_code', province_code)
      .order('name');
    
    if (error) throw error;
    
    return sendSuccess(res, { wards: data });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

/**
 * Get post offices by ward
 * GET /api/auth/locations/post-offices?ward_code=26734
 */
async function getPostOfficesByWard(req, res) {
  try {
    const { ward_code, province_code } = req.query;
    
    let query = supabaseAdmin
      .from('post_offices')
      .select('id, code, name, name_vi, address, district, city')
      .eq('is_active', true)
      .eq('office_type', 'post_office')
      .order('name_vi');
    
    if (ward_code) {
      query = query.eq('ward_code', ward_code);
    } else if (province_code) {
      // Fallback: get all post offices in province
      const { data: province } = await supabaseAdmin
        .from('provinces')
        .select('name')
        .eq('code', province_code)
        .single();
      
      if (province) {
        query = query.eq('city', province.name);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return sendSuccess(res, { postOffices: data });
  } catch (error) {
    return sendError(res, 'QUERY_ERROR', error.message, 500);
  }
}

module.exports = {
  // Registration
  registerCustomer,
  registerPartner,
  registerShipper,
  verifyOTP,
  
  // Login
  login,
  requestLoginOTP,
  loginWithOTP,
  loginWithGoogle,
  loginWithFacebook,
  
  // Token
  refreshToken,
  logout,
  
  // Password
  requestPasswordReset,
  resetPassword,
  
  // Sessions
  getSessions,
  terminateSession,
  
  // User
  getCurrentUser,
  updateProfile,
  uploadAvatar,
  
  // Admin
  approveAccount,
  rejectAccount,
  
  // Public Location Data
  getProvinces,
  getWards,
  getPostOfficesByWard,
};
