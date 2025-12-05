/**
 * Shop Notification Triggers
 * Handles notifications for shop-related events
 * 
 * Requirements: 2.2, 2.3, 5.4, 8.2
 */

const notificationService = require('../notification.service');

// Notification types for shop events
const SHOP_NOTIFICATION_TYPES = {
  // Partner notifications (Requirements 2.2, 2.3)
  SHOP_APPROVED: 'shop_approved',
  SHOP_REJECTED: 'shop_rejected',
  SHOP_REVISION_REQUIRED: 'shop_revision_required',
  
  // Follower notifications (Requirement 5.4)
  NEW_PRODUCT: 'shop_new_product',
  NEW_PROMOTION: 'shop_new_promotion',
  
  // Review notifications (Requirement 8.2)
  REVIEW_REPLY: 'review_reply',
};

// ============================================
// PARTNER NOTIFICATIONS (Requirements 2.2, 2.3)
// ============================================

/**
 * Trigger notification when shop is approved
 * @param {object} data - Shop data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.shop_id - Shop ID
 * @param {string} data.shop_name - Shop name
 * @returns {Promise<object>} Created notification
 * 
 * Requirement 2.2: WHEN Admin approves a Shop THEN the Shop_System SHALL 
 * change status to 'active' and notify Partner via email and SMS
 */
async function onShopApproved(data) {
  const { partner_id, shop_id, shop_name } = data;

  return notificationService.send(partner_id, SHOP_NOTIFICATION_TYPES.SHOP_APPROVED, {
    title: 'Shop đã được duyệt',
    body: `Chúc mừng! Shop "${shop_name}" của bạn đã được duyệt và hiển thị trên sàn.`,
    payload: {
      shopId: shop_id,
      shopName: shop_name,
      status: 'active',
    },
  });
}

/**
 * Trigger notification when shop is rejected
 * @param {object} data - Shop data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.shop_id - Shop ID
 * @param {string} data.shop_name - Shop name
 * @param {string} data.reason - Rejection reason
 * @returns {Promise<object>} Created notification
 * 
 * Requirement 2.3: WHEN Admin rejects a Shop THEN the Shop_System SHALL 
 * change status to 'rejected' and notify Partner with rejection reason
 */
async function onShopRejected(data) {
  const { partner_id, shop_id, shop_name, reason } = data;

  return notificationService.send(partner_id, SHOP_NOTIFICATION_TYPES.SHOP_REJECTED, {
    title: 'Shop bị từ chối',
    body: `Shop "${shop_name}" đã bị từ chối. Lý do: ${reason}`,
    payload: {
      shopId: shop_id,
      shopName: shop_name,
      status: 'rejected',
      reason,
    },
  });
}

/**
 * Trigger notification when shop requires revision
 * @param {object} data - Shop data
 * @param {string} data.partner_id - Partner user ID
 * @param {string} data.shop_id - Shop ID
 * @param {string} data.shop_name - Shop name
 * @param {string} data.required_changes - Required changes description
 * @returns {Promise<object>} Created notification
 */
async function onShopRevisionRequired(data) {
  const { partner_id, shop_id, shop_name, required_changes } = data;

  return notificationService.send(partner_id, SHOP_NOTIFICATION_TYPES.SHOP_REVISION_REQUIRED, {
    title: 'Shop cần chỉnh sửa',
    body: `Shop "${shop_name}" cần chỉnh sửa. Vui lòng xem chi tiết và cập nhật.`,
    payload: {
      shopId: shop_id,
      shopName: shop_name,
      status: 'revision_required',
      requiredChanges: required_changes,
    },
  });
}

// ============================================
// FOLLOWER NOTIFICATIONS (Requirement 5.4)
// ============================================

/**
 * Trigger notification to followers when shop adds new product
 * @param {object} data - Product data
 * @param {string} data.shop_id - Shop ID
 * @param {string} data.shop_name - Shop name
 * @param {string} data.product_id - Product ID
 * @param {string} data.product_name - Product name
 * @param {string[]} data.follower_ids - Array of follower user IDs
 * @returns {Promise<object>} Bulk notification result
 * 
 * Requirement 5.4: WHEN a followed Shop adds new product or promotion THEN 
 * the Shop_System SHALL notify following Customers
 */
async function onNewProduct(data) {
  const { shop_id, shop_name, product_id, product_name, follower_ids } = data;

  if (!follower_ids || follower_ids.length === 0) {
    return { notifications: [], pushResult: { success: true, successCount: 0, failureCount: 0 } };
  }

  return notificationService.sendBulk(follower_ids, SHOP_NOTIFICATION_TYPES.NEW_PRODUCT, {
    title: `${shop_name} có sản phẩm mới`,
    body: `Shop ${shop_name} vừa thêm sản phẩm mới: "${product_name}". Xem ngay!`,
    payload: {
      shopId: shop_id,
      shopName: shop_name,
      productId: product_id,
      productName: product_name,
    },
  });
}

/**
 * Trigger notification to followers when shop creates new promotion
 * @param {object} data - Promotion data
 * @param {string} data.shop_id - Shop ID
 * @param {string} data.shop_name - Shop name
 * @param {string} data.promotion_id - Promotion ID
 * @param {string} data.promotion_title - Promotion title
 * @param {string} [data.discount_text] - Discount description
 * @param {string[]} data.follower_ids - Array of follower user IDs
 * @returns {Promise<object>} Bulk notification result
 * 
 * Requirement 5.4: WHEN a followed Shop adds new product or promotion THEN 
 * the Shop_System SHALL notify following Customers
 */
async function onNewPromotion(data) {
  const { shop_id, shop_name, promotion_id, promotion_title, discount_text, follower_ids } = data;

  if (!follower_ids || follower_ids.length === 0) {
    return { notifications: [], pushResult: { success: true, successCount: 0, failureCount: 0 } };
  }

  const body = discount_text
    ? `Shop ${shop_name} có khuyến mãi mới: ${promotion_title} - ${discount_text}`
    : `Shop ${shop_name} có khuyến mãi mới: ${promotion_title}. Xem ngay!`;

  return notificationService.sendBulk(follower_ids, SHOP_NOTIFICATION_TYPES.NEW_PROMOTION, {
    title: `${shop_name} có khuyến mãi mới`,
    body,
    payload: {
      shopId: shop_id,
      shopName: shop_name,
      promotionId: promotion_id,
      promotionTitle: promotion_title,
      discountText: discount_text || null,
    },
  });
}

// ============================================
// REVIEW NOTIFICATIONS (Requirement 8.2)
// ============================================

/**
 * Trigger notification when partner responds to a review
 * @param {object} data - Review reply data
 * @param {string} data.customer_id - Customer user ID (review author)
 * @param {string} data.review_id - Review ID
 * @param {string} data.product_name - Product name
 * @param {string} data.shop_name - Shop name
 * @returns {Promise<object>} Created notification
 * 
 * Requirement 8.2: WHEN a Partner responds THEN the Shop_System SHALL 
 * notify the Customer who wrote the review
 */
async function onReviewReply(data) {
  const { customer_id, review_id, product_name, shop_name } = data;

  return notificationService.send(customer_id, SHOP_NOTIFICATION_TYPES.REVIEW_REPLY, {
    title: 'Phản hồi đánh giá',
    body: `Shop ${shop_name} đã phản hồi đánh giá của bạn về sản phẩm "${product_name}".`,
    payload: {
      reviewId: review_id,
      productName: product_name,
      shopName: shop_name,
    },
  });
}

module.exports = {
  SHOP_NOTIFICATION_TYPES,
  
  // Partner notifications
  onShopApproved,
  onShopRejected,
  onShopRevisionRequired,
  
  // Follower notifications
  onNewProduct,
  onNewPromotion,
  
  // Review notifications
  onReviewReply,
};
