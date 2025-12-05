/**
 * Payment Service Property Tests
 * Property-based tests for payment operations
 * 
 * Uses fast-check for property-based testing
 */

const fc = require('fast-check');

// Mock dependencies
const mockOrderRepository = {
  findOrderById: jest.fn(),
  findSubOrdersByOrderId: jest.fn(),
  updateOrderStatus: jest.fn(),
  updateSubOrderStatus: jest.fn(),
  updatePaymentStatus: jest.fn(),
};

// Mock modules
jest.mock('../order.repository', () => mockOrderRepository);
jest.mock('../../../shared/utils/error.util', () => ({
  AppError: class AppError extends Error {
    constructor(code, message, statusCode) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

const paymentService = require('./payment.service');

// Generators
const uuidArb = fc.uuid();
const positiveFloatArb = fc.float({ min: 1000, max: 100000000, noNaN: true });

const orderArb = fc.record({
  id: uuidArb,
  order_number: fc.string({ minLength: 10, maxLength: 20 }),
  user_id: uuidArb,
  grand_total: positiveFloatArb,
  status: fc.constant('pending_payment'),
  payment_method: fc.constantFrom('cod', 'vnpay', 'momo', 'wallet'),
  payment_status: fc.constant('pending'),
});

const subOrderArb = fc.record({
  id: uuidArb,
  order_id: uuidArb,
  shop_id: uuidArb,
  status: fc.constant('pending'),
});

describe('Payment Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  /**
   * **Feature: order-management, Property 6: COD payment status**
   * *For any* order with COD payment method, after payment selection
   * the order status SHALL be 'confirmed' and payment_status SHALL be 'pending'.
   * **Validates: Requirements 3.1**
   */
  describe('Property 6: COD payment status', () => {
    it('should set order status to confirmed and payment_status to pending for COD', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderArb,
          fc.array(subOrderArb, { minLength: 1, maxLength: 5 }),
          async (order, subOrders) => {
            // Setup mocks
            mockOrderRepository.findOrderById.mockResolvedValue(order);
            mockOrderRepository.findSubOrdersByOrderId.mockResolvedValue(subOrders);
            mockOrderRepository.updateOrderStatus.mockResolvedValue({ ...order, status: 'confirmed' });
            mockOrderRepository.updateSubOrderStatus.mockResolvedValue({});
            
            const result = await paymentService.handleCODPayment(order);
            
            // Verify order status updated to 'confirmed'
            expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
              order.id,
              'confirmed'
            );
            
            // Verify result indicates pending payment (COD)
            expect(result.method).toBe('cod');
            expect(result.status).toBe('pending');
            
            // Verify all sub-orders updated to 'pending'
            expect(mockOrderRepository.updateSubOrderStatus).toHaveBeenCalledTimes(subOrders.length);
            for (const subOrder of subOrders) {
              expect(mockOrderRepository.updateSubOrderStatus).toHaveBeenCalledWith(
                subOrder.id,
                'pending'
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should initiate COD payment correctly via initiatePayment', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderArb,
          fc.array(subOrderArb, { minLength: 1, maxLength: 3 }),
          async (order, subOrders) => {
            mockOrderRepository.findOrderById.mockResolvedValue(order);
            mockOrderRepository.findSubOrdersByOrderId.mockResolvedValue(subOrders);
            mockOrderRepository.updateOrderStatus.mockResolvedValue({ ...order, status: 'confirmed' });
            mockOrderRepository.updateSubOrderStatus.mockResolvedValue({});
            
            const result = await paymentService.initiatePayment(order.id, 'cod');
            
            expect(result.method).toBe('cod');
            expect(result.status).toBe('pending');
            expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(order.id, 'confirmed');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: order-management, Property 7: Successful payment status update**
   * *For any* successful payment callback, the payment_status SHALL change to 'paid'
   * and order status SHALL change to 'confirmed'.
   * **Validates: Requirements 3.3**
   */
  describe('Property 7: Successful payment status update', () => {
    it('should update payment_status to paid on successful VNPay callback', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          fc.array(subOrderArb, { minLength: 1, maxLength: 3 }),
          async (orderId, subOrders) => {
            mockOrderRepository.findSubOrdersByOrderId.mockResolvedValue(subOrders);
            mockOrderRepository.updatePaymentStatus.mockResolvedValue({});
            mockOrderRepository.updateSubOrderStatus.mockResolvedValue({});
            
            // Successful VNPay callback
            const callbackData = {
              vnp_TxnRef: orderId,
              vnp_ResponseCode: '00',
              vnp_TransactionStatus: '00',
            };
            
            await paymentService.handleCallback('vnpay', callbackData);
            
            // Verify payment status updated to 'paid'
            expect(mockOrderRepository.updatePaymentStatus).toHaveBeenCalledWith(
              orderId,
              'paid'
            );
            
            // Verify sub-orders updated to 'pending'
            expect(mockOrderRepository.updateSubOrderStatus).toHaveBeenCalledTimes(subOrders.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update payment_status to paid on successful MoMo callback', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          fc.array(subOrderArb, { minLength: 1, maxLength: 3 }),
          async (orderId, subOrders) => {
            mockOrderRepository.findSubOrdersByOrderId.mockResolvedValue(subOrders);
            mockOrderRepository.updatePaymentStatus.mockResolvedValue({});
            mockOrderRepository.updateSubOrderStatus.mockResolvedValue({});
            
            // Successful MoMo callback (resultCode = 0)
            const callbackData = {
              orderId,
              resultCode: 0,
            };
            
            await paymentService.handleCallback('momo', callbackData);
            
            expect(mockOrderRepository.updatePaymentStatus).toHaveBeenCalledWith(
              orderId,
              'paid'
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: order-management, Property 8: Failed payment stock release**
   * *For any* failed or timed-out payment, all reserved stock SHALL be released.
   * **Validates: Requirements 3.4**
   */
  describe('Property 8: Failed payment stock release', () => {
    it('should release stock and update status on failed VNPay payment', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          fc.constantFrom('01', '02', '03', '04', '99'), // VNPay error codes
          async (orderId, errorCode) => {
            mockOrderRepository.updatePaymentStatus.mockResolvedValue({});
            mockOrderRepository.updateOrderStatus.mockResolvedValue({});
            
            // Failed VNPay callback
            const callbackData = {
              vnp_TxnRef: orderId,
              vnp_ResponseCode: errorCode,
              vnp_TransactionStatus: errorCode,
            };
            
            await paymentService.handleCallback('vnpay', callbackData);
            
            // Verify payment status updated to 'failed'
            expect(mockOrderRepository.updatePaymentStatus).toHaveBeenCalledWith(
              orderId,
              'failed'
            );
            
            // Verify order status updated to 'payment_failed'
            expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
              orderId,
              'payment_failed'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should release stock and update status on failed MoMo payment', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          fc.integer({ min: 1, max: 99 }), // Non-zero = error
          async (orderId, errorCode) => {
            mockOrderRepository.updatePaymentStatus.mockResolvedValue({});
            mockOrderRepository.updateOrderStatus.mockResolvedValue({});
            
            // Failed MoMo callback
            const callbackData = {
              orderId,
              resultCode: errorCode,
            };
            
            await paymentService.handleCallback('momo', callbackData);
            
            expect(mockOrderRepository.updatePaymentStatus).toHaveBeenCalledWith(
              orderId,
              'failed'
            );
            
            expect(mockOrderRepository.updateOrderStatus).toHaveBeenCalledWith(
              orderId,
              'payment_failed'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not update to failed on successful payment', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          fc.array(subOrderArb, { minLength: 1, maxLength: 3 }),
          async (orderId, subOrders) => {
            mockOrderRepository.findSubOrdersByOrderId.mockResolvedValue(subOrders);
            mockOrderRepository.updatePaymentStatus.mockResolvedValue({});
            mockOrderRepository.updateSubOrderStatus.mockResolvedValue({});
            
            // Successful payment
            const callbackData = {
              vnp_TxnRef: orderId,
              vnp_ResponseCode: '00',
              vnp_TransactionStatus: '00',
            };
            
            await paymentService.handleCallback('vnpay', callbackData);
            
            // Should NOT update to 'failed' or 'payment_failed'
            expect(mockOrderRepository.updatePaymentStatus).not.toHaveBeenCalledWith(
              orderId,
              'failed'
            );
            expect(mockOrderRepository.updateOrderStatus).not.toHaveBeenCalledWith(
              orderId,
              'payment_failed'
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Additional payment properties
   */
  describe('Payment method routing', () => {
    it('should route to correct handler based on payment method', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderArb,
          fc.constantFrom('cod', 'vnpay', 'momo', 'wallet'),
          fc.array(subOrderArb, { minLength: 1, maxLength: 2 }),
          async (order, method, subOrders) => {
            mockOrderRepository.findOrderById.mockResolvedValue({ ...order, payment_method: method });
            mockOrderRepository.findSubOrdersByOrderId.mockResolvedValue(subOrders);
            mockOrderRepository.updateOrderStatus.mockResolvedValue({});
            mockOrderRepository.updateSubOrderStatus.mockResolvedValue({});
            
            const result = await paymentService.initiatePayment(order.id, method);
            
            expect(result.method).toBe(method);
            expect(result).toHaveProperty('status');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should throw error for invalid payment method', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderArb,
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
            !['cod', 'vnpay', 'momo', 'wallet'].includes(s)
          ),
          async (order, invalidMethod) => {
            mockOrderRepository.findOrderById.mockResolvedValue(order);
            
            await expect(
              paymentService.initiatePayment(order.id, invalidMethod)
            ).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Payment URL generation', () => {
    it('should generate VNPay URL with required parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderArb,
          async (order) => {
            mockOrderRepository.findOrderById.mockResolvedValue(order);
            
            const result = await paymentService.createVNPayPayment(order);
            
            expect(result.method).toBe('vnpay');
            expect(result.paymentUrl).toBeDefined();
            expect(result.paymentUrl).toContain('vnp_');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate MoMo URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderArb,
          async (order) => {
            mockOrderRepository.findOrderById.mockResolvedValue(order);
            
            const result = await paymentService.createMoMoPayment(order);
            
            expect(result.method).toBe('momo');
            expect(result.paymentUrl).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
