/**
 * Voucher Service Property Tests
 * Property-based tests for voucher validation and application
 * 
 * Uses fast-check for property-based testing
 */

const fc = require('fast-check');

// Mock dependencies
const mockVoucherRepository = {
  findVoucherByCode: jest.fn(),
  findVoucherById: jest.fn(),
  getUserVoucherUsage: jest.fn(),
  incrementUsageCount: jest.fn(),
  decrementUsageCount: jest.fn(),
  recordUserUsage: jest.fn(),
  removeUserUsage: jest.fn(),
  getOrderVoucherUsages: jest.fn(),
  findAvailableVouchers: jest.fn(),
};

const mockOrderDTO = {
  serializeVoucher: jest.fn(v => v),
};

// Mock modules
jest.mock('../voucher.repository', () => mockVoucherRepository);
jest.mock('../order.dto', () => mockOrderDTO);
jest.mock('../../../shared/utils/error.util', () => ({
  AppError: class AppError extends Error {
    constructor(code, message, statusCode) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

const voucherService = require('../services/voucher.service');

// Generators
const uuidArb = fc.uuid();
const voucherCodeArb = fc.string({ minLength: 4, maxLength: 20 }).map(s => s.toUpperCase());
const moneyArb = fc.integer({ min: 1000, max: 10000000 });
const percentageArb = fc.integer({ min: 1, max: 100 });

describe('Voucher Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: order-management, Property 20: Shop voucher scope**
   * *For any* shop voucher application, the discount SHALL only apply to the SubOrder of that shop.
   * **Validates: Requirements 10.1**
   */
  describe('Property 20: Shop voucher scope', () => {
    it('should accept shop voucher only for matching shop', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          uuidArb,
          moneyArb,
          async (code, userId, shopId, orderTotal) => {
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'shop',
              shop_id: shopId,
              is_active: true,
              start_date: new Date(Date.now() - 86400000).toISOString(),
              end_date: new Date(Date.now() + 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: 0,
              discount_type: 'percentage',
              discount_value: 10,
              max_discount: 50000,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            mockVoucherRepository.getUserVoucherUsage.mockResolvedValue(0);
            
            // Should succeed when shopId matches
            const result = await voucherService.validateVoucher(code, userId, orderTotal, shopId);
            
            expect(result.isValid).toBe(true);
            expect(result.voucher.type).toBe('shop');
            expect(result.voucher.shop_id).toBe(shopId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject shop voucher for different shop', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          uuidArb,
          uuidArb,
          moneyArb,
          async (code, userId, voucherShopId, differentShopId, orderTotal) => {
            // Ensure shops are different
            if (voucherShopId === differentShopId) return;
            
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'shop',
              shop_id: voucherShopId,
              is_active: true,
              start_date: new Date(Date.now() - 86400000).toISOString(),
              end_date: new Date(Date.now() + 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: 0,
              discount_type: 'percentage',
              discount_value: 10,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            mockVoucherRepository.getUserVoucherUsage.mockResolvedValue(0);
            
            // Should reject when shopId doesn't match
            await expect(
              voucherService.validateVoucher(code, userId, orderTotal, differentShopId)
            ).rejects.toThrow('VOUCHER_INVALID');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: order-management, Property 21: Platform voucher scope**
   * *For any* platform voucher application, the discount SHALL apply to the entire Order total.
   * **Validates: Requirements 10.2**
   */
  describe('Property 21: Platform voucher scope', () => {
    it('should accept platform voucher regardless of shop', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          fc.option(uuidArb, { nil: null }),
          moneyArb,
          async (code, userId, shopId, orderTotal) => {
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'platform',
              shop_id: null,
              is_active: true,
              start_date: new Date(Date.now() - 86400000).toISOString(),
              end_date: new Date(Date.now() + 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: 0,
              discount_type: 'percentage',
              discount_value: 10,
              max_discount: 100000,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            mockVoucherRepository.getUserVoucherUsage.mockResolvedValue(0);
            
            // Platform voucher should work for any shop or no shop
            const result = await voucherService.validateVoucher(code, userId, orderTotal, shopId);
            
            expect(result.isValid).toBe(true);
            expect(result.voucher.type).toBe('platform');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate discount on entire order total for platform voucher', async () => {
      await fc.assert(
        fc.asyncProperty(
          percentageArb,
          moneyArb,
          async (discountPercent, orderTotal) => {
            const voucher = {
              id: 'voucher-1',
              code: 'PLATFORM10',
              type: 'platform',
              shop_id: null,
              is_active: true,
              start_date: new Date(Date.now() - 86400000).toISOString(),
              end_date: new Date(Date.now() + 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: 0,
              discount_type: 'percentage',
              discount_value: discountPercent,
              max_discount: null, // No cap
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            mockVoucherRepository.getUserVoucherUsage.mockResolvedValue(0);
            
            const result = await voucherService.validateVoucher('PLATFORM10', 'user-1', orderTotal, null);
            
            // Discount should be calculated on entire order total
            const expectedDiscount = Math.round(orderTotal * (discountPercent / 100));
            expect(result.discount).toBe(expectedDiscount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: order-management, Property 22: Voucher minimum order validation**
   * *For any* voucher with min_order_value, if order total < min_order_value, the voucher SHALL be rejected.
   * **Validates: Requirements 10.3**
   */
  describe('Property 22: Voucher minimum order validation', () => {
    it('should reject voucher when order total is below minimum', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          moneyArb,
          async (code, userId, minOrderValue) => {
            // Order total is less than minimum
            const orderTotal = minOrderValue - 1000;
            if (orderTotal <= 0) return;
            
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'platform',
              shop_id: null,
              is_active: true,
              start_date: new Date(Date.now() - 86400000).toISOString(),
              end_date: new Date(Date.now() + 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: minOrderValue,
              discount_type: 'percentage',
              discount_value: 10,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            mockVoucherRepository.getUserVoucherUsage.mockResolvedValue(0);
            
            await expect(
              voucherService.validateVoucher(code, userId, orderTotal, null)
            ).rejects.toThrow('VOUCHER_MIN_ORDER');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept voucher when order total meets minimum', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          moneyArb,
          fc.integer({ min: 0, max: 1000000 }),
          async (code, userId, orderTotal, extraAmount) => {
            // Minimum is less than or equal to order total
            const minOrderValue = Math.max(0, orderTotal - extraAmount);
            
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'platform',
              shop_id: null,
              is_active: true,
              start_date: new Date(Date.now() - 86400000).toISOString(),
              end_date: new Date(Date.now() + 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: minOrderValue,
              discount_type: 'percentage',
              discount_value: 10,
              max_discount: 100000,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            mockVoucherRepository.getUserVoucherUsage.mockResolvedValue(0);
            
            const result = await voucherService.validateVoucher(code, userId, orderTotal, null);
            
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept voucher when order total equals minimum exactly', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          moneyArb,
          async (code, userId, orderTotal) => {
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'platform',
              shop_id: null,
              is_active: true,
              start_date: new Date(Date.now() - 86400000).toISOString(),
              end_date: new Date(Date.now() + 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: orderTotal, // Exactly equal
              discount_type: 'fixed',
              discount_value: 10000,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            mockVoucherRepository.getUserVoucherUsage.mockResolvedValue(0);
            
            const result = await voucherService.validateVoucher(code, userId, orderTotal, null);
            
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property tests for voucher discount calculation
   */
  describe('Voucher discount calculation', () => {
    it('should cap discount at max_discount for percentage vouchers', () => {
      fc.assert(
        fc.property(
          percentageArb,
          moneyArb,
          fc.integer({ min: 1000, max: 100000 }),
          (discountPercent, orderTotal, maxDiscount) => {
            const voucher = {
              discount_type: 'percentage',
              discount_value: discountPercent,
              max_discount: maxDiscount,
            };
            
            const discount = voucherService.calculateDiscount(voucher, orderTotal);
            
            // Discount should never exceed max_discount
            expect(discount).toBeLessThanOrEqual(maxDiscount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not exceed order total for fixed discount', () => {
      fc.assert(
        fc.property(
          moneyArb,
          moneyArb,
          (discountValue, orderTotal) => {
            const voucher = {
              discount_type: 'fixed',
              discount_value: discountValue,
              max_discount: null,
            };
            
            const discount = voucherService.calculateDiscount(voucher, orderTotal);
            
            // Discount should never exceed order total
            expect(discount).toBeLessThanOrEqual(orderTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate percentage discount correctly', () => {
      fc.assert(
        fc.property(
          percentageArb,
          moneyArb,
          (discountPercent, orderTotal) => {
            const voucher = {
              discount_type: 'percentage',
              discount_value: discountPercent,
              max_discount: null, // No cap
            };
            
            const discount = voucherService.calculateDiscount(voucher, orderTotal);
            const expectedDiscount = Math.round(orderTotal * (discountPercent / 100));
            
            // Should match expected calculation (capped at order total)
            expect(discount).toBe(Math.min(expectedDiscount, orderTotal));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Voucher expiration tests
   */
  describe('Voucher expiration validation', () => {
    it('should reject expired vouchers', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          moneyArb,
          fc.integer({ min: 1, max: 365 }),
          async (code, userId, orderTotal, daysExpired) => {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - daysExpired);
            
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'platform',
              shop_id: null,
              is_active: true,
              start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
              end_date: endDate.toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: 0,
              discount_type: 'percentage',
              discount_value: 10,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            
            await expect(
              voucherService.validateVoucher(code, userId, orderTotal, null)
            ).rejects.toThrow('VOUCHER_EXPIRED');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject vouchers not yet started', async () => {
      await fc.assert(
        fc.asyncProperty(
          voucherCodeArb,
          uuidArb,
          moneyArb,
          fc.integer({ min: 1, max: 365 }),
          async (code, userId, orderTotal, daysUntilStart) => {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + daysUntilStart);
            
            const voucher = {
              id: 'voucher-1',
              code,
              type: 'platform',
              shop_id: null,
              is_active: true,
              start_date: startDate.toISOString(),
              end_date: new Date(Date.now() + 60 * 86400000).toISOString(),
              usage_limit: 100,
              used_count: 0,
              per_user_limit: 1,
              min_order_value: 0,
              discount_type: 'percentage',
              discount_value: 10,
            };
            
            mockVoucherRepository.findVoucherByCode.mockResolvedValue(voucher);
            
            await expect(
              voucherService.validateVoucher(code, userId, orderTotal, null)
            ).rejects.toThrow('VOUCHER_INVALID');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
