/**
 * Property-Based Tests for Auth Service - Admin Functions
 * Tests account approval and rejection
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
const adminIdArb = fc.uuid();
const approvalRoleArb = fc.constantFrom('partner', 'shipper');
const rejectionReasonArb = fc.string({ minLength: 5, maxLength: 200 });

describe('Auth Service Admin Functions Property Tests', () => {
  let authService;
  let mockUserStore;
  let mockSessionStore;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockUserStore = new Map();
    mockSessionStore = new Map();

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn((field, value) => ({
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              range: jest.fn().mockImplementation(async () => {
                const users = Array.from(mockUserStore.values())
                  .filter(u => u.status === 'pending');
                return { data: users, error: null, count: users.length };
              }),
              single: jest.fn().mockImplementation(async () => {
                const user = mockUserStore.get(value);
                return user 
                  ? { data: user, error: null }
                  : { data: null, error: { code: 'PGRST116' } };
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
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
    });

    authService = require('../auth.service');
  });

  /**
   * **Feature: user-authentication, Property 6: Approval activates account and triggers notification**
   * **Validates: Requirements 2.3, 3.3**
   * 
   * For any pending Partner or Shipper account, when Admin approves,
   * the status SHALL change to 'active' and notification SHALL be triggered.
   */
  describe('Property 6: Approval activates account and triggers notification', () => {
    it('should change status to active when approved', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          adminIdArb,
          approvalRoleArb,
          async (userId, adminId, role) => {
            mockUserStore.clear();

            // Create pending account
            const user = {
              id: userId,
              email: 'test@example.com',
              phone: '+84912345678',
              role,
              status: 'pending',
              full_name: 'Test User',
            };
            mockUserStore.set(userId, user);

            // Approve account
            const result = await authService.approveAccount(userId, adminId);

            expect(result.success).toBe(true);
            expect(result.user.status).toBe('active');
            expect(result.approvedBy).toBe(adminId);
            expect(result.approvedAt).toBeDefined();

            // Verify user in store is updated
            const updatedUser = mockUserStore.get(userId);
            expect(updatedUser.status).toBe('active');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject approval for non-pending accounts', async () => {
      const userId = 'test-user-id';
      const adminId = 'admin-id';

      // Create already active account
      mockUserStore.set(userId, {
        id: userId,
        role: 'partner',
        status: 'active',
        full_name: 'Test',
      });

      await expect(
        authService.approveAccount(userId, adminId)
      ).rejects.toThrow('Cannot approve account with status');
    });

    it('should reject approval for customer accounts', async () => {
      const userId = 'test-user-id';
      const adminId = 'admin-id';

      mockUserStore.set(userId, {
        id: userId,
        role: 'customer',
        status: 'pending',
        full_name: 'Test',
      });

      await expect(
        authService.approveAccount(userId, adminId)
      ).rejects.toThrow('Only Partner and Shipper accounts require approval');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.approveAccount('non-existent-id', 'admin-id')
      ).rejects.toThrow('AUTH_USER_NOT_FOUND');
    });
  });

  describe('Account Rejection', () => {
    it('should change status to inactive when rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          adminIdArb,
          approvalRoleArb,
          rejectionReasonArb,
          async (userId, adminId, role, reason) => {
            mockUserStore.clear();

            const user = {
              id: userId,
              email: 'test@example.com',
              role,
              status: 'pending',
              full_name: 'Test User',
            };
            mockUserStore.set(userId, user);

            const result = await authService.rejectAccount(userId, adminId, reason);

            expect(result.success).toBe(true);
            expect(result.user.status).toBe('inactive');
            expect(result.rejectedBy).toBe(adminId);
            expect(result.reason).toBe(reason);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should require rejection reason', async () => {
      const userId = 'test-user-id';
      
      mockUserStore.set(userId, {
        id: userId,
        role: 'partner',
        status: 'pending',
        full_name: 'Test',
      });

      await expect(
        authService.rejectAccount(userId, 'admin-id', '')
      ).rejects.toThrow('Rejection reason is required');

      await expect(
        authService.rejectAccount(userId, 'admin-id', '   ')
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('Account Deactivation', () => {
    it('should deactivate account and invalidate sessions', async () => {
      const userId = 'test-user-id';
      const adminId = 'admin-id';

      mockUserStore.set(userId, {
        id: userId,
        role: 'partner',
        status: 'active',
        full_name: 'Test',
      });

      // Create sessions
      mockSessionStore.set('session-1', { id: 'session-1', user_id: userId });
      mockSessionStore.set('session-2', { id: 'session-2', user_id: userId });

      const result = await authService.deactivateAccount(userId, adminId, 'Policy violation');

      expect(result.success).toBe(true);
      expect(result.user.status).toBe('inactive');

      // Sessions should be deleted
      const remainingSessions = Array.from(mockSessionStore.values())
        .filter(s => s.user_id === userId);
      expect(remainingSessions.length).toBe(0);
    });

    it('should not allow deactivating admin accounts', async () => {
      const userId = 'admin-user-id';

      mockUserStore.set(userId, {
        id: userId,
        role: 'admin',
        status: 'active',
        full_name: 'Admin',
      });

      await expect(
        authService.deactivateAccount(userId, 'other-admin', 'Test')
      ).rejects.toThrow('Cannot deactivate admin accounts');
    });
  });

  describe('Account Reactivation', () => {
    it('should reactivate inactive account', async () => {
      const userId = 'test-user-id';
      const adminId = 'admin-id';

      mockUserStore.set(userId, {
        id: userId,
        role: 'partner',
        status: 'inactive',
        full_name: 'Test',
      });

      const result = await authService.reactivateAccount(userId, adminId);

      expect(result.success).toBe(true);
      expect(result.user.status).toBe('active');
      expect(result.reactivatedBy).toBe(adminId);
    });

    it('should not reactivate already active account', async () => {
      const userId = 'test-user-id';

      mockUserStore.set(userId, {
        id: userId,
        role: 'partner',
        status: 'active',
        full_name: 'Test',
      });

      await expect(
        authService.reactivateAccount(userId, 'admin-id')
      ).rejects.toThrow('Account is already active');
    });
  });
});
