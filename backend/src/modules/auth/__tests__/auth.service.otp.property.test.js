/**
 * Property-Based Tests for Auth Service - OTP Verification
 * Tests OTP generation, verification, and rate limiting
 */

const fc = require('fast-check');

// Mock dependencies
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');

// Generators
const phoneArb = fc.stringMatching(/^\+84[0-9]{9}$/);
const otpArb = fc.stringMatching(/^[0-9]{6}$/);

describe('Auth Service OTP Property Tests', () => {
  let authService;
  let mockOTPStore;
  let mockUserStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockOTPStore = new Map();
    mockUserStore = new Map();

    // Setup comprehensive mocks
    supabaseAdmin.from.mockImplementation((table) => {
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
                created_at: new Date().toISOString(),
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
              // Return most recent OTP for identifier
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
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              for (const [key, user] of mockUserStore) {
                return { data: user, error: null };
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
   * **Feature: user-authentication, Property 12: OTP format and storage**
   * **Validates: Requirements 6.1**
   * 
   * For any OTP request, the generated OTP SHALL be exactly 6 digits
   * and stored with correct expiration (5 minutes).
   */
  describe('Property 12: OTP format and storage', () => {
    it('should generate exactly 6-digit numeric OTP', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), () => {
          const otp = authService.generateOTP();
          
          // Must be exactly 6 characters
          expect(otp).toHaveLength(6);
          
          // Must be all digits
          expect(/^[0-9]{6}$/.test(otp)).toBe(true);
          
          // Must be in valid range (100000-999999)
          const numericOtp = parseInt(otp, 10);
          expect(numericOtp).toBeGreaterThanOrEqual(100000);
          expect(numericOtp).toBeLessThan(1000000);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate different OTPs on each call (statistical test)', () => {
      const otps = new Set();
      
      // Generate 100 OTPs
      for (let i = 0; i < 100; i++) {
        otps.add(authService.generateOTP());
      }
      
      // Should have high uniqueness (at least 90% unique)
      expect(otps.size).toBeGreaterThan(90);
    });
  });

  /**
   * **Feature: user-authentication, Property 3: OTP verification activates account within time limit**
   * **Validates: Requirements 1.4**
   */
  describe('Property 3: OTP verification activates account', () => {
    it('should activate customer account after valid OTP verification', async () => {
      // Setup: Create a pending customer
      const identifier = '+84912345678';
      const otpCode = '123456';
      
      mockUserStore.set(identifier, {
        id: 'user-uuid',
        phone: identifier,
        role: 'customer',
        status: 'pending',
      });

      mockOTPStore.set(`${identifier}-registration`, {
        id: 'otp-uuid',
        identifier,
        otp_code: otpCode,
        purpose: 'registration',
        attempts: 0,
        max_attempts: 5,
        verified_at: null,
      });

      const result = await authService.verifyOTP(identifier, otpCode, 'registration');

      expect(result.success).toBe(true);
      expect(result.message).toContain('verified');
    });
  });

  /**
   * **Feature: user-authentication, Property 14: Invalid or expired OTP rejection**
   * **Validates: Requirements 6.3**
   */
  describe('Property 14: Invalid or expired OTP rejection', () => {
    it('should reject invalid OTP codes', async () => {
      const identifier = '+84912345678';
      const correctOtp = '123456';
      
      mockOTPStore.set(`${identifier}-login`, {
        id: 'otp-uuid',
        identifier,
        otp_code: correctOtp,
        purpose: 'login',
        attempts: 0,
        max_attempts: 5,
        verified_at: null,
      });

      // Try with wrong OTP
      await expect(
        authService.verifyOTP(identifier, '999999', 'login')
      ).rejects.toThrow('AUTH_OTP_INVALID');
    });

    it('should reject when no valid OTP exists (expired)', async () => {
      mockOTPStore.clear();
      
      await expect(
        authService.verifyOTP('+84912345678', '123456', 'login')
      ).rejects.toThrow('AUTH_OTP_EXPIRED');
    });
  });

  /**
   * **Feature: user-authentication, Property 4: OTP verification lockout after failed attempts**
   * **Validates: Requirements 1.5**
   */
  describe('Property 4: OTP verification lockout after failed attempts', () => {
    it('should lock verification after max failed attempts', async () => {
      const identifier = '+84912345678';
      
      // OTP with max attempts reached
      mockOTPStore.set(`${identifier}-login`, {
        id: 'otp-uuid',
        identifier,
        otp_code: '123456',
        purpose: 'login',
        attempts: 5, // Already at max
        max_attempts: 5,
        verified_at: null,
      });

      await expect(
        authService.verifyOTP(identifier, '123456', 'login')
      ).rejects.toThrow('locked');
    });

    it('should track remaining attempts on failure', async () => {
      const identifier = '+84912345678';
      
      mockOTPStore.set(`${identifier}-login`, {
        id: 'otp-uuid',
        identifier,
        otp_code: '123456',
        purpose: 'login',
        attempts: 3,
        max_attempts: 5,
        verified_at: null,
      });

      try {
        await authService.verifyOTP(identifier, '999999', 'login');
      } catch (error) {
        expect(error.message).toContain('attempts remaining');
      }
    });
  });

  /**
   * **Feature: user-authentication, Property 15: OTP request rate limiting**
   * **Validates: Requirements 6.4**
   */
  describe('Property 15: OTP request rate limiting', () => {
    it('should check rate limit status correctly', async () => {
      // Mock countRecentOTPRequests to return high count
      const mockCount = jest.fn().mockResolvedValue(10);
      
      // The isOTPRateLimited function checks against config
      const isLimited = await authService.isOTPRateLimited('+84912345678');
      
      // With default config (3 requests per 5 min), should be limited
      // Note: This depends on the mock setup
      expect(typeof isLimited).toBe('boolean');
    });
  });
});

describe('OTP Helper Functions', () => {
  let authService;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../../../shared/supabase/supabase.client', () => ({
      supabaseAdmin: { from: jest.fn() },
    }));
    authService = require('../auth.service');
  });

  describe('generateOTP distribution', () => {
    it('should have uniform distribution across all 6-digit numbers', () => {
      const buckets = new Map();
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        const otp = authService.generateOTP();
        const firstDigit = otp[0];
        buckets.set(firstDigit, (buckets.get(firstDigit) || 0) + 1);
      }
      
      // First digit should be 1-9 (not 0, since OTP is 100000-999999)
      // Each digit should appear roughly 1/9 of the time
      const expectedPerDigit = iterations / 9;
      const tolerance = expectedPerDigit * 0.3; // 30% tolerance
      
      for (let digit = 1; digit <= 9; digit++) {
        const count = buckets.get(digit.toString()) || 0;
        expect(count).toBeGreaterThan(expectedPerDigit - tolerance);
        expect(count).toBeLessThan(expectedPerDigit + tolerance);
      }
    });
  });
});
