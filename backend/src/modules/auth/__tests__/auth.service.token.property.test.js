/**
 * Property-Based Tests for Auth Service - Token Management
 * Tests JWT token generation, refresh, and validation
 */

const fc = require('fast-check');
const jwt = require('jsonwebtoken');

// Mock config
jest.mock('../../../config', () => ({
  jwt: {
    accessSecret: 'test-access-secret-key-32-chars!!',
    refreshSecret: 'test-refresh-secret-key-32-chars!',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  otp: {
    expiresInMinutes: 5,
    maxAttempts: 5,
    lockoutMinutes: 15,
    maxRequestsPerWindow: 3,
    requestWindowMinutes: 5,
  },
  security: {
    maxLoginAttempts: 5,
    lockoutMinutes: 30,
  },
  nodeEnv: 'test',
}));

// Mock Supabase
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const config = require('../../../config');

// Generators
const userIdArb = fc.uuid();
const roleArb = fc.constantFrom('admin', 'partner', 'customer', 'shipper');
const sessionIdArb = fc.uuid();

describe('Auth Service Token Management Property Tests', () => {
  let authService;
  let mockSessionStore;
  let mockUserStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockSessionStore = new Map();
    mockUserStore = new Map();

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'sessions') {
        return {
          insert: jest.fn((data) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              const session = { ...data, id: data.id || `session-${Date.now()}` };
              mockSessionStore.set(session.id, session);
              mockSessionStore.set(`hash:${data.refresh_token_hash}`, session);
              return { data: session, error: null };
            }),
          })),
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              gt: jest.fn().mockReturnThis(),
              single: jest.fn().mockImplementation(async () => {
                if (field === 'refresh_token_hash') {
                  const session = mockSessionStore.get(`hash:${value}`);
                  return session 
                    ? { data: session, error: null }
                    : { data: null, error: { code: 'PGRST116' } };
                }
                const session = mockSessionStore.get(value);
                return session 
                  ? { data: session, error: null }
                  : { data: null, error: { code: 'PGRST116' } };
              }),
            })),
          })),
          update: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: {}, error: null }),
          })),
          delete: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              single: jest.fn().mockImplementation(async () => {
                const user = mockUserStore.get(value);
                return user 
                  ? { data: user, error: null }
                  : { data: null, error: { code: 'PGRST116' } };
              }),
            })),
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
   * **Feature: user-authentication, Property 25: Token expiration correctness**
   * **Validates: Requirements 10.1**
   * 
   * For any successful authentication, access token SHALL have 15-minute expiration
   * and refresh token SHALL have 7-day expiration.
   */
  describe('Property 25: Token expiration correctness', () => {
    it('should generate access token with 15-minute expiration', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const user = { id: userId, role };
          const tokens = authService.generateTokens(user, sessionId);

          // Decode access token
          const decoded = jwt.decode(tokens.accessToken);
          
          expect(decoded).toBeDefined();
          expect(decoded.userId).toBe(userId);
          expect(decoded.role).toBe(role);
          expect(decoded.sessionId).toBe(sessionId);
          
          // Check expiration is approximately 15 minutes
          const expiration = new Date(decoded.exp * 1000);
          const now = new Date();
          const diffMinutes = (expiration - now) / (1000 * 60);
          
          expect(diffMinutes).toBeGreaterThan(14);
          expect(diffMinutes).toBeLessThanOrEqual(15);
        }),
        { numRuns: 50 }
      );
    });

    it('should generate refresh token with 7-day expiration', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const user = { id: userId, role };
          const tokens = authService.generateTokens(user, sessionId);

          // Decode refresh token
          const decoded = jwt.decode(tokens.refreshToken);
          
          expect(decoded).toBeDefined();
          expect(decoded.type).toBe('refresh');
          
          // Check expiration is approximately 7 days
          const expiration = new Date(decoded.exp * 1000);
          const now = new Date();
          const diffDays = (expiration - now) / (1000 * 60 * 60 * 24);
          
          expect(diffDays).toBeGreaterThan(6.9);
          expect(diffDays).toBeLessThanOrEqual(7);
        }),
        { numRuns: 50 }
      );
    });

    it('should return correct expiresIn value', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const user = { id: userId, role };
          const tokens = authService.generateTokens(user, sessionId);

          // expiresIn should be 15 minutes in seconds
          expect(tokens.expiresIn).toBe(15 * 60);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: user-authentication, Property 26: Token refresh issues new access token**
   * **Validates: Requirements 10.2**
   * 
   * For any valid refresh token, token refresh request SHALL return a new valid access token.
   */
  describe('Property 26: Token refresh issues new access token', () => {
    it('should issue new access token for valid refresh token', async () => {
      // Setup user and session
      const userId = 'test-user-id';
      const sessionId = 'test-session-id';
      const user = { id: userId, role: 'customer', status: 'active' };
      
      mockUserStore.set(userId, user);

      // Generate initial tokens
      const tokens = authService.generateTokens(user, sessionId);
      const refreshTokenHash = authService.hashToken(tokens.refreshToken);

      // Store session
      const session = {
        id: sessionId,
        user_id: userId,
        refresh_token_hash: refreshTokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      mockSessionStore.set(sessionId, session);
      mockSessionStore.set(`hash:${refreshTokenHash}`, session);

      // Refresh token
      const result = await authService.refreshAccessToken(tokens.refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).not.toBe(tokens.accessToken);
      expect(result.expiresIn).toBe(15 * 60);
      expect(result.tokenType).toBe('Bearer');

      // Verify new access token is valid
      const decoded = jwt.verify(result.accessToken, config.jwt.accessSecret);
      expect(decoded.userId).toBe(userId);
    });
  });

  /**
   * **Feature: user-authentication, Property 27: Invalid refresh token requires re-authentication**
   * **Validates: Requirements 10.3**
   * 
   * For any expired or invalid refresh token, token refresh request SHALL be rejected.
   */
  describe('Property 27: Invalid refresh token requires re-authentication', () => {
    it('should reject invalid refresh token', async () => {
      await expect(
        authService.refreshAccessToken('invalid-token')
      ).rejects.toThrow('AUTH_TOKEN_INVALID');
    });

    it('should reject expired refresh token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: 'test', role: 'customer', sessionId: 'test', type: 'refresh' },
        config.jwt.refreshSecret,
        { expiresIn: '-1h' } // Already expired
      );

      await expect(
        authService.refreshAccessToken(expiredToken)
      ).rejects.toThrow('AUTH_TOKEN_EXPIRED');
    });

    it('should reject access token used as refresh token', async () => {
      const user = { id: 'test-user', role: 'customer' };
      const tokens = authService.generateTokens(user, 'session-id');

      // Try to use access token as refresh token
      await expect(
        authService.refreshAccessToken(tokens.accessToken)
      ).rejects.toThrow('AUTH_TOKEN_INVALID');
    });

    it('should reject refresh token with no matching session', async () => {
      const user = { id: 'test-user', role: 'customer' };
      const tokens = authService.generateTokens(user, 'non-existent-session');

      // Session doesn't exist in store
      await expect(
        authService.refreshAccessToken(tokens.refreshToken)
      ).rejects.toThrow('AUTH_TOKEN_INVALID');
    });
  });

  describe('Token Verification Functions', () => {
    it('should verify valid access token', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const user = { id: userId, role };
          const tokens = authService.generateTokens(user, sessionId);

          const decoded = authService.verifyAccessToken(tokens.accessToken);
          
          expect(decoded.userId).toBe(userId);
          expect(decoded.role).toBe(role);
          expect(decoded.sessionId).toBe(sessionId);
        }),
        { numRuns: 50 }
      );
    });

    it('should verify valid refresh token', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const user = { id: userId, role };
          const tokens = authService.generateTokens(user, sessionId);

          const decoded = authService.verifyRefreshToken(tokens.refreshToken);
          
          expect(decoded.userId).toBe(userId);
          expect(decoded.type).toBe('refresh');
        }),
        { numRuns: 50 }
      );
    });

    it('should correctly detect expired tokens', () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: 'test' },
        config.jwt.accessSecret,
        { expiresIn: '-1h' }
      );

      expect(authService.isTokenExpired(expiredToken)).toBe(true);

      // Create valid token
      const validToken = jwt.sign(
        { userId: 'test' },
        config.jwt.accessSecret,
        { expiresIn: '1h' }
      );

      expect(authService.isTokenExpired(validToken)).toBe(false);
    });

    it('should get correct token expiration', () => {
      fc.assert(
        fc.property(userIdArb, roleArb, sessionIdArb, (userId, role, sessionId) => {
          const user = { id: userId, role };
          const tokens = authService.generateTokens(user, sessionId);

          const expiration = authService.getTokenExpiration(tokens.accessToken);
          
          expect(expiration).toBeInstanceOf(Date);
          expect(expiration.getTime()).toBeGreaterThan(Date.now());
        }),
        { numRuns: 50 }
      );
    });
  });
});
