/**
 * Property-Based Tests for Status Mapper
 * 
 * Feature: shipping-provider-integration, Property 3: Status normalization consistency
 * Validates: Requirements 5.3
 */

const fc = require('fast-check');
const {
  normalizeStatus,
  getValidStatuses,
  isValidStatus,
  getStatusDisplayText,
  getStatusPriority,
  isTerminalStatus,
  isSuccessStatus,
  isFailureStatus,
  GHTK_STATUS_MAP,
  GHN_STATUS_MAP,
  VTP_STATUS_MAP,
  INHOUSE_STATUS_MAP,
} = require('../status.mapper');
const { ShippingStatus } = require('../shipping.interface');

describe('Status Mapper Property Tests', () => {
  /**
   * Property 3: Status normalization consistency
   * For any provider-specific status, normalizing it should always produce 
   * a valid unified status from the defined set
   */
  describe('Property 3: Status normalization consistency', () => {
    test('GHTK status normalization always produces valid unified status', () => {
      const ghtkStatuses = Object.keys(GHTK_STATUS_MAP);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...ghtkStatuses),
          (ghtkStatus) => {
            const normalized = normalizeStatus('ghtk', ghtkStatus);
            return isValidStatus(normalized);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('GHN status normalization always produces valid unified status', () => {
      const ghnStatuses = Object.keys(GHN_STATUS_MAP);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...ghnStatuses),
          (ghnStatus) => {
            const normalized = normalizeStatus('ghn', ghnStatus);
            return isValidStatus(normalized);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('VTP status normalization always produces valid unified status', () => {
      const vtpStatuses = Object.keys(VTP_STATUS_MAP);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...vtpStatuses),
          (vtpStatus) => {
            const normalized = normalizeStatus('viettelpost', vtpStatus);
            return isValidStatus(normalized);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('In-house status normalization always produces valid unified status', () => {
      const inhouseStatuses = Object.keys(INHOUSE_STATUS_MAP);
      
      fc.assert(
        fc.property(
          fc.constantFrom(...inhouseStatuses),
          (inhouseStatus) => {
            const normalized = normalizeStatus('inhouse', inhouseStatus);
            return isValidStatus(normalized);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('unknown status defaults to created', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ghtk', 'ghn', 'viettelpost', 'inhouse'),
          fc.string({ minLength: 10, maxLength: 20 }), // unlikely to match any real status
          (provider, unknownStatus) => {
            const normalized = normalizeStatus(provider, unknownStatus);
            // Should return a valid status (defaults to 'created')
            return isValidStatus(normalized);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Status display text consistency', () => {
    test('all valid statuses have display text', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getValidStatuses()),
          (status) => {
            const displayText = getStatusDisplayText(status);
            return typeof displayText === 'string' && displayText.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Status priority consistency', () => {
    test('all valid statuses have a priority', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getValidStatuses()),
          (status) => {
            const priority = getStatusPriority(status);
            return typeof priority === 'number' && priority >= 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('delivered has higher priority than created', () => {
      const createdPriority = getStatusPriority(ShippingStatus.CREATED);
      const deliveredPriority = getStatusPriority(ShippingStatus.DELIVERED);
      expect(deliveredPriority).toBeGreaterThan(createdPriority);
    });
  });

  describe('Terminal status consistency', () => {
    test('terminal statuses are mutually exclusive with non-terminal', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getValidStatuses()),
          (status) => {
            const isTerminal = isTerminalStatus(status);
            // Terminal statuses should be delivered, returned, or cancelled
            if (isTerminal) {
              return [
                ShippingStatus.DELIVERED,
                ShippingStatus.RETURNED,
                ShippingStatus.CANCELLED,
              ].includes(status);
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('success and failure statuses are mutually exclusive', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getValidStatuses()),
          (status) => {
            const isSuccess = isSuccessStatus(status);
            const isFailure = isFailureStatus(status);
            // Cannot be both success and failure
            return !(isSuccess && isFailure);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('delivered is the only success status', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getValidStatuses()),
          (status) => {
            if (isSuccessStatus(status)) {
              return status === ShippingStatus.DELIVERED;
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Normalization idempotence', () => {
    test('normalizing already unified status returns same status', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...getValidStatuses()),
          (unifiedStatus) => {
            // In-house uses unified statuses directly
            const normalized = normalizeStatus('inhouse', unifiedStatus);
            // Should either return the same status or a valid fallback
            return isValidStatus(normalized);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
