/**
 * Property-Based Tests for Notification Service
 * Tests notification storage, ordering, read status, and unread count
 */

const fc = require('fast-check');

// Mock Supabase client first (before any module imports)
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

// Mock Firebase client
jest.mock('../../../shared/firebase/firebase.client', () => ({
  sendToDevice: jest.fn(),
  sendToDevices: jest.fn(),
}));

// Mock dependencies
jest.mock('../notification.repository');
jest.mock('../services/push.service');

const notificationRepository = require('../notification.repository');
const pushService = require('../services/push.service');
const notificationService = require('../notification.service');

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

describe('Notification Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: notification-system, Property 5: In-app notification storage**
   * **Validates: Requirements 3.1**
   *
   * For any notification created, the system SHALL store it in database with correct user_id and type.
   */
  describe('Property 5: In-app notification storage', () => {
    it('should store notification with correct user_id and type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          notificationTypeArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (userId, type, title, body) => {
            const createdNotification = {
              id: 'generated-id',
              user_id: userId,
              type,
              title,
              body,
              data: {},
              is_read: false,
              read_at: null,
              created_at: new Date().toISOString(),
            };

            notificationRepository.createNotification.mockResolvedValue(createdNotification);
            pushService.sendPush.mockResolvedValue({ success: true, sentCount: 1 });

            const result = await notificationService.send(userId, type, { title, body });

            // Verify notification was created with correct fields
            expect(notificationRepository.createNotification).toHaveBeenCalledWith(
              expect.objectContaining({
                user_id: userId,
                type,
                title,
                body,
              })
            );

            // Verify result has correct user_id and type
            expect(result.user_id).toBe(userId);
            expect(result.type).toBe(type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should store notification even if push fails', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), notificationTypeArb, async (userId, type) => {
          const createdNotification = {
            id: 'id',
            user_id: userId,
            type,
            title: 'Test',
            body: 'Test body',
            is_read: false,
            created_at: new Date().toISOString(),
          };

          notificationRepository.createNotification.mockResolvedValue(createdNotification);
          pushService.sendPush.mockRejectedValue(new Error('Push failed'));

          const result = await notificationService.send(userId, type, {
            title: 'Test',
            body: 'Test body',
          });

          // Notification should still be created
          expect(result.user_id).toBe(userId);
          expect(result.type).toBe(type);
        }),
        { numRuns: 50 }
      );
    });
  });


  /**
   * **Feature: notification-system, Property 6: Notification list ordering**
   * **Validates: Requirements 3.2**
   *
   * For any notification list query, results SHALL be sorted by created_at descending.
   */
  describe('Property 6: Notification list ordering', () => {
    it('should return notifications sorted by created_at descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(notificationArb, { minLength: 2, maxLength: 10 }),
          async (userId, notifications) => {
            // Sort notifications by created_at descending (as the repository should return)
            const sortedNotifications = [...notifications]
              .map(n => ({ ...n, user_id: userId }))
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            notificationRepository.getNotificationsByUser.mockResolvedValue({
              data: sortedNotifications,
              total: sortedNotifications.length,
              page: 1,
              limit: 20,
            });

            const result = await notificationService.getNotifications(userId);

            // Verify ordering - each notification should have created_at >= next one
            for (let i = 0; i < result.data.length - 1; i++) {
              const current = new Date(result.data[i].created_at);
              const next = new Date(result.data[i + 1].created_at);
              expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: notification-system, Property 7: Mark as read updates timestamp**
   * **Validates: Requirements 3.3**
   *
   * For any mark as read operation, the system SHALL set is_read=true and read_at to current timestamp.
   */
  describe('Property 7: Mark as read updates timestamp', () => {
    it('should set is_read to true and read_at to timestamp when marking as read', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (notificationId, userId) => {
          const unreadNotification = {
            id: notificationId,
            user_id: userId,
            type: 'order_created',
            title: 'Test',
            body: 'Test body',
            is_read: false,
            read_at: null,
            created_at: new Date().toISOString(),
          };

          const readNotification = {
            ...unreadNotification,
            is_read: true,
            read_at: new Date().toISOString(),
          };

          notificationRepository.findNotificationById.mockResolvedValue(unreadNotification);
          notificationRepository.markAsRead.mockResolvedValue(readNotification);

          const result = await notificationService.markAsRead(notificationId, userId);

          // Verify is_read is true
          expect(result.is_read).toBe(true);

          // Verify read_at is set
          expect(result.read_at).not.toBeNull();

          // Verify read_at is a valid timestamp
          expect(new Date(result.read_at).getTime()).not.toBeNaN();
        }),
        { numRuns: 100 }
      );
    });

    it('should return existing notification if already read', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (notificationId, userId) => {
          const alreadyReadNotification = {
            id: notificationId,
            user_id: userId,
            type: 'order_created',
            is_read: true,
            read_at: new Date().toISOString(),
          };

          notificationRepository.findNotificationById.mockResolvedValue(alreadyReadNotification);

          const result = await notificationService.markAsRead(notificationId, userId);

          // Should return the already read notification without calling markAsRead
          expect(result.is_read).toBe(true);
          expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: notification-system, Property 8: Unread count accuracy**
   * **Validates: Requirements 3.4**
   *
   * For any unread count query, the result SHALL equal the count of notifications where is_read=false.
   */
  describe('Property 8: Unread count accuracy', () => {
    it('should return accurate unread count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          async (userId, unreadCount) => {
            notificationRepository.getUnreadCount.mockResolvedValue(unreadCount);

            const result = await notificationService.getUnreadCount(userId);

            // Verify count matches
            expect(result.count).toBe(unreadCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero for user with no unread notifications', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          notificationRepository.getUnreadCount.mockResolvedValue(0);

          const result = await notificationService.getUnreadCount(userId);

          expect(result.count).toBe(0);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Bulk Notification Operations', () => {
    it('should create notifications for all users in bulk', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          notificationTypeArb,
          async (userIds, type) => {
            const createdNotifications = userIds.map(userId => ({
              id: `notif-${userId}`,
              user_id: userId,
              type,
              title: 'Bulk Test',
              body: 'Bulk body',
              is_read: false,
            }));

            notificationRepository.createNotificationsBulk.mockResolvedValue(createdNotifications);
            pushService.sendBatchPush.mockResolvedValue({ success: true, successCount: userIds.length });

            const result = await notificationService.sendBulk(userIds, type, {
              title: 'Bulk Test',
              body: 'Bulk body',
            });

            // Verify all users got notifications
            expect(result.notifications.length).toBe(userIds.length);

            // Verify each notification has correct type
            result.notifications.forEach(n => {
              expect(n.type).toBe(type);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
