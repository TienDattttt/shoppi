/**
 * Partner Notification Triggers
 * Handles notifications for partner/shop-related events
 */

const notificationService = require('../notification.service');

// Notification types for partners
const PARTNER_NOTIFICATION_TYPES = {
  NEW_ORDER: 'partner_new_order',
  LOW_STOCK: 'partner_low_stock',
  PRODUCT_APPROVED: 'partner_product_approved',
  PRODUCT_REJECTED: 'partner_product_rejected',
  NEW_REVIEW: 'partner_new_review',
};

/**
 * Trigger notification when partner receives new order
 * @param {object} data - Order data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.order_id - Order ID
 * @param {number} data.total - Order total
 * @param {number} data.item_count - Number of items
 * @returns {Promise<object>} Created notification
 */
async function onNewOrder(data) {
  const { partner_id, order_id, total, item_count } = data;

  return notificationService.send(partner_id, PARTNER_NOTIFICATION_TYPES.NEW_ORDER, {
    title: 'Đơn hàng mới',
    body: `Bạn có đơn hàng mới với ${item_count} sản phẩm. Tổng: ${formatCurrency(total)}`,
    payload: {
      orderId: order_id,
      total,
      itemCount: item_count,
    },
  });
}

/**
 * Trigger notification when product stock is low
 * @param {object} data - Product data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.product_id - Product ID
 * @param {string} data.product_name - Product name
 * @param {number} data.current_stock - Current stock quantity
 * @param {number} data.threshold - Low stock threshold
 * @returns {Promise<object>} Created notification
 */
async function onLowStock(data) {
  const { partner_id, product_id, product_name, current_stock, threshold } = data;

  return notificationService.send(partner_id, PARTNER_NOTIFICATION_TYPES.LOW_STOCK, {
    title: 'Cảnh báo tồn kho thấp',
    body: `Sản phẩm "${product_name}" chỉ còn ${current_stock} đơn vị (ngưỡng: ${threshold}).`,
    payload: {
      productId: product_id,
      productName: product_name,
      currentStock: current_stock,
      threshold,
    },
  });
}

/**
 * Trigger notification when product is approved
 * @param {object} data - Product data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.product_id - Product ID
 * @param {string} data.product_name - Product name
 * @returns {Promise<object>} Created notification
 */
async function onProductApproved(data) {
  const { partner_id, product_id, product_name } = data;

  return notificationService.send(partner_id, PARTNER_NOTIFICATION_TYPES.PRODUCT_APPROVED, {
    title: 'Sản phẩm đã được duyệt',
    body: `Sản phẩm "${product_name}" đã được duyệt và hiển thị trên sàn.`,
    payload: {
      productId: product_id,
      productName: product_name,
      status: 'approved',
    },
  });
}

/**
 * Trigger notification when product is rejected
 * @param {object} data - Product data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.product_id - Product ID
 * @param {string} data.product_name - Product name
 * @param {string} [data.reason] - Rejection reason
 * @returns {Promise<object>} Created notification
 */
async function onProductRejected(data) {
  const { partner_id, product_id, product_name, reason } = data;

  return notificationService.send(partner_id, PARTNER_NOTIFICATION_TYPES.PRODUCT_REJECTED, {
    title: 'Sản phẩm bị từ chối',
    body: reason
      ? `Sản phẩm "${product_name}" bị từ chối. Lý do: ${reason}`
      : `Sản phẩm "${product_name}" bị từ chối. Vui lòng kiểm tra và cập nhật.`,
    payload: {
      productId: product_id,
      productName: product_name,
      status: 'rejected',
      reason: reason || null,
    },
  });
}

/**
 * Trigger notification when customer leaves a review
 * @param {object} data - Review data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.product_id - Product ID
 * @param {string} data.product_name - Product name
 * @param {number} data.rating - Review rating (1-5)
 * @param {string} [data.review_id] - Review ID
 * @returns {Promise<object>} Created notification
 */
async function onNewReview(data) {
  const { partner_id, product_id, product_name, rating, review_id } = data;

  const stars = '⭐'.repeat(rating);

  return notificationService.send(partner_id, PARTNER_NOTIFICATION_TYPES.NEW_REVIEW, {
    title: 'Đánh giá mới',
    body: `Sản phẩm "${product_name}" nhận được đánh giá ${stars} (${rating}/5).`,
    payload: {
      productId: product_id,
      productName: product_name,
      rating,
      reviewId: review_id || null,
    },
  });
}

/**
 * Format currency for display
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

module.exports = {
  PARTNER_NOTIFICATION_TYPES,
  onNewOrder,
  onLowStock,
  onProductApproved,
  onProductRejected,
  onNewReview,
};
