/**
 * Auth Repository
 * Data access layer for authentication-related operations
 */

const { supabaseAdmin } = require('../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

/**
 * User Repository Methods
 */

/**
 * Create a new user
 * @param {object} userData
 * @returns {Promise<object>} Created user
 */
async function createUser(userData) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      id: userData.id || uuidv4(),
      supabase_id: userData.supabase_id,
      email: userData.email,
      phone: userData.phone,
      password_hash: userData.password_hash,
      role: userData.role,
      status: userData.status || 'pending',
      full_name: userData.full_name,
      avatar_url: userData.avatar_url,
      business_name: userData.business_name,
      tax_id: userData.tax_id,
      google_id: userData.google_id,
      facebook_id: userData.facebook_id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data;
}

/**
 * Find user by email
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findUserByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data || null;
}

/**
 * Find user by phone
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
async function findUserByPhone(phone) {
  // Normalize phone number
  const normalizedPhone = normalizePhone(phone);
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('phone', normalizedPhone)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data || null;
}

/**
 * Find user by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function findUserById(id) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data || null;
}

/**
 * Find user by email or phone
 * @param {string} identifier - Email or phone
 * @returns {Promise<object|null>}
 */
async function findUserByIdentifier(identifier) {
  // Check if it's an email
  if (identifier.includes('@')) {
    return findUserByEmail(identifier);
  }
  return findUserByPhone(identifier);
}

/**
 * Find user by OAuth provider ID
 * @param {string} provider - 'google' or 'facebook'
 * @param {string} providerId
 * @returns {Promise<object|null>}
 */
async function findUserByOAuthId(provider, providerId) {
  const column = provider === 'google' ? 'google_id' : 'facebook_id';
  
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq(column, providerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data || null;
}

/**
 * Update user
 * @param {string} id
 * @param {object} updateData
 * @returns {Promise<object>}
 */
async function updateUser(id, updateData) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data;
}

/**
 * Increment failed login attempts
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function incrementFailedAttempts(userId) {
  const { data, error } = await supabaseAdmin
    .rpc('increment_failed_attempts', { user_id: userId });

  if (error) {
    // Fallback to manual increment if RPC doesn't exist
    const user = await findUserById(userId);
    return updateUser(userId, {
      failed_login_attempts: (user.failed_login_attempts || 0) + 1,
    });
  }

  return data;
}

/**
 * Lock user account
 * @param {string} userId
 * @param {number} lockoutMinutes
 * @returns {Promise<object>}
 */
async function lockAccount(userId, lockoutMinutes = 30) {
  const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
  
  return updateUser(userId, {
    status: 'locked',
    locked_until: lockedUntil.toISOString(),
  });
}

/**
 * Unlock user account
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function unlockAccount(userId) {
  return updateUser(userId, {
    status: 'active',
    locked_until: null,
    failed_login_attempts: 0,
  });
}

/**
 * Reset failed login attempts
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function resetFailedAttempts(userId) {
  return updateUser(userId, {
    failed_login_attempts: 0,
  });
}

/**
 * Update last login timestamp
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function updateLastLogin(userId) {
  return updateUser(userId, {
    last_login_at: new Date().toISOString(),
  });
}

/**
 * Link OAuth provider to user
 * @param {string} userId
 * @param {string} provider
 * @param {string} providerId
 * @returns {Promise<object>}
 */
async function linkOAuthProvider(userId, provider, providerId) {
  const column = provider === 'google' ? 'google_id' : 'facebook_id';
  return updateUser(userId, { [column]: providerId });
}


/**
 * Session Repository Methods
 */

/**
 * Create a new session
 * @param {object} sessionData
 * @returns {Promise<object>}
 */
async function createSession(sessionData) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      id: sessionData.id || uuidv4(),
      user_id: sessionData.user_id,
      refresh_token_hash: sessionData.refresh_token_hash,
      device_type: sessionData.device_type,
      device_name: sessionData.device_name,
      ip_address: sessionData.ip_address,
      user_agent: sessionData.user_agent,
      expires_at: sessionData.expires_at,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return data;
}

/**
 * Find sessions by user ID
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function findSessionsByUserId(userId) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to find sessions: ${error.message}`);
  }

  return data || [];
}

/**
 * Find session by ID
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
async function findSessionById(sessionId) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find session: ${error.message}`);
  }

  return data || null;
}

/**
 * Find session by refresh token hash
 * @param {string} refreshTokenHash
 * @returns {Promise<object|null>}
 */
async function findSessionByRefreshToken(refreshTokenHash) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('refresh_token_hash', refreshTokenHash)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find session: ${error.message}`);
  }

  return data || null;
}

/**
 * Delete session by ID
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function deleteSession(sessionId) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }
}

/**
 * Delete all sessions for a user
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function deleteAllUserSessions(userId) {
  const { error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete sessions: ${error.message}`);
  }
}

/**
 * Update session last activity
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
async function updateSessionActivity(sessionId) {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`);
  }

  return data;
}

/**
 * Delete expired sessions
 * @returns {Promise<number>} Number of deleted sessions
 */
async function deleteExpiredSessions() {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) {
    throw new Error(`Failed to delete expired sessions: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * OTP Repository Methods
 */

/**
 * Create a new OTP
 * @param {object} otpData
 * @returns {Promise<object>}
 */
async function createOTP(otpData) {
  const expiresAt = new Date(Date.now() + (otpData.expiresInMinutes || 5) * 60 * 1000);
  
  const { data, error } = await supabaseAdmin
    .from('otps')
    .insert({
      id: uuidv4(),
      identifier: otpData.identifier,
      otp_code: otpData.otp_code,
      purpose: otpData.purpose,
      expires_at: expiresAt.toISOString(),
      max_attempts: otpData.max_attempts || 5,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create OTP: ${error.message}`);
  }

  return data;
}

/**
 * Find valid OTP
 * @param {string} identifier
 * @param {string} purpose
 * @returns {Promise<object|null>}
 */
async function findValidOTP(identifier, purpose) {
  const { data, error } = await supabaseAdmin
    .from('otps')
    .select('*')
    .eq('identifier', identifier)
    .eq('purpose', purpose)
    .is('verified_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find OTP: ${error.message}`);
  }

  return data || null;
}

/**
 * Increment OTP attempts
 * @param {string} otpId
 * @returns {Promise<object>}
 */
async function incrementOTPAttempts(otpId) {
  const otp = await findOTPById(otpId);
  
  const { data, error } = await supabaseAdmin
    .from('otps')
    .update({ attempts: (otp.attempts || 0) + 1 })
    .eq('id', otpId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to increment OTP attempts: ${error.message}`);
  }

  return data;
}

/**
 * Find OTP by ID
 * @param {string} otpId
 * @returns {Promise<object|null>}
 */
async function findOTPById(otpId) {
  const { data, error } = await supabaseAdmin
    .from('otps')
    .select('*')
    .eq('id', otpId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to find OTP: ${error.message}`);
  }

  return data || null;
}

/**
 * Mark OTP as verified
 * @param {string} otpId
 * @returns {Promise<object>}
 */
async function markOTPVerified(otpId) {
  const { data, error } = await supabaseAdmin
    .from('otps')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', otpId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to mark OTP verified: ${error.message}`);
  }

  return data;
}

/**
 * Count recent OTP requests
 * @param {string} identifier
 * @param {number} windowMinutes
 * @returns {Promise<number>}
 */
async function countRecentOTPRequests(identifier, windowMinutes = 5) {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  const { data, error, count } = await supabaseAdmin
    .from('otps')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .gte('created_at', windowStart.toISOString());

  if (error) {
    throw new Error(`Failed to count OTP requests: ${error.message}`);
  }

  return count || 0;
}

/**
 * Delete expired OTPs
 * @returns {Promise<number>}
 */
async function deleteExpiredOTPs() {
  const { data, error } = await supabaseAdmin
    .from('otps')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) {
    throw new Error(`Failed to delete expired OTPs: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Helper: Normalize phone number
 * @param {string} phone
 * @returns {string}
 */
function normalizePhone(phone) {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Convert Vietnamese formats to standard
  if (normalized.startsWith('0')) {
    normalized = '+84' + normalized.slice(1);
  } else if (normalized.startsWith('84') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

/**
 * Create shipper profile in shippers table
 * @param {object} shipperData
 * @returns {Promise<object>}
 */
async function createShipperProfile(shipperData) {
  const { data, error } = await supabaseAdmin
    .from('shippers')
    .insert({
      id: uuidv4(),
      user_id: shipperData.user_id,
      id_card_number: shipperData.id_card_number,
      driver_license: shipperData.driver_license,
      vehicle_type: shipperData.vehicle_type,
      vehicle_plate: shipperData.vehicle_plate,
      vehicle_brand: shipperData.vehicle_brand,
      vehicle_model: shipperData.vehicle_model,
      working_district: shipperData.working_district,
      working_city: shipperData.working_city,
      // Document URLs
      id_card_front_url: shipperData.id_card_front_url,
      id_card_back_url: shipperData.id_card_back_url,
      driver_license_url: shipperData.driver_license_url,
      status: shipperData.status || 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create shipper profile: ${error.message}`);
  }

  return data;
}

module.exports = {
  // User operations
  createUser,
  findUserByEmail,
  findUserByPhone,
  findUserById,
  findUserByIdentifier,
  findUserByOAuthId,
  updateUser,
  incrementFailedAttempts,
  lockAccount,
  unlockAccount,
  resetFailedAttempts,
  updateLastLogin,
  linkOAuthProvider,
  
  // Shipper operations
  createShipperProfile,
  
  // Session operations
  createSession,
  findSessionsByUserId,
  findSessionById,
  findSessionByRefreshToken,
  deleteSession,
  deleteAllUserSessions,
  updateSessionActivity,
  deleteExpiredSessions,
  
  // OTP operations
  createOTP,
  findValidOTP,
  findOTPById,
  incrementOTPAttempts,
  markOTPVerified,
  countRecentOTPRequests,
  deleteExpiredOTPs,
  
  // Helpers
  normalizePhone,
};
