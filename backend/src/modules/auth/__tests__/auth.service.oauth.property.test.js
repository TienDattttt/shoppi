/**
 * Property-Based Tests for Auth Service - OAuth
 * Tests OAuth login and account linking
 */

const fc = require('fast-check');

// Mock dependencies
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: { from: jest.fn() },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');

// Generators
const providerArb = fc.constantFrom('google', 'facebook');
const providerIdArb = fc.stringMatching(/^[a-zA-Z0-9]{10,30}$/);
const emailArb = fc.emailAddress();
const nameArb = fc.string({ minLength: 1, maxLength: 100 });
const avatarUrlArb = fc.webUrl();

describe('Auth Service OAuth Property Tests', () => {
  let authService;
  let mockUserStore;
  let mockSessionStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockUserStore = new Map();
    mockSessionStore = new Map();

    // Setup comprehensive mocks
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          insert: jest.fn((data) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              const user = { 
                ...data, 
                id: `user-${Date.now()}`,
                created_at: new Date().toISOString(),
              };
              mockUserStore.set(user.id, user);
              if (data.email) mockUserStore.set(`email:${data.email}`, user);
              if (data.google_id) mockUserStore.set(`google:${data.google_id}`, user);
              if (data.facebook_id) mockUserStore.set(`facebook:${data.facebook_id}`, user);
              return { data: user, error: null };
            }),
          })),
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              single: jest.fn().mockImplementation(async () => {
                // Find by various fields
                if (field === 'google_id') {
                  const user = mockUserStore.get(`google:${value}`);
                  return user 
                    ? { data: user, error: null }
                    : { data: null, error: { code: 'PGRST116' } };
                }
                if (field === 'facebook_id') {
                  const user = mockUserStore.get(`facebook:${value}`);
                  return user 
                    ? { data: user, error: null }
                    : { data: null, error: { code: 'PGRST116' } };
                }
                if (field === 'email') {
                  const user = mockUserStore.get(`email:${value}`);
                  return user 
                    ? { data: user, error: null }
                    : { data: null, error: { code: 'PGRST116' } };
                }
                if (field === 'id') {
                  const user = mockUserStore.get(value);
                  return user 
                    ? { data: user, error: null }
                    : { data: null, error: { code: 'PGRST116' } };
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
          insert: jest.fn((data) => ({
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockImplementation(async () => {
              const session = { ...data, id: data.id || `session-${Date.now()}` };
              mockSessionStore.set(session.id, session);
              return { data: session, error: null };
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
   * **Feature: user-authentication, Property 11: OAuth creates or links account correctly**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   * 
   * For any successful OAuth authentication:
   * - If user doesn't exist, a new Customer account SHALL be created
   * - If user exists, OAuth provider SHALL be linked to existing account
   */
  describe('Property 11: OAuth creates or links account correctly', () => {
    it('should create new customer account for new OAuth user', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          providerIdArb,
          emailArb,
          nameArb,
          async (provider, providerId, email, name) => {
            mockUserStore.clear();
            mockSessionStore.clear();

            const result = await authService.loginWithOAuth(provider, {
              providerId,
              email,
              name,
            });

            // Should create new user
            expect(result.isNewUser).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user.role).toBe('customer');
            expect(result.user.status).toBe('active');
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return existing user for returning OAuth user', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          providerIdArb,
          emailArb,
          nameArb,
          async (provider, providerId, email, name) => {
            mockUserStore.clear();
            mockSessionStore.clear();

            // First login - creates user
            const firstResult = await authService.loginWithOAuth(provider, {
              providerId,
              email,
              name,
            });
            expect(firstResult.isNewUser).toBe(true);

            // Second login - returns existing user
            const secondResult = await authService.loginWithOAuth(provider, {
              providerId,
              email,
              name,
            });
            expect(secondResult.isNewUser).toBe(false);
            expect(secondResult.user.id).toBe(firstResult.user.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should link OAuth to existing email account', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          providerIdArb,
          emailArb,
          nameArb,
          async (provider, providerId, email, name) => {
            mockUserStore.clear();
            mockSessionStore.clear();

            // Create existing user with email (simulating password registration)
            const existingUser = {
              id: 'existing-user-id',
              email: email.toLowerCase(),
              role: 'customer',
              status: 'active',
              full_name: 'Existing User',
              password_hash: 'some-hash',
            };
            mockUserStore.set(existingUser.id, existingUser);
            mockUserStore.set(`email:${email.toLowerCase()}`, existingUser);

            // OAuth login with same email
            const result = await authService.loginWithOAuth(provider, {
              providerId,
              email,
              name,
            });

            // Should link to existing account, not create new
            expect(result.isNewUser).toBe(false);
            expect(result.linkedProvider).toBe(provider);
            expect(result.user.id).toBe(existingUser.id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject OAuth login for inactive accounts', async () => {
      const provider = 'google';
      const providerId = 'google-123';
      
      // Create inactive user
      const inactiveUser = {
        id: 'inactive-user-id',
        google_id: providerId,
        role: 'customer',
        status: 'inactive',
      };
      mockUserStore.set(inactiveUser.id, inactiveUser);
      mockUserStore.set(`google:${providerId}`, inactiveUser);

      await expect(
        authService.loginWithOAuth(provider, { providerId, email: 'test@test.com', name: 'Test' })
      ).rejects.toThrow('AUTH_ACCOUNT_INACTIVE');
    });

    it('should auto-activate new OAuth users', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          providerIdArb,
          emailArb,
          nameArb,
          async (provider, providerId, email, name) => {
            mockUserStore.clear();
            mockSessionStore.clear();

            const result = await authService.loginWithOAuth(provider, {
              providerId,
              email,
              name,
            });

            // New OAuth users should be auto-activated (no OTP needed)
            expect(result.user.status).toBe('active');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('OAuth Provider Validation', () => {
    it('should reject invalid OAuth providers', async () => {
      await expect(
        authService.loginWithOAuth('invalid-provider', {
          providerId: '123',
          email: 'test@test.com',
          name: 'Test',
        })
      ).rejects.toThrow('Invalid OAuth provider');
    });

    it('should accept only google and facebook providers', async () => {
      await fc.assert(
        fc.asyncProperty(
          providerArb,
          providerIdArb,
          async (provider, providerId) => {
            mockUserStore.clear();
            mockSessionStore.clear();

            // Should not throw for valid providers
            const result = await authService.loginWithOAuth(provider, {
              providerId,
              email: `test-${Date.now()}@test.com`,
              name: 'Test User',
            });

            expect(result).toBeDefined();
            expect(['google', 'facebook']).toContain(provider);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('OAuth Account Linking', () => {
    it('should prevent linking OAuth to another user account', async () => {
      const providerId = 'google-123';
      
      // Create first user with Google linked
      const user1 = {
        id: 'user-1',
        google_id: providerId,
        email: 'user1@test.com',
        role: 'customer',
        status: 'active',
      };
      mockUserStore.set(user1.id, user1);
      mockUserStore.set(`google:${providerId}`, user1);

      // Try to link same Google to different user
      const user2 = {
        id: 'user-2',
        email: 'user2@test.com',
        role: 'customer',
        status: 'active',
      };
      mockUserStore.set(user2.id, user2);

      await expect(
        authService.linkOAuthToAccount(user2.id, 'google', providerId)
      ).rejects.toThrow('AUTH_OAUTH_ALREADY_LINKED');
    });
  });
});
