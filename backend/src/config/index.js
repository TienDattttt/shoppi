/**
 * Configuration Module
 * Centralizes all environment variables and configuration settings
 */

require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  
  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  
  // OTP
  otp: {
    length: 6,
    expiresInMinutes: 5,
    maxAttempts: 5,
    lockoutMinutes: 15,
    maxRequestsPerWindow: 3,
    requestWindowMinutes: 5,
  },
  
  // Account Security
  security: {
    maxLoginAttempts: 5,
    lockoutMinutes: 30,
    passwordMinLength: 8,
  },
};
