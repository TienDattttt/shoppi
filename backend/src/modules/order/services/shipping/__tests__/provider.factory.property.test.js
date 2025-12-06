/**
 * Property-Based Tests for Provider Factory
 * 
 * Feature: shipping-provider-integration, Property 2: Provider factory returns correct type
 * Validates: Requirements 8.3
 */

const fc = require('fast-check');
const { 
  registerProvider, 
  getProvider, 
  isProviderRegistered,
  getRegisteredProviders,
  validateProviderInterface,
} = require('../provider.factory');
const { BaseShippingProvider } = require('../shipping.interface');

// Mock provider for testing
class MockProvider extends BaseShippingProvider {
  constructor(config) {
    super(config);
    this.providerCode = 'mock';
    this.providerName = 'Mock Provider';
  }

  isConfigured() {
    return true;
  }

  async calculateFee(params) {
    return { fee: 30000, estimatedDays: 3 };
  }

  async createOrder(orderData) {
    return { trackingNumber: 'MOCK123', providerOrderId: 'ORDER123' };
  }

  async cancelOrder(trackingNumber) {
    return { success: true, message: 'Cancelled' };
  }

  async getTracking(trackingNumber) {
    return { status: 'created', history: [] };
  }

  validateWebhook(payload, signature) {
    return true;
  }

  parseWebhookPayload(payload) {
    return { trackingNumber: payload.tracking, status: 'created' };
  }

  async testConnection() {
    return { success: true };
  }
}

describe('Provider Factory Property Tests', () => {
  beforeAll(() => {
    // Register mock provider for testing
    registerProvider('mock', MockProvider);
  });

  /**
   * Property 2: Provider factory returns correct type
   * For any valid provider code, the factory should return an instance 
   * that implements all required interface methods
   */
  describe('Property 2: Provider factory returns correct type', () => {
    test('registered providers return instances with all required methods', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getRegisteredProviders()),
          (providerCode) => {
            const provider = getProvider(providerCode);
            
            // Verify all required methods exist
            expect(typeof provider.calculateFee).toBe('function');
            expect(typeof provider.createOrder).toBe('function');
            expect(typeof provider.cancelOrder).toBe('function');
            expect(typeof provider.getTracking).toBe('function');
            expect(typeof provider.validateWebhook).toBe('function');
            
            // Verify provider code and name
            expect(typeof provider.getProviderCode()).toBe('string');
            expect(typeof provider.getProviderName()).toBe('string');
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('validateProviderInterface returns true for valid providers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getRegisteredProviders()),
          (providerCode) => {
            const provider = getProvider(providerCode);
            return validateProviderInterface(provider) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('unregistered providers throw error', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            !getRegisteredProviders().includes(s.toLowerCase()) && 
            /^[a-z]+$/.test(s)
          ),
          (invalidCode) => {
            expect(() => getProvider(invalidCode)).toThrow();
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Provider registration consistency', () => {
    test('isProviderRegistered is consistent with getRegisteredProviders', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getRegisteredProviders()),
          (providerCode) => {
            return isProviderRegistered(providerCode) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('provider code is case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getRegisteredProviders()),
          (providerCode) => {
            const upper = getProvider(providerCode.toUpperCase());
            const lower = getProvider(providerCode.toLowerCase());
            
            return upper.getProviderCode() === lower.getProviderCode();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
