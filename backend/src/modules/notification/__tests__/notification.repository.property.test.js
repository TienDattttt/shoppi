/**
 * Property-Based Tests for Notification Repository
 * Tests device token and notification operations
 */

const fc = require('fast-check');

// Mock Supabase client
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const notificationRepository = require('../notification.repository');

// Arbitrary generators
const platformArb = fc.constantFrom('ios', 'android', 'web');

const deviceTokenArb = fc.record({
  user_id: fc.uuid(),
  token: fc.stringOf(fc.constantFrom(...'abcdef0123456789'.split('')), { minLength: 50, maxLength: 100 }).map(s => 'fcm_' + s),
  platform: platformArb,
  device_info: fc.constant({}),
});

describe('Notification Repository Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: notification-system, Property 1: Device token registration stores all required fields**
   * **Validates: Requirements 1.1, 1.5**
   */
  describe('Property 1: Device token registration stores all required fields', () => {
    it('should store all required fields when registering a device token', async () => {
      await fc.assert(
        fc.asyncProperty(deviceTokenArb, async (deviceData) => {
          const storedData = {
            id: 'generated-uuid',
            ...deviceData,
            is_active: true,
            last_used_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };

          const mockChain = {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: storedData, error: null }),
          };
          supabaseAdmin.from.mockReturnValue(mockChain);

          const result = await notificationRepository.registerDevice(deviceData);

          expect(result.user_id).toBe(deviceData.user_id);
          expect(result.token).toBe(deviceData.token);
          expect(result.platform).toBe(deviceData.platform);
          expect(result.device_info).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should validate platform is one of ios, android, or web', async () => {
      await fc.assert(
        fc.asyncProperty(deviceTokenArb, async (deviceData) => {
          const storedData = { 
            id: 'uuid', 
            ...deviceData, 
            is_active: true,
            last_used_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };

          const mockChain = {
            upsert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: storedData, error: null }),
          };
          supabaseAdmin.from.mockReturnValue(mockChain);

          const result = await notificationRepository.registerDevice(deviceData);
          expect(['ios', 'android', 'web']).toContain(result.platform);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: notification-system, Property 2: Multiple device tokens per user**
   * **Validates: Requirements 1.3**
   */
  describe('Property 2: Multiple device tokens per user', () => {
    it('should return all active device tokens for a user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 5 }),
          async (userId, deviceCount) => {
            const mockDevices = Array.from({ length: deviceCount }, (_, i) => ({
              id: 'device-' + i,
              user_id: userId,
              token: 'token-' + i,
              platform: 'ios',
              is_active: true,
              device_info: {},
              created_at: new Date().toISOString(),
            }));

            const mockChain = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValue({ data: mockDevices, error: null }),
            };
            supabaseAdmin.from.mockReturnValue(mockChain);

            const result = await notificationRepository.getDevicesByUser(userId);

            expect(result.length).toBe(deviceCount);
            result.forEach(device => {
              expect(device.user_id).toBe(userId);
              expect(device.is_active).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Device Token Operations', () => {
    it('should remove device token successfully', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (userId, token) => {
          const mockChain = {
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => ({
              eq: jest.fn().mockResolvedValue({ error: null }),
            })),
          };
          supabaseAdmin.from.mockReturnValue(mockChain);

          await notificationRepository.removeDevice(userId, token);
          expect(supabaseAdmin.from).toHaveBeenCalledWith('device_tokens');
        }),
        { numRuns: 50 }
      );
    });

    it('should mark token as invalid', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (token) => {
          const mockChain = {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
          supabaseAdmin.from.mockReturnValue(mockChain);

          await notificationRepository.markTokenInvalid(token);
          expect(mockChain.update).toHaveBeenCalledWith({ is_active: false });
          expect(mockChain.eq).toHaveBeenCalledWith('token', token);
        }),
        { numRuns: 50 }
      );
    });
  });
});
