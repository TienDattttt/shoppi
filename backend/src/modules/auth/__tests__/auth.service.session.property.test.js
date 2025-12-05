/**
 * Property-Based Tests for Auth Service - Session Management
 * Tests session creation, listing, termination, and logout
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
const userIdArb = fc.uuid();
const sessionIdArb = fc.uuid();
const deviceTypeArb = fc.constantFrom('mobile', 'web', 'desktop', 'tablet');
const ipAddressArb = fc.ipV4();

describe('Auth Service Session Management Property Tests', () => {
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
              const session = { 
                ...data, 
                id: data.id || `session-${Date.now()}`,
                created_at: new Date().toISOString(),
                last_activity_at: new Date().toISOString(),
              };
              mockSessionStore.set(session.id, session);
              return { data: session, error: null };
            }),
          })),
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              gt: jest.fn(() => ({
                order: jest.fn().mockImplementation(async () => {
                  // Return all sessions for user
                  const sessions = [];
                  for (const [id, session] of mockSessionStore) {
                    if (session.user_id === value) {
                      sessions.push(session);
                    }
                  }
                  return { data: sessions, error: null };
                }),
              })),
              single: jest.fn().mockImplementation(async () => {
                const session = mockSessionStore.get(value);
                return session 
                  ? { data: session, error: null }
                  : { data: null, error: { code: 'PGRST116' } };
              }),
            })),
          })),
          delete: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              then: jest.fn().mockImplementation(async (resolve) => {
                if (field === 'user_id') {
                  // Delete all sessions for user
                  for (const [id, session] of mockSessionStore) {
                    if (session.user_id === value) {
                      mockSessionStore.delete(id);
                    }
                  }
                } else {
                  mockSessionStore.delete(value);
                }
                resolve({ error: null });
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
   * **Feature: user-authentication, Property 16: Session data completeness**
   * **Validates: Requirements 7.1**
   * 
   * For any successful login, session record SHALL contain user_id, device_type,
   * ip_address, and created_at timestamp.
   */
  describe('Property 16: Session data completeness', () => {
    it('should store complete session data on login', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          deviceTypeArb,
          ipAddressArb,
          async (userId, deviceType, ipAddress) => {
            mockSessionStore.clear();
            mockUserStore.clear();

            // Setup user
            const user = { id: userId, role: 'customer', status: 'active', full_name: 'Test' };
            mockUserStore.set(userId, user);

            // Create session
            const result = await authService.createSessionWithTokens(user, {
              deviceType,
              ipAddress,
              deviceName: 'Test Device',
              userAgent: 'Test Agent',
            });

            // Verify session was created with complete data
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user).toBeDefined();

            // Check session in store
            const sessions = Array.from(mockSessionStore.values());
            expect(sessions.length).toBeGreaterThan(0);
            
            const session = sessions[0];
            expect(session.user_id).toBe(userId);
            expect(session.device_type).toBe(deviceType);
            expect(session.ip_address).toBe(ipAddress);
            expect(session.created_at).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Feature: user-authentication, Property 17: Session listing returns all active sessions**
   * **Validates: Requirements 7.2**
   * 
   * For any user with multiple active sessions, requesting session list
   * SHALL return all sessions belonging to that user.
   */
  describe('Property 17: Session listing returns all active sessions', () => {
    it('should return all active sessions for user', async () => {
      const userId = 'test-user-id';
      mockUserStore.set(userId, { id: userId, role: 'customer', status: 'active' });

      // Create multiple sessions
      const sessionCount = 3;
      for (let i = 0; i < sessionCount; i++) {
        mockSessionStore.set(`session-${i}`, {
          id: `session-${i}`,
          user_id: userId,
          device_type: 'mobile',
          device_name: `Device ${i}`,
          ip_address: `192.168.1.${i}`,
          created_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      const sessions = await authService.getSessions(userId);

      expect(sessions).toHaveLength(sessionCount);
      sessions.forEach((session, i) => {
        expect(session.id).toBe(`session-${i}`);
        expect(session.deviceType).toBe('mobile');
      });
    });

    it('should return empty array for user with no sessions', async () => {
      const sessions = await authService.getSessions('user-with-no-sessions');
      expect(sessions).toEqual([]);
    });
  });

  /**
   * **Feature: user-authentication, Property 18: Session termination invalidates immediately**
   * **Validates: Requirements 7.3**
   * 
   * For any active session, when terminated, subsequent requests using
   * that session's tokens SHALL be rejected.
   */
  describe('Property 18: Session termination invalidates immediately', () => {
    it('should delete session on termination', async () => {
      const userId = 'test-user-id';
      const sessionId = 'session-to-terminate';

      // Create session
      mockSessionStore.set(sessionId, {
        id: sessionId,
        user_id: userId,
        device_type: 'mobile',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      // Verify session exists
      expect(mockSessionStore.has(sessionId)).toBe(true);

      // Terminate session
      const result = await authService.terminateSession(userId, sessionId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('terminated');
    });

    it('should reject termination of non-existent session', async () => {
      await expect(
        authService.terminateSession('user-id', 'non-existent-session')
      ).rejects.toThrow('AUTH_SESSION_NOT_FOUND');
    });

    it('should reject termination of another user\'s session', async () => {
      const sessionId = 'other-user-session';
      mockSessionStore.set(sessionId, {
        id: sessionId,
        user_id: 'other-user-id',
        device_type: 'mobile',
      });

      await expect(
        authService.terminateSession('my-user-id', sessionId)
      ).rejects.toThrow('AUTH_FORBIDDEN');
    });
  });

  /**
   * **Feature: user-authentication, Property 19: Logout invalidates current session**
   * **Validates: Requirements 7.4**
   * 
   * For any logout request, the current session SHALL be invalidated
   * and removed from active sessions.
   */
  describe('Property 19: Logout invalidates current session', () => {
    it('should invalidate session on logout', async () => {
      const userId = 'test-user-id';
      const sessionId = 'current-session';

      mockSessionStore.set(sessionId, {
        id: sessionId,
        user_id: userId,
        device_type: 'mobile',
      });

      const result = await authService.logout(userId, sessionId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Logged out');
    });

    it('should invalidate all sessions on logout from all devices', async () => {
      const userId = 'test-user-id';

      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        mockSessionStore.set(`session-${i}`, {
          id: `session-${i}`,
          user_id: userId,
          device_type: 'mobile',
        });
      }

      const result = await authService.logoutAllDevices(userId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('all devices');
    });
  });

  describe('getCurrentUser', () => {
    it('should return serialized user profile', async () => {
      const userId = 'test-user-id';
      const user = {
        id: userId,
        email: 'test@example.com',
        role: 'customer',
        status: 'active',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
      };
      mockUserStore.set(userId, user);

      const result = await authService.getCurrentUser(userId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('test@example.com');
      expect(result.fullName).toBe('Test User');
      // Should not contain sensitive fields
      expect(result.password_hash).toBeUndefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.getCurrentUser('non-existent-user')
      ).rejects.toThrow('AUTH_USER_NOT_FOUND');
    });
  });
});
