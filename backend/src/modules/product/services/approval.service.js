/**
 * Approval Service
 * Admin workflow for product approval/rejection
 */

const productRepository = require('../product.repository');
const { AppError, NotFoundError, ValidationError } = require('../../../shared/utils/error.util');
const shopTriggers = require('../../notification/triggers/shop.triggers');
const partnerTriggers = require('../../notification/triggers/partner.triggers');
const followRepository = require('../../shop/follow.repository');
const shopRepository = require('../../shop/shop.repository');

// Valid status transitions
const STATUS_TRANSITIONS = {
  pending: ['active', 'rejected', 'revision_required'],
  revision_required: ['pending', 'rejected'],
  rejected: ['pending'],
  active: ['inactive'],
  inactive: ['active'],
  draft: ['pending'],
};

// Statuses that can be approved
const APPROVABLE_STATUSES = ['pending'];

// Statuses that can be rejected
const REJECTABLE_STATUSES = ['pending', 'revision_required'];

/**
 * Get pending products for review
 * @param {object} options - Pagination options
 * @returns {Promise<{data: object[], count: number}>}
 */
async function getPendingProducts(options = {}) {
  const { page = 1, limit = 20 } = options;
  // This would need a custom repository method
  // For now, return placeholder
  return { data: [], count: 0 };
}

/**
 * Approve a product
 * Validates: Requirements 5.4 - Notify followers when shop adds new product
 * @param {string} productId
 * @param {string} adminId - Admin user ID
 * @returns {Promise<object>}
 */
async function approveProduct(productId, adminId) {
  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (!APPROVABLE_STATUSES.includes(product.status)) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot approve product with status '${product.status}'. Only pending products can be approved.`,
      400
    );
  }

  const updatedProduct = await productRepository.updateProduct(productId, {
    status: 'active',
    published_at: new Date().toISOString(),
    rejection_reason: null,
  });

  // TODO: Index product in Elasticsearch
  // await searchService.indexProduct(updatedProduct);

  // Notify partner about product approval
  try {
    if (product.shop_id) {
      const shop = await shopRepository.findShopById(product.shop_id);
      if (shop) {
        await partnerTriggers.onProductApproved({
          partner_id: shop.partner_id,
          product_id: productId,
          product_name: product.name,
        });

        // Notify followers about new product (Requirement 5.4)
        const followerIds = await followRepository.getFollowerUserIds(product.shop_id);
        if (followerIds && followerIds.length > 0) {
          await shopTriggers.onNewProduct({
            shop_id: product.shop_id,
            shop_name: shop.shop_name,
            product_id: productId,
            product_name: product.name,
            follower_ids: followerIds,
          });
        }
      }
    }
  } catch (notificationError) {
    // Log error but don't fail the approval
    console.error(`Failed to send product approval notifications: ${notificationError.message}`);
  }

  return {
    product: updatedProduct,
    previousStatus: product.status,
    newStatus: 'active',
    approvedBy: adminId,
    approvedAt: new Date().toISOString(),
  };
}


/**
 * Reject a product
 * @param {string} productId
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<object>}
 */
async function rejectProduct(productId, adminId, reason) {
  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Rejection reason is required');
  }

  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (!REJECTABLE_STATUSES.includes(product.status)) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot reject product with status '${product.status}'.`,
      400
    );
  }

  const updatedProduct = await productRepository.updateProduct(productId, {
    status: 'rejected',
    rejection_reason: reason.trim(),
  });

  // Notify partner about product rejection
  try {
    if (product.shop_id) {
      const shop = await shopRepository.findShopById(product.shop_id);
      if (shop) {
        await partnerTriggers.onProductRejected({
          partner_id: shop.partner_id,
          product_id: productId,
          product_name: product.name,
          reason: reason.trim(),
        });
      }
    }
  } catch (notificationError) {
    // Log error but don't fail the rejection
    console.error(`Failed to send product rejection notification: ${notificationError.message}`);
  }

  return {
    product: updatedProduct,
    previousStatus: product.status,
    newStatus: 'rejected',
    rejectedBy: adminId,
    rejectedAt: new Date().toISOString(),
    reason: reason.trim(),
  };
}

/**
 * Request revision for a product
 * @param {string} productId
 * @param {string} adminId - Admin user ID
 * @param {string} reason - Revision request reason
 * @returns {Promise<object>}
 */
async function requestRevision(productId, adminId, reason) {
  if (!reason || reason.trim().length === 0) {
    throw new ValidationError('Revision reason is required');
  }

  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.status !== 'pending') {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot request revision for product with status '${product.status}'. Only pending products can be sent for revision.`,
      400
    );
  }

  const updatedProduct = await productRepository.updateProduct(productId, {
    status: 'revision_required',
    rejection_reason: reason.trim(),
  });

  // TODO: Notify partner
  // await notificationService.notifyRevisionRequired(updatedProduct, reason);

  return {
    product: updatedProduct,
    previousStatus: product.status,
    newStatus: 'revision_required',
    requestedBy: adminId,
    requestedAt: new Date().toISOString(),
    reason: reason.trim(),
  };
}

/**
 * Resubmit product after revision
 * @param {string} productId
 * @param {string} partnerId - Partner user ID
 * @returns {Promise<object>}
 */
async function resubmitProduct(productId, partnerId) {
  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const resubmittableStatuses = ['revision_required', 'rejected', 'draft'];
  if (!resubmittableStatuses.includes(product.status)) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot resubmit product with status '${product.status}'.`,
      400
    );
  }

  const updatedProduct = await productRepository.updateProduct(productId, {
    status: 'pending',
    rejection_reason: null,
  });

  return {
    product: updatedProduct,
    previousStatus: product.status,
    newStatus: 'pending',
    resubmittedBy: partnerId,
    resubmittedAt: new Date().toISOString(),
  };
}

/**
 * Deactivate an active product
 * @param {string} productId
 * @param {string} userId - User ID (admin or partner)
 * @param {string} reason - Deactivation reason
 * @returns {Promise<object>}
 */
async function deactivateProduct(productId, userId, reason = '') {
  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.status !== 'active') {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot deactivate product with status '${product.status}'. Only active products can be deactivated.`,
      400
    );
  }

  const updatedProduct = await productRepository.updateProduct(productId, {
    status: 'inactive',
  });

  // TODO: Remove from Elasticsearch index
  // await searchService.removeFromIndex(productId);

  return {
    product: updatedProduct,
    previousStatus: product.status,
    newStatus: 'inactive',
    deactivatedBy: userId,
    deactivatedAt: new Date().toISOString(),
    reason,
  };
}

/**
 * Reactivate an inactive product
 * @param {string} productId
 * @param {string} userId - User ID (admin or partner)
 * @returns {Promise<object>}
 */
async function reactivateProduct(productId, userId) {
  const product = await productRepository.findProductById(productId);
  
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  if (product.status !== 'inactive') {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot reactivate product with status '${product.status}'. Only inactive products can be reactivated.`,
      400
    );
  }

  const updatedProduct = await productRepository.updateProduct(productId, {
    status: 'active',
  });

  // TODO: Re-index in Elasticsearch
  // await searchService.indexProduct(updatedProduct);

  return {
    product: updatedProduct,
    previousStatus: product.status,
    newStatus: 'active',
    reactivatedBy: userId,
    reactivatedAt: new Date().toISOString(),
  };
}

/**
 * Check if status transition is valid
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {boolean}
 */
function isValidTransition(currentStatus, newStatus) {
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(newStatus);
}

/**
 * Get product approval history (placeholder)
 * @param {string} productId
 * @returns {Promise<object[]>}
 */
async function getApprovalHistory(productId) {
  // In production, this would query an approval_logs table
  return [];
}

module.exports = {
  getPendingProducts,
  approveProduct,
  rejectProduct,
  requestRevision,
  resubmitProduct,
  deactivateProduct,
  reactivateProduct,
  isValidTransition,
  getApprovalHistory,
  STATUS_TRANSITIONS,
  APPROVABLE_STATUSES,
  REJECTABLE_STATUSES,
};
