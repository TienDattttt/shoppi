/**
 * Promotional Notification Triggers
 * Handles notifications for marketing and promotional events
 */

const notificationService = require('../notification.service');

// Notification types for promotions
const PROMO_NOTIFICATION_TYPES = {
  FLASH_SALE: 'promo_flash_sale',
  PRICE_DROP: 'promo_price_drop',
  NEW_VOUCHER: 'promo_new_voucher',
  WISHLIST_SALE: 'promo_wishlist_sale',
};

/**
 * Trigger notification when flash sale starts
 * @param {object} data - Flash sale data
 * @param {string[]} data.user_ids - Array of user IDs to notify
 * @param {string} data.sale_name - Sale name
 * @param {string} [data.sale_id] - Sale ID
 * @param {number} [data.discount_percent] - Discount percentage
 * @param {Date|string} [data.end_time] - Sale end time
 * @returns {Promise<object>} Bulk notification result
 */
async function onFlashSaleStart(data) {
  const { user_ids, sale_name, sale_id, discount_percent, end_time } = data;

  if (!user_ids || user_ids.length === 0) {
    return { notifications: [], pushResult: { success: true, successCount: 0 } };
  }

  const discountText = discount_percent ? `Giảm đến ${discount_percent}%!` : '';

  return notificationService.sendBulk(user_ids, PROMO_NOTIFICATION_TYPES.FLASH_SALE, {
    title: '🔥 Flash Sale đang diễn ra!',
    body: `${sale_name} ${discountText}`.trim(),
    payload: {
      saleId: sale_id || null,
      saleName: sale_name,
      discountPercent: discount_percent || null,
      endTime: end_time ? new Date(end_time).toISOString() : null,
    },
  });
}

/**
 * Trigger notification when price drops on wishlist item
 * @param {object} data - Price drop data
 * @param {string} data.user_id - User ID
 * @param {string} data.product_id - Product ID
 * @param {string} data.product_name - Product name
 * @param {number} data.old_price - Previous price
 * @param {number} data.new_price - New price
 * @returns {Promise<object>} Created notification
 */
async function onPriceDrop(data) {
  const { user_id, product_id, product_name, old_price, new_price } = data;

  const discount = Math.round(((old_price - new_price) / old_price) * 100);

  return notificationService.send(user_id, PROMO_NOTIFICATION_TYPES.PRICE_DROP, {
    title: '💰 Giảm giá sản phẩm yêu thích!',
    body: `"${product_name}" giảm ${discount}%! Từ ${formatCurrency(old_price)} còn ${formatCurrency(new_price)}.`,
    payload: {
      productId: product_id,
      productName: product_name,
      oldPrice: old_price,
      newPrice: new_price,
      discountPercent: discount,
    },
  });
}

/**
 * Trigger notification when new voucher is available
 * @param {object} data - Voucher data
 * @param {string[]} data.user_ids - Array of eligible user IDs
 * @param {string} data.voucher_code - Voucher code
 * @param {string} [data.voucher_id] - Voucher ID
 * @param {number} [data.discount_value] - Discount value
 * @param {string} [data.discount_type] - 'percent' or 'fixed'
 * @param {Date|string} [data.expiry_date] - Voucher expiry date
 * @returns {Promise<object>} Bulk notification result
 */
async function onNewVoucher(data) {
  const { user_ids, voucher_code, voucher_id, discount_value, discount_type, expiry_date } = data;

  if (!user_ids || user_ids.length === 0) {
    return { notifications: [], pushResult: { success: true, successCount: 0 } };
  }

  let discountText = '';
  if (discount_value) {
    discountText = discount_type === 'percent'
      ? `Giảm ${discount_value}%`
      : `Giảm ${formatCurrency(discount_value)}`;
  }

  return notificationService.sendBulk(user_ids, PROMO_NOTIFICATION_TYPES.NEW_VOUCHER, {
    title: '🎁 Voucher mới dành cho bạn!',
    body: `Mã: ${voucher_code}. ${discountText}`.trim(),
    payload: {
      voucherId: voucher_id || null,
      voucherCode: voucher_code,
      discountValue: discount_value || null,
      discountType: discount_type || null,
      expiryDate: expiry_date ? new Date(expiry_date).toISOString() : null,
    },
  });
}

/**
 * Trigger notification when wishlist item goes on sale
 * @param {object} data - Sale data
 * @param {string} data.user_id - User ID
 * @param {string} data.product_id - Product ID
 * @param {string} data.product_name - Product name
 * @param {number} data.sale_price - Sale price
 * @param {number} data.original_price - Original price
 * @returns {Promise<object>} Created notification
 */
async function onWishlistItemOnSale(data) {
  const { user_id, product_id, product_name, sale_price, original_price } = data;

  const discount = Math.round(((original_price - sale_price) / original_price) * 100);

  return notificationService.send(user_id, PROMO_NOTIFICATION_TYPES.WISHLIST_SALE, {
    title: '❤️ Sản phẩm yêu thích đang giảm giá!',
    body: `"${product_name}" đang giảm ${discount}%! Chỉ còn ${formatCurrency(sale_price)}.`,
    payload: {
      productId: product_id,
      productName: product_name,
      salePrice: sale_price,
      originalPrice: original_price,
      discountPercent: discount,
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
  PROMO_NOTIFICATION_TYPES,
  onFlashSaleStart,
  onPriceDrop,
  onNewVoucher,
  onWishlistItemOnSale,
};
