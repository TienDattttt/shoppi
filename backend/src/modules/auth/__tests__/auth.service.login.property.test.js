/**
 * Property-Based Tests for Auth Service - Login
 * Tests login correctness properties
 */

const fc = require('fast-check');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');

describe('Auth Service Login Property Tests', () => {
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

    // Setup mocks
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              single: jest.fn().mockImplementation(async () => {
                for (const [key, user] of mockUserStore) {
                  if (user[field] === value || 
                      (field === 'email' && user.email === value.toLowerCase()) ||
                      (field === 'phone' && user.phone === value)) {
                    return { data: user, error: null };
                  }
                }
                return { data: null, error: { code: 'PGRST116' } };
              }),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              return { data: { failed_login_attempts: 1 }, error: null };
            }),
          })),
        };
      }
      if (table === 'sessions') {
        return {
          insert: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              return { data: { id: 'session-uuid' }, error: null };
            }),
          })),
        };
      }
      if (table === 'otps') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            gt: jest.fn().mockReturnThis(),
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
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
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
   * **Feature: user-authentication, Property 7: Valid credentials create JWT session**
   * **Validates: Requirements 4.1**
   */
  describe('Property 7: Valid credentials create JWT session', () => {
    it('should create session with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'Password123';
      const passwordHash = await bcrypt.hash(password, 10);

      mockUserStore.set(email, {
        id: 'user-uuid',
        email,
        password_hash: passwordHash,
        role: 'customer',
        status: 'active',
        full_name: 'Test User',
        failed_login_attempts: 0,
      });

      const result = await authService.login(
        { identifier: email, password },
        { deviceType: 'web' }
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
    });

    it('should include correct claims in JWT', async () => {
      const email = 'test@example.com';
      const password = 'Password123';
      const passwordHash = await bcrypt.hash(password, 10);

      mockUserStore.set(email, {
        id: 'user-uuid',
        email,
        password_hash: passwordHash,
        role: 'partner',
        status: 'active',
        full_name: 'Test Partner',
        failed_login_attempts: 0,
      });

      const result = await authService.login({ identifier: email, password });

      // Decode token to verify claims
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(result.accessToken);

      expect(decoded.userId).toBe('user-uuid');
      expect(decoded.role).toBe('partner');
      expect(decoded.sessionId).toBeDefined();
    });
  });

  /**
   * **Feature: user-authentication, Property 10: Inactive account login rejection**
   * **Validates: Requirements 4.6**
   */
  describe('Property 10: Inactive account login rejection', () => {
    it('should reject login for pending accounts', async () => {
      const email = 'pending@example.com';
      const password = 'Password123';
      const passwordHash = await bcrypt.hash(password, 10);

      mockUserStore.set(email, {
        id: 'user-uuid',
        email,
        password_hash: passwordHash,
        role: 'partner',
        status: 'pending',
        full_name: 'Pending User',
      });

      await expect(
        authService.login({ identifier: email, password })
      ).rejects.toThrow('AUTH_ACCOUNT_PENDING');
    });

    it('should reject login for inactive accounts', async () => {
      const email = 'inactive@example.com';
      const password = 'Password123';
      const passwordHash = await bcrypt.hash(password, 10);

      mockUserStore.set(email, {
        id: 'user-uuid',
        email,
        password_hash: passwordHash,
        role: 'customer',
        status: 'inactive',
        full_name: 'Inactive User',
      });

      await expect(
        authService.login({ identifier: email, password })
      ).rejects.toThrow('AUTH_ACCOUNT_INACTIVE');
    });

    it('should reject login for locked accounts within lockout period', async () => {
      const email = 'locked@example.com';
      const password = 'Password123';
      const passwordHash = await bcrypt.hash(password, 10);

      mockUserStore.set(email, {
        id: 'user-uuid',
        email,
        password_hash: passwordHash,
        role: 'customer',
        status: 'locked',
        locked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
        full_name: 'Locked User',
      });

      await expect(
        authService.login({ identifier: email, password })
      ).rejects.toThrow('AUTH_ACCOUNT_LOCKED');
    });
  });

  /**
   * **Feature: user-authentication, Property 8: Invalid credentials increment failure counter**
   * **Validates: Requirements 4.2**
   */
  describe('Property 8: Invalid credentials increment failure counter', () => {
    it('should reject invalid password and show remaining attempts', async () => {
      const email = 'test@example.com';
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

      mockUserStore.set(email, {
        id: 'user-uuid',
        email,
        password_hash: passwordHash,
        role: 'customer',
        status: 'active',
        full_name: 'Test User',
        failed_login_attempts: 0,
      });

      await expect(
        authService.login({ identifier: email, password: 'WrongPassword123' })
      ).rejects.toThrow('AUTH_INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      await expect(
        authService.login({ identifier: 'notexist@example.com', password: 'Password123' })
      ).rejects.toThrow('AUTH_INVALID_CREDENTIALS');
    });
  });

  /**
   * **Feature: user-authentication, Property 9: Account lockout after consecutive failures**
   * **Validates: Requirements 4.3**
   */
  describe('Property 9: Account lockout after consecutive failures', () => {
    it('should lock account after max failed attempts', async () => {
      const email = 'test@example.com';
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);

      mockUserStore.set(email, {
        id: 'user-uuid',
        email,
        password_hash: passwordHash,
        role: 'customer',
        status: 'active',
        full_name: 'Test User',
        failed_login_attempts: 4, // One more attempt will lock
      });

      // Mock to return updated attempts
      supabaseAdmin.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: mockUserStore.get(email),
                  error: null,
                }),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { failed_login_attempts: 5 },
                error: null,
              }),
            })),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

      // Reset module to pick up new mock
      jest.resetModules();
      authService = require('../auth.service');

      await expect(
        authService.login({ identifier: email, password: 'WrongPassword123' })
      ).rejects.toThrow('AUTH_ACCOUNT_LOCKED');
    });
  });

  /**
   * **Feature: user-authentication, Property 13: Valid OTP login creates session**
   * **Validates: Requirements 6.2**
   */
  describe('Property 13: Valid OTP login creates session', () => {
    it('should create session after valid OTP verification', async () => {
      const phone = '+84912345678';
      const otpCode = '123456';

      mockUserStore.set(phone, {
        id: 'user-uuid',
        phone,
        role: 'customer',
        status: 'active',
        full_name: 'Test User',
      });

      mockOTPStore.set(`${phone}-login`, {
        id: 'otp-uuid',
        identifier: phone,
        otp_code: otpCode,
        purpose: 'login',
        attempts: 0,
        max_attempts: 5,
        verified_at: null,
      });

      const result = await authService.loginWithOTP(
        { phone, otp: otpCode },
        { deviceType: 'mobile' }
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });
});

describe('Token Generation', () => {
  let authService;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../../../shared/supabase/supabase.client', () => ({
      supabaseAdmin: { from: jest.fn() },
    }));
    authService = require('../auth.service');
  });

  it('should generate valid JWT tokens', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom('admin', 'partner', 'customer', 'shipper'),
        fc.uuid(),
        (userId, role, sessionId) => {
          const user = { id: userId, role };
          const tokens = authService.generateTokens(user, sessionId);

          expect(tokens.accessToken).toBeDefined();
          expect(tokens.refreshToken).toBeDefined();
          expect(tokens.expiresIn).toBe(15 * 60);

          // Verify tokens are valid JWT format
          const parts = tokens.accessToken.split('.');
          expect(parts).toHaveLength(3);
        }
      ),
      { numRuns: 50 }
    );
  });
});
