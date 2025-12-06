/**
 * Property-Based Tests for GHTK Webhook Validation
 * 
 * Feature: shipping-provider-integration, Property 4: Webhook signature validation
 * Validates: Requirements 4.1, 4.5
 */

const fc = require('fast-check');
const crypto = require('crypto');
const GHTKProvider = require('../providers/ghtk.provider');

describe('GHTK Webhook Property Tests', () => {
  const webhookSecret = 'test-webhook-secret-key';
  let provider;

  beforeEach(() => {
    provider = new GHTKProvider({
      apiToken: 'test-token',
      webhookSecret: webhookSecret,
      sandbox: true,
    });
  });

  /**
   * Helper to generate valid signature
   */
  function generateValidSignature(payload, secret) {
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Property 4: Webhook signature validation
   * For any webhook payload, if signature is invalid then validation should return false;
   * if signature matches then validation should return true
   */
  describe('Property 4: Webhook signature validation', () => {
    test('valid signature always returns true', () => {
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            partner_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: -1, max: 13 }),
            status_name: fc.string({ minLength: 1, maxLength: 50 }),
            update_time: fc.date().map(d => d.toISOString()),
          }),
          (payload) => {
            const signature = generateValidSignature(payload, webhookSecret);
            return provider.validateWebhook(payload, signature) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('invalid signature always returns false', () => {
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            partner_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: -1, max: 13 }),
          }),
          fc.string({ minLength: 64, maxLength: 64 }).filter(s => /^[a-f0-9]+$/.test(s)),
          (payload, randomSignature) => {
            // Random signature should not match
            const validSignature = generateValidSignature(payload, webhookSecret);
            if (randomSignature === validSignature) {
              return true; // Skip if accidentally matches
            }
            return provider.validateWebhook(payload, randomSignature) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('empty signature returns false', () => {
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: 1, max: 13 }),
          }),
          (payload) => {
            return provider.validateWebhook(payload, '') === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('null signature returns false', () => {
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: 1, max: 13 }),
          }),
          (payload) => {
            return provider.validateWebhook(payload, null) === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    test('modified payload invalidates signature', () => {
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            partner_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: 1, max: 13 }),
          }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (payload, modification) => {
            const signature = generateValidSignature(payload, webhookSecret);
            
            // Modify the payload
            const modifiedPayload = { ...payload, label_id: payload.label_id + modification };
            
            // Original signature should not validate modified payload
            return provider.validateWebhook(modifiedPayload, signature) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Webhook payload parsing', () => {
    test('parseWebhookPayload extracts tracking number', () => {
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            partner_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: 1, max: 13 }),
            status_name: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (payload) => {
            const parsed = provider.parseWebhookPayload(payload);
            return parsed.trackingNumber === payload.label_id;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('parseWebhookPayload returns valid unified status', () => {
      const { isValidStatus } = require('../status.mapper');
      
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: -1, max: 13 }),
          }),
          (payload) => {
            const parsed = provider.parseWebhookPayload(payload);
            return isValidStatus(parsed.status);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('parseWebhookPayload includes timestamp', () => {
      fc.assert(
        fc.property(
          fc.record({
            label_id: fc.string({ minLength: 5, maxLength: 20 }),
            status_id: fc.integer({ min: 1, max: 13 }),
            update_time: fc.date().map(d => d.toISOString()),
          }),
          (payload) => {
            const parsed = provider.parseWebhookPayload(payload);
            return parsed.timestamp instanceof Date;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
