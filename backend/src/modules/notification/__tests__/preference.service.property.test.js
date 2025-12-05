/**
 * Property-Based Tests for Preference Service
 * Tests preference checking and default preferences
 */

const fc = require('fast-check');

// Mock Supabase client
jest.mock('../../../shared/supabase/supabase.client', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const preferenceService = require('../services/preference.service');

// Arbitrary generators
const channelArb = fc.constantFrom('push', 'in_app');
const notificationTypeArb = fc.constantFrom(
  'order_created', 'order_shipped', 'order_delivered',
  'promotion', 'flash_sale', 'price_drop', 'new_review'
);

const preferencesArb = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  push_enabled: fc.boolean(),
  in_app_enabled: fc.boolean(),
  order_updates: fc.boolean(),
  promotions: fc.boolean(),
  price_drops: fc.boolean(),
  new_reviews: fc.boolean(),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
});

describe('Preference Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: notification-system, Property 11: Preference check before sending**
   * **Validates: Requirements 5.2, 5.3**
   *
   * For any notification send, the system SHALL check user preferences and skip disabled channels.
   */
  describe('Property 11: Preference check before sending', () => {
    it('should return false when push channel is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          notificationTypeArb,
          async (userId, type) => {
            const prefs = {
              id: 'pref-id',
              user_id: userId,
              push_enabled: false, // Disabled
              in_app_enabled: true,
              order_updates: true,
              promotions: true,
              price_drops: true,
              new_reviews: true,
            };

            const mockChain = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: prefs, error: null }),
            };
            supabaseAdmin.from.mockReturnValue(mockChain);

            const result = await preferenceService.shouldSend(userId, type, 'push');

            // Should return false because push is disabled
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when in_app channel is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          notificationTypeArb,
          async (userId, type) => {
            const prefs = {
              id: 'pref-id',
              user_id: userId,
              push_enabled: true,
              in_app_enabled: false, // Disabled
              order_updates: true,
              promotions: true,
              price_drops: true,
              new_reviews: true,
            };

            const mockChain = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: prefs, error: null }),
            };
            supabaseAdmin.from.mockReturnValue(mockChain);

            const result = await preferenceService.shouldSend(userId, type, 'in_app');

            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when notification type is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const prefs = {
            id: 'pref-id',
            user_id: userId,
            push_enabled: true,
            in_app_enabled: true,
            order_updates: true,
            promotions: false, // Disabled
            price_drops: true,
            new_reviews: true,
          };

          const mockChain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: prefs, error: null }),
          };
          supabaseAdmin.from.mockReturnValue(mockChain);

          // Promotion type should be blocked
          const result = await preferenceService.shouldSend(userId, 'promotion', 'push');

          expect(result).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('should return true when all preferences are enabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          notificationTypeArb,
          channelArb,
          async (userId, type, channel) => {
            const prefs = {
              id: 'pref-id',
              user_id: userId,
              push_enabled: true,
              in_app_enabled: true,
              order_updates: true,
              promotions: true,
              price_drops: true,
              new_reviews: true,
            };

            const mockChain = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: prefs, error: null }),
            };
            supabaseAdmin.from.mockReturnValue(mockChain);

            const result = await preferenceService.shouldSend(userId, type, channel);

            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: notification-system, Property 12: Default preferences on registration**
   * **Validates: Requirements 5.5**
   *
   * For any new user, the system SHALL create default preferences with all channels enabled.
   */
  describe('Property 12: Default preferences on registration', () => {
    it('should create preferences with all channels enabled by default', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const createdPrefs = {
            id: 'new-pref-id',
            user_id: userId,
            ...preferenceService.DEFAULT_PREFERENCES,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const mockChain = {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: createdPrefs, error: null }),
          };
          supabaseAdmin.from.mockReturnValue(mockChain);

          const result = await preferenceService.createDefaultPreferences(userId);

          // All channels should be enabled
          expect(result.push_enabled).toBe(true);
          expect(result.in_app_enabled).toBe(true);

          // All notification types should be enabled
          expect(result.order_updates).toBe(true);
          expect(result.promotions).toBe(true);
          expect(result.price_drops).toBe(true);
          expect(result.new_reviews).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should return true for shouldSend when no preferences exist (defaults)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          notificationTypeArb,
          channelArb,
          async (userId, type, channel) => {
            // No preferences found
            const mockChain = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            };
            supabaseAdmin.from.mockReturnValue(mockChain);

            const result = await preferenceService.shouldSend(userId, type, channel);

            // Should default to true (all enabled)
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow overriding default preferences on creation', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.boolean(), async (userId, promotionsEnabled) => {
          const overrides = { promotions: promotionsEnabled };
          const createdPrefs = {
            id: 'new-pref-id',
            user_id: userId,
            ...preferenceService.DEFAULT_PREFERENCES,
            ...overrides,
          };

          const mockChain = {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: createdPrefs, error: null }),
          };
          supabaseAdmin.from.mockReturnValue(mockChain);

          const result = await preferenceService.createDefaultPreferences(userId, overrides);

          // Override should be applied
          expect(result.promotions).toBe(promotionsEnabled);

          // Other defaults should remain
          expect(result.push_enabled).toBe(true);
          expect(result.order_updates).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Preference Update Operations', () => {
    it('should update preferences correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.boolean(),
          fc.boolean(),
          async (userId, pushEnabled, promotionsEnabled) => {
            const existingPrefs = {
              id: 'pref-id',
              user_id: userId,
              push_enabled: true,
              in_app_enabled: true,
              order_updates: true,
              promotions: true,
              price_drops: true,
              new_reviews: true,
            };

            const updatedPrefs = {
              ...existingPrefs,
              push_enabled: pushEnabled,
              promotions: promotionsEnabled,
            };

            // Mock getPreferences
            const getMockChain = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: existingPrefs, error: null }),
            };

            // Mock updatePreferences
            const updateMockChain = {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: updatedPrefs, error: null }),
            };

            supabaseAdmin.from
              .mockReturnValueOnce(getMockChain)
              .mockReturnValueOnce(updateMockChain);

            const result = await preferenceService.updatePreferences(userId, {
              push_enabled: pushEnabled,
              promotions: promotionsEnabled,
            });

            expect(result.push_enabled).toBe(pushEnabled);
            expect(result.promotions).toBe(promotionsEnabled);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
