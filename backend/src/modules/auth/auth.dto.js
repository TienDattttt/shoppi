/**
 * Auth DTOs (Data Transfer Objects)
 * Defines data structures for auth operations and serialization
 */

// Sensitive fields that should never be exposed in API responses
const SENSITIVE_FIELDS = [
  'password_hash',
  'supabase_id',
  'refresh_token_hash',
  'failed_login_attempts',
  'locked_until',
];

// Fields to include in public user profile
const PUBLIC_USER_FIELDS = [
  'id',
  'email',
  'phone',
  'role',
  'status',
  'full_name',
  'avatar_url',
  'business_name',
  'created_at',
];

/**
 * Serialize user object for API response
 * Removes sensitive fields and formats data
 * @param {object} user - Raw user object from database
 * @returns {object} Serialized user profile
 */
function serializeUser(user) {
  if (!user) return null;

  const serialized = {
    id: user.id,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    status: user.status,
    fullName: user.full_name,
    avatarUrl: user.avatar_url || null,
    createdAt: user.created_at ? new Date(user.created_at).toISOString() : null,
  };

  // Add role-specific fields
  if (user.role === 'partner') {
    serialized.businessName = user.business_name || null;
    serialized.taxId = user.tax_id || null;
  }

  if (user.role === 'shipper') {
    serialized.vehicleType = user.vehicle_type || null;
    serialized.vehiclePlate = user.vehicle_plate || null;
  }

  return serialized;
}

/**
 * Deserialize user data from API request
 * Converts camelCase to snake_case and validates structure
 * @param {object} data - User data from API request
 * @returns {object} Database-ready user object
 */
function deserializeUser(data) {
  if (!data) return null;

  const deserialized = {};

  // Map camelCase to snake_case
  const fieldMapping = {
    id: 'id',
    email: 'email',
    phone: 'phone',
    role: 'role',
    status: 'status',
    fullName: 'full_name',
    avatarUrl: 'avatar_url',
    businessName: 'business_name',
    taxId: 'tax_id',
    idCardNumber: 'id_card_number',
    vehicleType: 'vehicle_type',
    vehiclePlate: 'vehicle_plate',
    passwordHash: 'password_hash',
    supabaseId: 'supabase_id',
    googleId: 'google_id',
    facebookId: 'facebook_id',
  };

  for (const [camelKey, snakeKey] of Object.entries(fieldMapping)) {
    if (data[camelKey] !== undefined) {
      deserialized[snakeKey] = data[camelKey];
    }
  }

  return deserialized;
}

/**
 * Serialize session object for API response
 * @param {object} session - Raw session object from database
 * @returns {object} Serialized session
 */
function serializeSession(session) {
  if (!session) return null;

  return {
    id: session.id,
    deviceType: session.device_type || null,
    deviceName: session.device_name || null,
    ipAddress: session.ip_address || null,
    lastActivityAt: session.last_activity_at ? new Date(session.last_activity_at).toISOString() : null,
    createdAt: session.created_at ? new Date(session.created_at).toISOString() : null,
    expiresAt: session.expires_at ? new Date(session.expires_at).toISOString() : null,
  };
}

/**
 * Create token pair response
 * @param {string} accessToken
 * @param {string} refreshToken
 * @param {number} expiresIn - Access token expiry in seconds
 * @param {object} user - Serialized user object
 * @returns {object} Token pair response
 */
function createTokenPairResponse(accessToken, refreshToken, expiresIn, user) {
  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer',
    user,
  };
}

/**
 * Registration DTOs
 */
const RegisterCustomerDTO = {
  validate(data) {
    return {
      email: data.email || null,
      phone: data.phone || null,
      password: data.password,
      fullName: data.fullName,
    };
  },
};

const RegisterPartnerDTO = {
  validate(data) {
    return {
      email: data.email,
      phone: data.phone,
      password: data.password,
      fullName: data.fullName,
      businessName: data.businessName,
      taxId: data.taxId,
    };
  },
};

const RegisterShipperDTO = {
  validate(data) {
    return {
      phone: data.phone,
      password: data.password,
      fullName: data.fullName,
      idCardNumber: data.idCardNumber,
      vehicleType: data.vehicleType,
      vehiclePlate: data.vehiclePlate,
    };
  },
};

/**
 * Login DTOs
 */
const LoginDTO = {
  validate(data) {
    return {
      identifier: data.identifier, // email or phone
      password: data.password,
    };
  },
};

const OTPLoginDTO = {
  validate(data) {
    return {
      phone: data.phone,
      otp: data.otp,
    };
  },
};

/**
 * Password Reset DTOs
 */
const ResetPasswordRequestDTO = {
  validate(data) {
    return {
      identifier: data.identifier, // email or phone
    };
  },
};

const ResetPasswordDTO = {
  validate(data) {
    return {
      token: data.token,
      otp: data.otp,
      newPassword: data.newPassword,
    };
  },
};

module.exports = {
  SENSITIVE_FIELDS,
  PUBLIC_USER_FIELDS,
  serializeUser,
  deserializeUser,
  serializeSession,
  createTokenPairResponse,
  RegisterCustomerDTO,
  RegisterPartnerDTO,
  RegisterShipperDTO,
  LoginDTO,
  OTPLoginDTO,
  ResetPasswordRequestDTO,
  ResetPasswordDTO,
};
