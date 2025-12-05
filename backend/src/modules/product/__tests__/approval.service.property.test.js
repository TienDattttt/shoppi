/**
 * Property-Based Tests for Approval Service
 * Tests product approval workflow correctness
 */

const fc = require('fast-check');
const approvalService = require('../services/approval.service');
const productRepository = require('../product.repository');

// Mock the repository
jest.mock('../product.repository');

// Arbitrary generators
const productStatusArb = fc.constantFrom('draft', 'pending', 'active', 'rejected', 'revision_required', 'inactive');

const productArb = fc.record({
  id: fc.uuid(),
  shop_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 200 }),
  status: productStatusArb,
  rejection_reason: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
  created_at: fc.date().map(d => d.toISOString()),
});

const adminIdArb = fc.uuid();
const reasonArb = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0);

describe('Approval Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Feature: product-management, Property 10: Product approval status change**
   * **Validates: Requirements 4.1**
   * 
   * For any pending product, when Admin approves, the status SHALL change to 'active'
   * and the product SHALL be indexed in search.
   */
  describe('Property 10: Product approval status change', () => {
    it('should change status from pending to active on approval', async () => {
      await fc.assert(
        fc.asyncProperty(productArb, adminIdArb, async (product, adminId) => {
          const pendingProduct = { ...product, status: 'pending' };
          
          productRepository.findProductById.mockResolvedValue(pendingProduct);
          productRepository.updateProduct.mockImplementation(async (id, data) => ({
            ...pendingProduct,
            ...data,
          }));
          
          const result = await approvalService.approveProduct(product.id, adminId);
          
          // Status should change to active
          expect(result.newStatus).toBe('active');
          expect(result.previousStatus).toBe('pending');
          
          // Update should be called with correct status
          expect(productRepository.updateProduct).toHaveBeenCalledWith(
            product.id,
            expect.objectContaining({
              status: 'active',
            })
          );
        }),
        { numRuns: 100 }
      );
    });


    it('should set published_at timestamp on approval', async () => {
      await fc.assert(
        fc.asyncProperty(productArb, adminIdArb, async (product, adminId) => {
          const pendingProduct = { ...product, status: 'pending', published_at: null };
          
          productRepository.findProductById.mockResolvedValue(pendingProduct);
          productRepository.updateProduct.mockImplementation(async (id, data) => ({
            ...pendingProduct,
            ...data,
          }));
          
          const beforeApproval = new Date();
          await approvalService.approveProduct(product.id, adminId);
          const afterApproval = new Date();
          
          // published_at should be set
          expect(productRepository.updateProduct).toHaveBeenCalledWith(
            product.id,
            expect.objectContaining({
              published_at: expect.any(String),
            })
          );
          
          // Verify timestamp is reasonable
          const call = productRepository.updateProduct.mock.calls[0][1];
          const publishedAt = new Date(call.published_at);
          expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime() - 1000);
          expect(publishedAt.getTime()).toBeLessThanOrEqual(afterApproval.getTime() + 1000);
        }),
        { numRuns: 100 }
      );
    });

    it('should clear rejection_reason on approval', async () => {
      await fc.assert(
        fc.asyncProperty(productArb, adminIdArb, reasonArb, async (product, adminId, reason) => {
          const pendingProduct = { ...product, status: 'pending', rejection_reason: reason };
          
          productRepository.findProductById.mockResolvedValue(pendingProduct);
          productRepository.updateProduct.mockImplementation(async (id, data) => ({
            ...pendingProduct,
            ...data,
          }));
          
          await approvalService.approveProduct(product.id, adminId);
          
          // rejection_reason should be cleared
          expect(productRepository.updateProduct).toHaveBeenCalledWith(
            product.id,
            expect.objectContaining({
              rejection_reason: null,
            })
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should reject approval for non-pending products', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArb,
          adminIdArb,
          fc.constantFrom('draft', 'active', 'rejected', 'revision_required', 'inactive'),
          async (product, adminId, status) => {
            const nonPendingProduct = { ...product, status };
            
            productRepository.findProductById.mockResolvedValue(nonPendingProduct);
            
            await expect(
              approvalService.approveProduct(product.id, adminId)
            ).rejects.toThrow(/Cannot approve product/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw NotFoundError for non-existent product', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), adminIdArb, async (productId, adminId) => {
          productRepository.findProductById.mockResolvedValue(null);
          
          await expect(
            approvalService.approveProduct(productId, adminId)
          ).rejects.toThrow('Product not found');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Rejection workflow', () => {
    it('should change status to rejected with reason', async () => {
      await fc.assert(
        fc.asyncProperty(productArb, adminIdArb, reasonArb, async (product, adminId, reason) => {
          const pendingProduct = { ...product, status: 'pending' };
          
          productRepository.findProductById.mockResolvedValue(pendingProduct);
          productRepository.updateProduct.mockImplementation(async (id, data) => ({
            ...pendingProduct,
            ...data,
          }));
          
          const result = await approvalService.rejectProduct(product.id, adminId, reason);
          
          expect(result.newStatus).toBe('rejected');
          expect(result.reason).toBe(reason.trim());
          
          expect(productRepository.updateProduct).toHaveBeenCalledWith(
            product.id,
            expect.objectContaining({
              status: 'rejected',
              rejection_reason: reason.trim(),
            })
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should require rejection reason', async () => {
      await fc.assert(
        fc.asyncProperty(
          productArb,
          adminIdArb,
          fc.constantFrom('', '   ', null, undefined),
          async (product, adminId, emptyReason) => {
            const pendingProduct = { ...product, status: 'pending' };
            productRepository.findProductById.mockResolvedValue(pendingProduct);
            
            await expect(
              approvalService.rejectProduct(product.id, adminId, emptyReason)
            ).rejects.toThrow('Rejection reason is required');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Revision request workflow', () => {
    it('should change status to revision_required with reason', async () => {
      await fc.assert(
        fc.asyncProperty(productArb, adminIdArb, reasonArb, async (product, adminId, reason) => {
          const pendingProduct = { ...product, status: 'pending' };
          
          productRepository.findProductById.mockResolvedValue(pendingProduct);
          productRepository.updateProduct.mockImplementation(async (id, data) => ({
            ...pendingProduct,
            ...data,
          }));
          
          const result = await approvalService.requestRevision(product.id, adminId, reason);
          
          expect(result.newStatus).toBe('revision_required');
          expect(result.reason).toBe(reason.trim());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Status transition validation', () => {
    it('should validate allowed transitions', () => {
      const validTransitions = [
        ['pending', 'active'],
        ['pending', 'rejected'],
        ['pending', 'revision_required'],
        ['revision_required', 'pending'],
        ['rejected', 'pending'],
        ['active', 'inactive'],
        ['inactive', 'active'],
        ['draft', 'pending'],
      ];

      for (const [from, to] of validTransitions) {
        expect(approvalService.isValidTransition(from, to)).toBe(true);
      }
    });

    it('should reject invalid transitions', () => {
      const invalidTransitions = [
        ['active', 'pending'],
        ['active', 'rejected'],
        ['rejected', 'active'],
        ['draft', 'active'],
        ['inactive', 'pending'],
      ];

      for (const [from, to] of invalidTransitions) {
        expect(approvalService.isValidTransition(from, to)).toBe(false);
      }
    });
  });
});
