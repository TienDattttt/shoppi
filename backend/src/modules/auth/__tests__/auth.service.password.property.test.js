/**
 * Property-Based Tests for Auth Service - Password Reset
 * Tests password reset and change functionality
 */

const fc = require('fast-check');

// Mock config
jest.mock('../../../config', () => ({
  jwt: {
    accessSecret: 'test-access-secret-key-32-chars!!',
    refreshSecret: 'test-refresh-secret-key-32-chars!',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  otp: { expiresInMinutes: 5, maxAttempts: 5, lockoutMinutes: 15, maxRequestsPerWindow: 3, requestWindowMinutes: 5 },
  security: { maxLoginAttempts: 5, lockoutMinutes: 30 },
  nodeEnv: 'test',
}));

// Mock Supabase
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');

// Generators
const emailArb = fc.emailAddress();
const phoneArb = fc.stringMatching(/^\+84[0-9]{9}$/);
const validPasswordArb = fc.string({ minLength: 8, maxLength: 20 })
  .map(s => s + 'Aa1'); // Ensure it meets complexity requirements

describe('Auth Service Password Reset Property Tests', () => {
  let authService;
  let mockUserStore;
  let mockSessionStore;
  let mockOTPStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockUserStore = new Map();
    mockSessionStore = new Map();
    mockOTPStore = new Map();

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              single: jest.fn().mockImplementation(async () => {
                // Find by email or phone
                for (const [id, user] of mockUserStore) {
                  if (user[field] === value || user.id === value) {
                    return { data: user, error: null };
                  }
                }
                return { data: null, error: { code: 'PGRST116' } };
              }),
            })),
          })),
          update: jest.fn((data) => ({
            eq: jest.fn((field, value) => ({
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockImplementation(async () => {
                const user = mockUserStore.get(value);
                if (user) {
                  Object.assign(user, data);
                  return { data: user, error: null };
                }
                return { data: null, error: { message: 'Not found' } };
              }),
            })),
          })),
        };
      }
      if (table === 'sessions') {
        return {
          delete: jest.fn(() => ({
            eq: jest.fn((field, value) => {
              // Delete all sessions for user
              for (const [id, session] of mockSessionStore) {
                if (session.user_id === value) {
                  mockSessionStore.delete(id);
                }
              }
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }
      if (table === 'otps') {
        return {
          insert: jest.fn((data) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              const otp = { 
                ...data, 
                id: `otp-${Date.now()}`,
                attempts: 0,
                max_attempts: 5,
                verified_at: null,
              };
              mockOTPStore.set(`${data.identifier}-${data.purpose}`, otp);
              return { data: otp, error: null };
            }),
          })),
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            gt: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              for (const [key, otp] of mockOTPStore) {
                if (!otp.verified_at) {
                  return { data: otp, error: null };
                }
              }
              return { data: null, error: { code: 'PGRST116' } };
            }),
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              return { data: {}, error: null };
            }),
          })),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
    });

    authService = require('../auth.service');
  });

  /**
   * **Feature: user-authentication, Property 20: Password reset invalidates all sessions**
   * **Validates: Requirements 8.3**
   * 
   * For any successful password reset, all existing sessions for that user
   * SHALL be invalidated.
   */
  describe('Property 20: Password reset invalidates all sessions', () => {
    it('should invalidate all sessions after password reset', async () => {
      const userId = 'test-user-id';
      const identifier = 'test@example.com';
      const otpCode = '123456';

      // Setup user
      const user = {
        id: userId,
        email: identifier,
        role: 'customer',
        status: 'active',
        password_hash: '$2a$10$hashedpassword',
      };
      mockUserStore.set(userId, user);

      // Setup multiple sessions
      for (let i = 0; i < 3; i++) {
        mockSessionStore.set(`session-${i}`, {
          id: `session-${i}`,
          user_id: userId,
        });
      }

      // Setup valid OTP
      mockOTPStore.set(`${identifier}-password_reset`, {
        id: 'otp-id',
        identifier,
        otp_code: otpCode,
        purpose: 'password_reset',
        attempts: 0,
        max_attempts: 5,
        verified_at: null,
      });

      // Verify sessions exist before reset
      const sessionsBefore = Array.from(mockSessionStore.values())
        .filter(s => s.user_id === userId);
      expect(sessionsBefore.length).toBe(3);

      // Reset password
      const result = await authService.resetPassword({
        identifier,
        otp: otpCode,
        newPassword: 'NewPassword123',
      });

      expect(result.success).toBe(true);

      // Verify all sessions were deleted
      const sessionsAfter = Array.from(mockSessionStore.values())
        .filter(s => s.user_id === userId);
      expect(sessionsAfter.length).toBe(0);
    });

    it('should invalidate sessions after password change', async () => {
      const userId = 'test-user-id';
      
      // Setup user with hashed password
      const bcrypt = require('bcryptjs');
      const currentPasswordHash = await bcrypt.hash('CurrentPass123', 10);
      
      const user = {
        id: userId,
        email: 'test@example.com',
        role: 'customer',
        status: 'active',
        password_hash: currentPasswordHash,
      };
      mockUserStore.set(userId, user);

      // Setup sessions
      for (let i = 0; i < 2; i++) {
        mockSessionStore.set(`session-${i}`, {
          id: `session-${i}`,
          user_id: userId,
        });
      }

      // Change password
      const result = await authService.changePassword(userId, {
        currentPassword: 'CurrentPass123',
        newPassword: 'NewPassword456',
      });

      expect(result.success).toBe(true);

      // Verify sessions were deleted
      const sessionsAfter = Array.from(mockSessionStore.values())
        .filter(s => s.user_id === userId);
      expect(sessionsAfter.length).toBe(0);
    });
  });

  describe('Password Reset Request', () => {
    it('should not reveal if user exists', async () => {
      // Request reset for non-existent user
      const result = await authService.requestPasswordReset('nonexistent@example.com');

      // Should return success even if user doesn't exist
      expect(result.success).toBe(true);
      expect(result.message).toContain('If an account exists');
    });

    it('should generate OTP for existing user', async () => {
      const identifier = 'existing@example.com';
      
      mockUserStore.set('user-id', {
        id: 'user-id',
        email: identifier,
        role: 'customer',
        status: 'active',
      });

      const result = await authService.requestPasswordReset(identifier);

      expect(result.success).toBe(true);
      // In test mode, OTP should be returned
      expect(result.otp).toBeDefined();
    });
  });

  describe('Password Validation on Reset', () => {
    it('should reject weak passwords', async () => {
      const identifier = 'test@example.com';
      const otpCode = '123456';

      mockUserStore.set('user-id', {
        id: 'user-id',
        email: identifier,
        role: 'customer',
        status: 'active',
      });

      mockOTPStore.set(`${identifier}-password_reset`, {
        id: 'otp-id',
        identifier,
        otp_code: otpCode,
        purpose: 'password_reset',
        attempts: 0,
        max_attempts: 5,
        verified_at: null,
      });

      // Try to reset with weak password
      await expect(
        authService.resetPassword({
          identifier,
          otp: otpCode,
          newPassword: 'weak', // Too short, no uppercase, no number
        })
      ).rejects.toThrow('Password does not meet requirements');
    });
  });

  describe('Change Password', () => {
    it('should reject incorrect current password', async () => {
      const userId = 'test-user-id';
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

      mockUserStore.set(userId, {
        id: userId,
        email: 'test@example.com',
        role: 'customer',
        status: 'active',
        password_hash: passwordHash,
      });

      await expect(
        authService.changePassword(userId, {
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword456',
        })
      ).rejects.toThrow('AUTH_INVALID_CREDENTIALS');
    });
  });
});
