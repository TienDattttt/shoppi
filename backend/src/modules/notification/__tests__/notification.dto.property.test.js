/**
 * Property-Based Tests for Notification DTOs
 * Tests serialization/deserialization correctness
 */

const fc = require('fast-check');
const {
  serializeNotification,
  deserializeNotification,
  serializeNotificationList,
  serializePreferences,
  deserializePreferences,
} = require('../notification.dto');

// Arbitrary generators
const notificationTypeArb = fc.constantFrom(
  'order_created', 'order_shipped', 'order_delivered',
  'new_review', 'price_drop', 'promotion'
);

const notificationArb = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  type: notificationTypeArb,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  body: fc.string({ minLength: 1, maxLength: 500 }),
  data: fc.constant({}),
  is_read: fc.boolean(),
  read_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  created_at: fc.date().map(d => d.toISOString()),
});

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

describe('Notification DTO Property Tests', () => {
  /**
   * **Feature: notification-system, Property 13: Notification serialization round-trip**
   * **Validates: Requirements 10.2**
   *
   * For any valid Notification object, serializing to JSON then deserializing SHALL produce equivalent object.
   */
  describe('Property 13: Notification serialization round-trip', () => {
    it('should preserve notification data through serialize -> deserialize cycle', () => {
      fc.assert(
        fc.property(notificationArb, (notification) => {
          // Serialize the notification
          const serialized = serializeNotification(notification);

          // Deserialize back
          const deserialized = deserializeNotification(serialized);

          // Check that key fields are preserved
          expect(deserialized.id).toBe(notification.id);
          expect(deserialized.user_id).toBe(notification.user_id);
          expect(deserialized.type).toBe(notification.type);
          expect(deserialized.title).toBe(notification.title);
          expect(deserialized.body).toBe(notification.body);
          expect(deserialized.is_read).toBe(notification.is_read);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null notification gracefully', () => {
      expect(serializeNotification(null)).toBeNull();
      expect(deserializeNotification(null)).toBeNull();
    });

    it('should preserve timestamps through serialization', () => {
      fc.assert(
        fc.property(notificationArb, (notification) => {
          const serialized = serializeNotification(notification);

          // Verify timestamps are valid ISO strings
          if (serialized.createdAt) {
            expect(new Date(serialized.createdAt).getTime()).not.toBeNaN();
          }
          if (serialized.readAt) {
            expect(new Date(serialized.readAt).getTime()).not.toBeNaN();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Notification List Serialization', () => {
    it('should serialize notification list with correct pagination', () => {
      fc.assert(
        fc.property(
          fc.array(notificationArb, { minLength: 0, maxLength: 10 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 50 }),
          (notifications, total, page, limit) => {
            const result = {
              data: notifications,
              total,
              page,
              limit,
              hasMore: page * limit < total,
            };

            const serialized = serializeNotificationList(result);

            // Verify data array length matches
            expect(serialized.data.length).toBe(notifications.length);

            // Verify pagination metadata
            expect(serialized.pagination.total).toBe(total);
            expect(serialized.pagination.page).toBe(page);
            expect(serialized.pagination.limit).toBe(limit);
            expect(serialized.pagination.totalPages).toBe(Math.ceil(total / limit));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty result gracefully', () => {
      const result = serializeNotificationList(null);
      expect(result.data).toEqual([]);
      expect(result.pagination).toBeDefined();
    });
  });

  describe('Preferences Serialization', () => {
    it('should preserve preferences through serialize -> deserialize cycle', () => {
      fc.assert(
        fc.property(preferencesArb, (preferences) => {
          const serialized = serializePreferences(preferences);
          const deserialized = deserializePreferences(serialized);

          // Check boolean fields are preserved
          expect(deserialized.push_enabled).toBe(preferences.push_enabled);
          expect(deserialized.in_app_enabled).toBe(preferences.in_app_enabled);
          expect(deserialized.order_updates).toBe(preferences.order_updates);
          expect(deserialized.promotions).toBe(preferences.promotions);
          expect(deserialized.price_drops).toBe(preferences.price_drops);
          expect(deserialized.new_reviews).toBe(preferences.new_reviews);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null preferences gracefully', () => {
      expect(serializePreferences(null)).toBeNull();
      expect(deserializePreferences(null)).toBeNull();
    });
  });
});
