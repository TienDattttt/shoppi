/**
 * Auth Service
 * Business logic for authentication operations
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const authRepository = require('./auth.repository');
const { serializeUser } = require('./auth.dto');
const { 
  ConflictError, 
  AuthenticationError, 
  AuthorizationError,
  ValidationError,
  RateLimitError,
} = require('../../shared/utils/error.util');

const SALT_ROUNDS = 10;

/**
 * Generate 6-digit OTP
 * @returns {string}
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash password
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Hash token for storage
 * @param {string} token
 * @returns {string}
 */
function hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Register a new Customer
 * @param {object} data - Registration data
 * @returns {Promise<object>} - Created user and OTP info
 */
async function registerCustomer(data) {
  const { email, phone, password, fullName } = data;

  // Check for existing user
  if (email) {
    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new ConflictError('AUTH_DUPLICATE_EMAIL', 'Email is already registered');
    }
  }

  if (phone) {
    const existingPhone = await authRepository.findUserByPhone(phone);
    if (existingPhone) {
      throw new ConflictError('AUTH_DUPLICATE_PHONE', 'Phone number is already registered');
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user with pending status (will be activated after OTP verification)
  const user = await authRepository.createUser({
    email: email ? email.toLowerCase() : null,
    phone: phone ? authRepository.normalizePhone(phone) : null,
    password_hash: passwordHash,
    role: 'customer',
    status: 'pending', // Will be activated after OTP verification
    full_name: fullName,
  });

  // Generate and store OTP
  const otpCode = generateOTP();
  const identifier = phone || email;
  
  await authRepository.createOTP({
    identifier,
    otp_code: otpCode,
    purpose: 'registration',
    expiresInMinutes: config.otp.expiresInMinutes,
  });

  // TODO: Send OTP via SMS or Email
  // await sendOTP(identifier, otpCode);

  return {
    user: serializeUser(user),
    message: `Verification code sent to ${phone ? 'phone' : 'email'}`,
    // In development, return OTP for testing
    ...(config.nodeEnv === 'development' && { otp: otpCode }),
  };
}

/**
 * Register a new Partner
 * Auto-creates a Shop for the Partner (1 Partner = 1 Shop)
 * @param {object} data - Registration data
 * @returns {Promise<object>}
 */
async function registerPartner(data) {
  const { email, phone, password, fullName, businessName, taxId } = data;

  // Check for existing user
  const existingEmail = await authRepository.findUserByEmail(email);
  if (existingEmail) {
    throw new ConflictError('AUTH_DUPLICATE_EMAIL', 'Email is already registered');
  }

  const existingPhone = await authRepository.findUserByPhone(phone);
  if (existingPhone) {
    throw new ConflictError('AUTH_DUPLICATE_PHONE', 'Phone number is already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create Partner with pending status (requires admin approval)
  const user = await authRepository.createUser({
    email: email.toLowerCase(),
    phone: authRepository.normalizePhone(phone),
    password_hash: passwordHash,
    role: 'partner',
    status: 'pending', // Requires admin approval
    full_name: fullName,
    business_name: businessName,
    tax_id: taxId,
  });

  // Auto-create Shop for Partner (1 Partner = 1 Shop)
  try {
    const shopRepository = require('../shop/shop.repository');
    const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    await shopRepository.createShop({
      partner_id: user.id,
      shop_name: businessName || fullName + "'s Shop",
      slug: slugify(businessName || fullName) + '-' + Date.now(),
      description: null,
      phone: authRepository.normalizePhone(phone),
      email: email.toLowerCase(),
      status: 'pending', // Shop also pending until admin approves
    });
  } catch (shopError) {
    console.error('Failed to auto-create shop for partner:', shopError.message);
    // Don't fail registration if shop creation fails
  }

  // Send welcome email
  try {
    const emailService = require('../../shared/email/email.service');
    await emailService.sendPartnerWelcomeEmail(email, fullName, businessName);
  } catch (emailError) {
    console.error('Failed to send welcome email:', emailError.message);
    // Don't fail registration if email fails
  }

  return {
    user: serializeUser(user),
    message: 'Registration submitted. Please wait for admin approval.',
  };
}

/**
 * Register a new Shipper
 * @param {object} data - Registration data
 * @returns {Promise<object>}
 */
async function registerShipper(data) {
  const { phone, password, fullName, idCardNumber, vehicleType, vehiclePlate } = data;

  // Check for existing user
  const existingPhone = await authRepository.findUserByPhone(phone);
  if (existingPhone) {
    throw new ConflictError('AUTH_DUPLICATE_PHONE', 'Phone number is already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create Shipper with pending status (requires admin approval)
  const user = await authRepository.createUser({
    phone: authRepository.normalizePhone(phone),
    password_hash: passwordHash,
    role: 'shipper',
    status: 'pending', // Requires admin approval
    full_name: fullName,
    id_card_number: idCardNumber,
    vehicle_type: vehicleType,
    vehicle_plate: vehiclePlate,
  });

  return {
    user: serializeUser(user),
    message: 'Registration submitted. Please wait for admin approval and document verification.',
  };
}

/**
 * Request OTP for login or password reset
 * @param {string} identifier - Phone number or email
 * @param {string} purpose - 'login' or 'password_reset'
 * @returns {Promise<object>}
 */
async function requestOTP(identifier, purpose = 'login') {
  // Check rate limiting
  const recentRequests = await authRepository.countRecentOTPRequests(
    identifier,
    config.otp.requestWindowMinutes
  );

  if (recentRequests >= config.otp.maxRequestsPerWindow) {
    throw new RateLimitError(
      `Too many OTP requests. Please wait ${config.otp.lockoutMinutes} minutes.`
    );
  }

  // Find user by identifier
  const user = await authRepository.findUserByIdentifier(identifier);
  if (!user && purpose !== 'registration') {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  // Generate and store OTP
  const otpCode = generateOTP();
  
  await authRepository.createOTP({
    identifier,
    otp_code: otpCode,
    purpose,
    expiresInMinutes: config.otp.expiresInMinutes,
    max_attempts: config.otp.maxAttempts,
  });

  // TODO: Send OTP via SMS or Email
  // await sendOTP(identifier, otpCode);

  return {
    message: 'OTP sent successfully',
    expiresIn: config.otp.expiresInMinutes * 60, // seconds
    // In development, return OTP for testing
    ...(config.nodeEnv === 'development' && { otp: otpCode }),
  };
}

/**
 * Verify OTP code
 * @param {string} identifier - Phone or email
 * @param {string} otpCode - 6-digit OTP
 * @param {string} purpose - 'registration', 'login', or 'password_reset'
 * @returns {Promise<object>}
 */
async function verifyOTP(identifier, otpCode, purpose) {
  // Find valid OTP
  const otp = await authRepository.findValidOTP(identifier, purpose);

  if (!otp) {
    throw new AuthenticationError('AUTH_OTP_EXPIRED', 'OTP has expired or not found');
  }

  // Check if OTP is locked due to too many attempts
  if (otp.attempts >= otp.max_attempts) {
    throw new RateLimitError(
      `OTP verification locked. Please request a new OTP after ${config.otp.lockoutMinutes} minutes.`
    );
  }

  // Check if OTP matches
  if (otp.otp_code !== otpCode) {
    // Increment attempts
    await authRepository.incrementOTPAttempts(otp.id);
    
    const remainingAttempts = otp.max_attempts - otp.attempts - 1;
    
    if (remainingAttempts <= 0) {
      throw new RateLimitError('OTP verification locked due to too many failed attempts.');
    }
    
    throw new AuthenticationError(
      'AUTH_OTP_INVALID',
      `Invalid OTP. ${remainingAttempts} attempts remaining.`
    );
  }

  // Mark OTP as verified
  await authRepository.markOTPVerified(otp.id);

  // If registration OTP, activate the user account
  if (purpose === 'registration') {
    const user = await authRepository.findUserByIdentifier(identifier);
    if (user && user.role === 'customer') {
      await authRepository.updateUser(user.id, { status: 'active' });
      return {
        success: true,
        message: 'Account verified and activated',
        user: serializeUser({ ...user, status: 'active' }),
      };
    }
  }

  return {
    success: true,
    message: 'OTP verified successfully',
  };
}

/**
 * Check if OTP verification is locked for identifier
 * @param {string} identifier
 * @param {string} purpose
 * @returns {Promise<boolean>}
 */
async function isOTPLocked(identifier, purpose) {
  const otp = await authRepository.findValidOTP(identifier, purpose);
  if (!otp) return false;
  return otp.attempts >= otp.max_attempts;
}

/**
 * Check if OTP requests are rate limited
 * @param {string} identifier
 * @returns {Promise<boolean>}
 */
async function isOTPRateLimited(identifier) {
  const recentRequests = await authRepository.countRecentOTPRequests(
    identifier,
    config.otp.requestWindowMinutes
  );
  return recentRequests >= config.otp.maxRequestsPerWindow;
}

/**
 * Generate JWT tokens
 * @param {object} user
 * @param {string} sessionId
 * @returns {object} Token pair
 */
function generateTokens(user, sessionId) {
  const payload = {
    userId: user.id,
    role: user.role,
    sessionId,
  };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Create session and generate tokens
 * @param {object} user
 * @param {object} deviceInfo
 * @returns {Promise<object>}
 */
async function createSessionWithTokens(user, deviceInfo = {}) {
  const sessionId = uuidv4();
  const tokens = generateTokens(user, sessionId);
  
  // Calculate refresh token expiry (7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Store session
  await authRepository.createSession({
    id: sessionId,
    user_id: user.id,
    refresh_token_hash: hashToken(tokens.refreshToken),
    device_type: deviceInfo.deviceType || 'unknown',
    device_name: deviceInfo.deviceName || 'unknown',
    ip_address: deviceInfo.ipAddress || null,
    user_agent: deviceInfo.userAgent || null,
    expires_at: expiresAt.toISOString(),
  });

  // Update last login
  await authRepository.updateLastLogin(user.id);

  return {
    ...tokens,
    user: serializeUser(user),
  };
}

/**
 * Login with email/phone and password
 * @param {object} data - { identifier, password }
 * @param {object} deviceInfo - Device information
 * @returns {Promise<object>}
 */
async function login(data, deviceInfo = {}) {
  const { identifier, password } = data;

  // Find user
  const user = await authRepository.findUserByIdentifier(identifier);
  
  if (!user) {
    throw new AuthenticationError('AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
  }

  // Check if account is locked
  if (user.status === 'locked') {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AuthorizationError('AUTH_ACCOUNT_LOCKED', 'Account is locked. Please try again later.');
    }
    // Unlock if lockout period has passed
    await authRepository.unlockAccount(user.id);
  }

  // Check account status
  if (user.status === 'pending') {
    throw new AuthorizationError('AUTH_ACCOUNT_PENDING', 'Account is pending approval');
  }
  
  if (user.status === 'inactive') {
    throw new AuthorizationError('AUTH_ACCOUNT_INACTIVE', 'Account is inactive');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) {
    // Increment failed attempts
    const updatedUser = await authRepository.incrementFailedAttempts(user.id);
    const attempts = (updatedUser?.failed_login_attempts || user.failed_login_attempts || 0) + 1;
    
    // Lock account if max attempts reached
    if (attempts >= config.security.maxLoginAttempts) {
      await authRepository.lockAccount(user.id, config.security.lockoutMinutes);
      throw new AuthorizationError(
        'AUTH_ACCOUNT_LOCKED',
        `Account locked due to too many failed attempts. Try again in ${config.security.lockoutMinutes} minutes.`
      );
    }
    
    throw new AuthenticationError(
      'AUTH_INVALID_CREDENTIALS',
      `Invalid credentials. ${config.security.maxLoginAttempts - attempts} attempts remaining.`
    );
  }

  // Reset failed attempts on successful login
  if (user.failed_login_attempts > 0) {
    await authRepository.resetFailedAttempts(user.id);
  }

  // Create session and generate tokens
  return createSessionWithTokens(user, deviceInfo);
}

/**
 * Login with OTP
 * @param {object} data - { phone, otp }
 * @param {object} deviceInfo
 * @returns {Promise<object>}
 */
async function loginWithOTP(data, deviceInfo = {}) {
  const { phone, otp } = data;

  // Verify OTP
  await verifyOTP(phone, otp, 'login');

  // Find user
  const user = await authRepository.findUserByPhone(phone);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  // Check account status
  if (user.status !== 'active') {
    throw new AuthorizationError('AUTH_ACCOUNT_INACTIVE', 'Account is not active');
  }

  // Create session and generate tokens
  return createSessionWithTokens(user, deviceInfo);
}

/**
 * Track failed login attempt
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function trackFailedLogin(userId) {
  const user = await authRepository.findUserById(userId);
  if (!user) return null;

  const attempts = (user.failed_login_attempts || 0) + 1;
  
  if (attempts >= config.security.maxLoginAttempts) {
    return authRepository.lockAccount(userId, config.security.lockoutMinutes);
  }
  
  return authRepository.incrementFailedAttempts(userId);
}

/**
 * Check if account is locked
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isAccountLocked(userId) {
  const user = await authRepository.findUserById(userId);
  if (!user) return false;
  
  if (user.status !== 'locked') return false;
  
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return true;
  }
  
  // Auto-unlock if lockout period passed
  await authRepository.unlockAccount(userId);
  return false;
}

/**
 * Login with OAuth provider (Google/Facebook)
 * @param {string} provider - 'google' or 'facebook'
 * @param {object} oauthData - OAuth user data from provider
 * @param {object} deviceInfo
 * @returns {Promise<object>}
 */
async function loginWithOAuth(provider, oauthData, deviceInfo = {}) {
  const { providerId, email, name, avatarUrl } = oauthData;

  if (!['google', 'facebook'].includes(provider)) {
    throw new ValidationError('Invalid OAuth provider');
  }

  // Check if user exists with this OAuth ID
  let user = await authRepository.findUserByOAuthId(provider, providerId);

  if (user) {
    // Existing OAuth user - check status
    if (user.status !== 'active') {
      throw new AuthorizationError('AUTH_ACCOUNT_INACTIVE', 'Account is not active');
    }
    
    // Create session and return tokens
    return {
      ...await createSessionWithTokens(user, deviceInfo),
      isNewUser: false,
    };
  }

  // Check if user exists with same email
  if (email) {
    user = await authRepository.findUserByEmail(email);
    
    if (user) {
      // Link OAuth provider to existing account
      await authRepository.linkOAuthProvider(user.id, provider, providerId);
      
      // Update avatar if not set
      if (!user.avatar_url && avatarUrl) {
        await authRepository.updateUser(user.id, { avatar_url: avatarUrl });
      }

      if (user.status !== 'active') {
        throw new AuthorizationError('AUTH_ACCOUNT_INACTIVE', 'Account is not active');
      }

      return {
        ...await createSessionWithTokens(user, deviceInfo),
        isNewUser: false,
        linkedProvider: provider,
      };
    }
  }

  // Create new customer account via OAuth
  const newUser = await authRepository.createUser({
    email: email ? email.toLowerCase() : null,
    role: 'customer',
    status: 'active', // OAuth users are auto-activated
    full_name: name || 'OAuth User',
    avatar_url: avatarUrl || null,
    [`${provider}_id`]: providerId,
  });

  return {
    ...await createSessionWithTokens(newUser, deviceInfo),
    isNewUser: true,
  };
}

/**
 * Link OAuth provider to existing account
 * @param {string} userId
 * @param {string} provider
 * @param {string} providerId
 * @returns {Promise<object>}
 */
async function linkOAuthToAccount(userId, provider, providerId) {
  // Check if provider ID is already linked to another account
  const existingUser = await authRepository.findUserByOAuthId(provider, providerId);
  
  if (existingUser && existingUser.id !== userId) {
    throw new ConflictError(
      'AUTH_OAUTH_ALREADY_LINKED',
      `This ${provider} account is already linked to another user`
    );
  }

  // Link provider
  await authRepository.linkOAuthProvider(userId, provider, providerId);

  const user = await authRepository.findUserById(userId);
  return {
    success: true,
    message: `${provider} account linked successfully`,
    user: serializeUser(user),
  };
}

/**
 * Unlink OAuth provider from account
 * @param {string} userId
 * @param {string} provider
 * @returns {Promise<object>}
 */
async function unlinkOAuthFromAccount(userId, provider) {
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  // Ensure user has another login method (password or other OAuth)
  const hasPassword = !!user.password_hash;
  const hasGoogle = !!user.google_id && provider !== 'google';
  const hasFacebook = !!user.facebook_id && provider !== 'facebook';

  if (!hasPassword && !hasGoogle && !hasFacebook) {
    throw new ValidationError(
      'Cannot unlink the only login method. Please set a password first.'
    );
  }

  // Unlink provider
  await authRepository.updateUser(userId, { [`${provider}_id`]: null });

  return {
    success: true,
    message: `${provider} account unlinked successfully`,
  };
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken
 * @returns {Promise<object>}
 */
async function refreshAccessToken(refreshToken) {
  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('AUTH_TOKEN_EXPIRED', 'Refresh token has expired');
    }
    throw new AuthenticationError('AUTH_TOKEN_INVALID', 'Invalid refresh token');
  }

  // Check token type
  if (decoded.type !== 'refresh') {
    throw new AuthenticationError('AUTH_TOKEN_INVALID', 'Invalid token type');
  }

  // Find session by refresh token hash
  const refreshTokenHash = hashToken(refreshToken);
  const session = await authRepository.findSessionByRefreshToken(refreshTokenHash);

  if (!session) {
    throw new AuthenticationError('AUTH_TOKEN_INVALID', 'Session not found or expired');
  }

  // Check if session is expired
  if (new Date(session.expires_at) < new Date()) {
    await authRepository.deleteSession(session.id);
    throw new AuthenticationError('AUTH_TOKEN_EXPIRED', 'Session has expired');
  }

  // Get user
  const user = await authRepository.findUserById(decoded.userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  if (user.status !== 'active') {
    throw new AuthorizationError('AUTH_ACCOUNT_INACTIVE', 'Account is not active');
  }

  // Generate new access token only (keep same refresh token)
  const payload = {
    userId: user.id,
    role: user.role,
    sessionId: session.id,
  };

  const newAccessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });

  // Update session activity
  await authRepository.updateSessionActivity(session.id);

  return {
    accessToken: newAccessToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
    tokenType: 'Bearer',
  };
}

/**
 * Verify access token
 * @param {string} accessToken
 * @returns {object} Decoded token payload
 */
function verifyAccessToken(accessToken) {
  try {
    return jwt.verify(accessToken, config.jwt.accessSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('AUTH_TOKEN_EXPIRED', 'Access token has expired');
    }
    throw new AuthenticationError('AUTH_TOKEN_INVALID', 'Invalid access token');
  }
}

/**
 * Verify refresh token
 * @param {string} refreshToken
 * @returns {object} Decoded token payload
 */
function verifyRefreshToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    if (decoded.type !== 'refresh') {
      throw new AuthenticationError('AUTH_TOKEN_INVALID', 'Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('AUTH_TOKEN_EXPIRED', 'Refresh token has expired');
    }
    throw new AuthenticationError('AUTH_TOKEN_INVALID', 'Invalid refresh token');
  }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token
 * @returns {object|null}
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

/**
 * Get token expiration time
 * @param {string} token
 * @returns {Date|null}
 */
function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
}

/**
 * Check if token is expired
 * @param {string} token
 * @returns {boolean}
 */
function isTokenExpired(token) {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return expiration < new Date();
}

/**
 * Get all active sessions for a user
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getSessions(userId) {
  const sessions = await authRepository.findSessionsByUserId(userId);
  
  return sessions.map(session => ({
    id: session.id,
    deviceType: session.device_type,
    deviceName: session.device_name,
    ipAddress: session.ip_address,
    lastActivityAt: session.last_activity_at,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
  }));
}

/**
 * Terminate a specific session
 * @param {string} userId
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function terminateSession(userId, sessionId) {
  // Verify session belongs to user
  const session = await authRepository.findSessionById(sessionId);
  
  if (!session) {
    throw new AuthenticationError('AUTH_SESSION_NOT_FOUND', 'Session not found');
  }
  
  if (session.user_id !== userId) {
    throw new AuthorizationError('AUTH_FORBIDDEN', 'Cannot terminate another user\'s session');
  }

  await authRepository.deleteSession(sessionId);

  return {
    success: true,
    message: 'Session terminated successfully',
  };
}

/**
 * Logout - invalidate current session
 * @param {string} userId
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function logout(userId, sessionId) {
  await authRepository.deleteSession(sessionId);

  return {
    success: true,
    message: 'Logged out successfully',
  };
}

/**
 * Logout from all devices - invalidate all sessions
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function logoutAllDevices(userId) {
  await authRepository.deleteAllUserSessions(userId);

  return {
    success: true,
    message: 'Logged out from all devices',
  };
}

/**
 * Get current user profile
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getCurrentUser(userId) {
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  return serializeUser(user);
}

/**
 * Request password reset
 * @param {string} identifier - Email or phone
 * @returns {Promise<object>}
 */
async function requestPasswordReset(identifier) {
  // Find user
  const user = await authRepository.findUserByIdentifier(identifier);
  
  if (!user) {
    // Don't reveal if user exists - return success anyway
    return {
      success: true,
      message: 'If an account exists, a reset code has been sent',
    };
  }

  // Check rate limiting
  const isRateLimited = await isOTPRateLimited(identifier);
  if (isRateLimited) {
    throw new RateLimitError('Too many reset requests. Please try again later.');
  }

  // Generate OTP for password reset
  const otpCode = generateOTP();
  
  await authRepository.createOTP({
    identifier,
    otp_code: otpCode,
    purpose: 'password_reset',
    expiresInMinutes: identifier.includes('@') ? 60 : 5, // Email: 1 hour, Phone: 5 min
    max_attempts: config.otp.maxAttempts,
  });

  // TODO: Send reset code via email or SMS
  // if (identifier.includes('@')) {
  //   await sendEmail(identifier, 'Password Reset', `Your reset code: ${otpCode}`);
  // } else {
  //   await sendSMS(identifier, `Your reset code: ${otpCode}`);
  // }

  return {
    success: true,
    message: 'If an account exists, a reset code has been sent',
    // In development, return OTP for testing
    ...(config.nodeEnv === 'development' && { otp: otpCode }),
  };
}

/**
 * Reset password with OTP
 * @param {object} data - { identifier, otp, newPassword }
 * @returns {Promise<object>}
 */
async function resetPassword(data) {
  const { identifier, otp, newPassword } = data;

  // Validate password complexity
  const { validatePasswordComplexity } = require('./auth.validator');
  const passwordValidation = validatePasswordComplexity(newPassword);
  
  if (!passwordValidation.isValid) {
    throw new ValidationError(
      `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`
    );
  }

  // Verify OTP
  await verifyOTP(identifier, otp, 'password_reset');

  // Find user
  const user = await authRepository.findUserByIdentifier(identifier);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await authRepository.updateUser(user.id, {
    password_hash: passwordHash,
  });

  // Invalidate all existing sessions (security measure)
  await authRepository.deleteAllUserSessions(user.id);

  return {
    success: true,
    message: 'Password reset successfully. Please login with your new password.',
  };
}

/**
 * Change password (for logged-in users)
 * @param {string} userId
 * @param {object} data - { currentPassword, newPassword }
 * @returns {Promise<object>}
 */
async function changePassword(userId, data) {
  const { currentPassword, newPassword } = data;

  // Find user
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
  
  if (!isValidPassword) {
    throw new AuthenticationError('AUTH_INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  // Validate new password complexity
  const { validatePasswordComplexity } = require('./auth.validator');
  const passwordValidation = validatePasswordComplexity(newPassword);
  
  if (!passwordValidation.isValid) {
    throw new ValidationError(
      `Password does not meet requirements: ${passwordValidation.errors.join(', ')}`
    );
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await authRepository.updateUser(userId, {
    password_hash: passwordHash,
  });

  // Invalidate all other sessions (keep current session)
  // Note: In a real implementation, you'd pass the current session ID to keep
  await authRepository.deleteAllUserSessions(userId);

  return {
    success: true,
    message: 'Password changed successfully. Please login again.',
  };
}

/**
 * Approve a pending account (Admin only)
 * @param {string} userId - User ID to approve
 * @param {string} adminId - Admin performing the action
 * @returns {Promise<object>}
 */
async function approveAccount(userId, adminId) {
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  if (user.status !== 'pending') {
    throw new ValidationError(`Cannot approve account with status: ${user.status}`);
  }

  // Only Partner and Shipper accounts need approval
  if (!['partner', 'shipper'].includes(user.role)) {
    throw new ValidationError('Only Partner and Shipper accounts require approval');
  }

  // Update status to active
  await authRepository.updateUser(userId, {
    status: 'active',
  });

  // Send approval notification email
  if (user.email) {
    try {
      const emailService = require('../../shared/email/email.service');
      await emailService.sendAccountApprovedEmail(user.email, user.full_name);
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError.message);
    }
  }

  return {
    success: true,
    message: 'Account approved successfully',
    user: serializeUser({ ...user, status: 'active' }),
    approvedBy: adminId,
    approvedAt: new Date().toISOString(),
  };
}

/**
 * Reject a pending account (Admin only)
 * @param {string} userId - User ID to reject
 * @param {string} adminId - Admin performing the action
 * @param {string} reason - Rejection reason
 * @returns {Promise<object>}
 */
async function rejectAccount(userId, adminId, reason) {
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  if (user.status !== 'pending') {
    throw new ValidationError(`Cannot reject account with status: ${user.status}`);
  }

  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Rejection reason is required');
  }

  // Update status to inactive (rejected)
  await authRepository.updateUser(userId, {
    status: 'inactive',
  });

  // Send rejection notification email
  if (user.email) {
    try {
      const emailService = require('../../shared/email/email.service');
      await emailService.sendAccountRejectedEmail(user.email, user.full_name, reason);
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError.message);
    }
  }

  return {
    success: true,
    message: 'Account rejected',
    user: serializeUser({ ...user, status: 'inactive' }),
    rejectedBy: adminId,
    rejectedAt: new Date().toISOString(),
    reason,
  };
}

/**
 * Get pending accounts for approval (Admin only)
 * @param {object} options - { role, page, limit }
 * @returns {Promise<object>}
 */
async function getPendingAccounts(options = {}) {
  const { role, page = 1, limit = 20 } = options;
  
  // This would typically be a repository method with pagination
  // For now, we'll use a simple implementation
  const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
  
  let query = supabaseAdmin
    .from('users')
    .select('*', { count: 'exact' })
    .eq('status', 'pending');

  if (role) {
    query = query.eq('role', role);
  }

  query = query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch pending accounts: ${error.message}`);
  }

  return {
    accounts: (data || []).map(serializeUser),
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Deactivate an account (Admin only)
 * @param {string} userId
 * @param {string} adminId
 * @param {string} reason
 * @returns {Promise<object>}
 */
async function deactivateAccount(userId, adminId, reason) {
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  if (user.role === 'admin') {
    throw new ValidationError('Cannot deactivate admin accounts');
  }

  // Update status
  await authRepository.updateUser(userId, {
    status: 'inactive',
  });

  // Invalidate all sessions
  await authRepository.deleteAllUserSessions(userId);

  return {
    success: true,
    message: 'Account deactivated',
    user: serializeUser({ ...user, status: 'inactive' }),
    deactivatedBy: adminId,
    reason,
  };
}

/**
 * Reactivate an account (Admin only)
 * @param {string} userId
 * @param {string} adminId
 * @returns {Promise<object>}
 */
async function reactivateAccount(userId, adminId) {
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new AuthenticationError('AUTH_USER_NOT_FOUND', 'User not found');
  }

  if (user.status === 'active') {
    throw new ValidationError('Account is already active');
  }

  await authRepository.updateUser(userId, {
    status: 'active',
  });

  return {
    success: true,
    message: 'Account reactivated',
    user: serializeUser({ ...user, status: 'active' }),
    reactivatedBy: adminId,
  };
}

module.exports = {
  // Registration
  registerCustomer,
  registerPartner,
  registerShipper,
  
  // OTP
  requestOTP,
  verifyOTP,
  isOTPLocked,
  isOTPRateLimited,
  
  // Login
  login,
  loginWithOTP,
  loginWithOAuth,
  trackFailedLogin,
  isAccountLocked,
  
  // OAuth
  linkOAuthToAccount,
  unlinkOAuthFromAccount,
  
  // Token Management
  generateTokens,
  createSessionWithTokens,
  refreshAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  
  // Session Management
  getSessions,
  terminateSession,
  logout,
  logoutAllDevices,
  getCurrentUser,
  
  // Password Reset
  requestPasswordReset,
  resetPassword,
  changePassword,
  
  // Admin Functions
  approveAccount,
  rejectAccount,
  getPendingAccounts,
  deactivateAccount,
  reactivateAccount,
  
  // Helpers (exported for testing)
  generateOTP,
  hashPassword,
  verifyPassword,
  hashToken,
};
