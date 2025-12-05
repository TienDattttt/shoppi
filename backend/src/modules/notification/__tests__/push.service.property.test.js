/**
 * Property-Based Tests for Push Service
 * Tests push notification delivery and error handling
 */

const fc = require('fast-check');

// Mock Firebase client
jest.mock('../../../shared/firebase/firebase.client', () => ({
  sendToDevice: jest.fn(),
  sendToDevices: jest.fn(),
}));

// Mock notification repository
jest.mock('../notification.repository', () => ({
  getDevicesByUser: jest.fn(),
  markTokenInvalid: jest.fn(),
  updateTokenLastUsed: jest.fn(),
}));

const { sendToDevice, sendToDevices } = require('../../../shared/firebase/firebase.client');
const notificationRepository = require('../notification.repository');
const pushService = require('../services/push.service');

describe('Push Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: notification-system, Property 3: Push notification delivery to all devices**
   * **Validates: Requirements 2.1**
   *
   * For any push notification, the system SHALL attempt delivery to all active device tokens of the user.
   */
  describe('Property 3: Push notification delivery to all devices', () => {
    it('should attempt to send push to all registered devices for a user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 5 }),
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            body: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (userId, deviceCount, payload) => {
            // Clear mocks for each iteration
            jest.clearAllMocks();
            
            // Generate mock devices
            const mockDevices = Array.from({ length: deviceCount }, (_, i) => ({
              id: 'device-' + i,
              user_id: userId,
              token: 'token-' + i,
              platform: 'ios',
              is_active: true,
            }));

            notificationRepository.getDevicesByUser.mockResolvedValue(mockDevices);
            sendToDevice.mockResolvedValue('message-id');
            notificationRepository.updateTokenLastUsed.mockResolvedValue();

            const result = await pushService.sendPush(userId, payload);

            // Should attempt to send to all devices
            expect(sendToDevice).toHaveBeenCalledTimes(deviceCount);

            // Result should reflect successful delivery
            expect(result.sentCount).toBe(deviceCount);
            expect(result.totalDevices).toBe(deviceCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero sent count when user has no devices', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }),
            body: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (userId, payload) => {
            notificationRepository.getDevicesByUser.mockResolvedValue([]);

            const result = await pushService.sendPush(userId, payload);

            expect(sendToDevice).not.toHaveBeenCalled();
            expect(result.sentCount).toBe(0);
            expect(result.success).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });


  /**
   * **Feature: notification-system, Property 4: Invalid token removal**
   * **Validates: Requirements 2.3**
   *
   * For any FCM error indicating invalid token, the system SHALL mark the token as inactive.
   */
  describe('Property 4: Invalid token removal', () => {
    it('should mark tokens as invalid when FCM returns invalid token error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 0, max: 4 }),
          async (userId, deviceCount, failIndex) => {
            // Ensure failIndex is within bounds
            const actualFailIndex = failIndex % deviceCount;
            
            const mockDevices = Array.from({ length: deviceCount }, (_, i) => ({
              id: 'device-' + i,
              user_id: userId,
              token: 'token-' + i,
              platform: 'android',
              is_active: true,
            }));

            notificationRepository.getDevicesByUser.mockResolvedValue(mockDevices);
            notificationRepository.markTokenInvalid.mockResolvedValue();
            notificationRepository.updateTokenLastUsed.mockResolvedValue();

            // Make one device fail with invalid token error
            sendToDevice.mockImplementation((token) => {
              if (token === 'token-' + actualFailIndex) {
                return Promise.reject({ code: 'INVALID_TOKEN', token });
              }
              return Promise.resolve('message-id');
            });

            const result = await pushService.sendPush(userId, { title: 'Test', body: 'Test body' });

            // Invalid token should be marked
            expect(notificationRepository.markTokenInvalid).toHaveBeenCalledWith('token-' + actualFailIndex);
            
            // Result should reflect the failure
            expect(result.failedCount).toBe(1);
            expect(result.sentCount).toBe(deviceCount - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark all invalid tokens in batch send', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
          fc.integer({ min: 1, max: 3 }),
          async (userIds, devicesPerUser) => {
            // Setup mock devices for each user
            const allDevices = [];
            userIds.forEach((userId, userIndex) => {
              const devices = Array.from({ length: devicesPerUser }, (_, i) => ({
                id: 'device-' + userIndex + '-' + i,
                user_id: userId,
                token: 'token-' + userIndex + '-' + i,
                platform: 'ios',
                is_active: true,
              }));
              allDevices.push(...devices);
            });

            // Mock getDevicesByUser to return devices for each user
            notificationRepository.getDevicesByUser.mockImplementation((userId) => {
              const userIndex = userIds.indexOf(userId);
              if (userIndex === -1) return Promise.resolve([]);
              return Promise.resolve(
                Array.from({ length: devicesPerUser }, (_, i) => ({
                  id: 'device-' + userIndex + '-' + i,
                  user_id: userId,
                  token: 'token-' + userIndex + '-' + i,
                  platform: 'ios',
                  is_active: true,
                }))
              );
            });

            // Simulate some invalid tokens
            const invalidTokens = ['token-0-0'];
            sendToDevices.mockResolvedValue({
              successCount: allDevices.length - invalidTokens.length,
              failureCount: invalidTokens.length,
              invalidTokens,
            });
            notificationRepository.markTokenInvalid.mockResolvedValue();

            const result = await pushService.sendBatchPush(userIds, { title: 'Test', body: 'Body' });

            // All invalid tokens should be marked
            invalidTokens.forEach(token => {
              expect(notificationRepository.markTokenInvalid).toHaveBeenCalledWith(token);
            });

            expect(result.invalidTokens).toEqual(invalidTokens);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Batch Push Operations', () => {
    it('should send to all users devices in batch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
          async (userIds) => {
            // Clear mocks for each iteration
            jest.clearAllMocks();
            
            // Each user has 2 devices
            notificationRepository.getDevicesByUser.mockImplementation((userId) => {
              return Promise.resolve([
                { token: userId + '-token-1' },
                { token: userId + '-token-2' },
              ]);
            });

            sendToDevices.mockResolvedValue({
              successCount: userIds.length * 2,
              failureCount: 0,
              invalidTokens: [],
            });

            const result = await pushService.sendBatchPush(userIds, { title: 'Test', body: 'Body' });

            // Should collect tokens from all users
            expect(notificationRepository.getDevicesByUser).toHaveBeenCalledTimes(userIds.length);
            expect(result.totalTokens).toBe(userIds.length * 2);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
