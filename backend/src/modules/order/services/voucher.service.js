/**
 * Voucher Service
 * Business logic for voucher validation and application
 */

const voucherRepository = require('../voucher.repository');
const orderDTO = require('../order.dto');
const { AppError } = require('../../../shared/utils/error.util');

/**
 * Validate voucher code
 */
async function validateVoucher(code, userId, orderTotal, shopId = null) {
  const voucher = await voucherRepository.findVoucherByCode(code);
  
  if (!voucher) {
    throw new AppError('VOUCHER_INVALID', 'Voucher code is invalid', 400);
  }
  
  // Check if voucher is active
  if (!voucher.is_active) {
    throw new AppError('VOUCHER_INVALID', 'Voucher is no longer active', 400);
  }
  
  // Check date validity
  const now = new Date();
  if (new Date(voucher.start_date) > now) {
    throw new AppError('VOUCHER_INVALID', 'Voucher is not yet valid', 400);
  }
  
  if (new Date(voucher.end_date) < now) {
    throw new AppError('VOUCHER_EXPIRED', 'Voucher has expired', 400);
  }
  
  // Check usage limit
  if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
    throw new AppError('VOUCHER_USAGE_LIMIT', 'Voucher usage limit reached', 400);
  }
  
  // Check per-user limit
  const userUsageCount = await voucherRepository.getUserVoucherUsage(voucher.id, userId);
  if (voucher.per_user_limit && userUsageCount >= voucher.per_user_limit) {
    throw new AppError('VOUCHER_USAGE_LIMIT', 'You have already used this voucher', 400);
  }
  
  // Check minimum order value
  if (voucher.min_order_value && orderTotal < parseFloat(voucher.min_order_value)) {
    throw new AppError('VOUCHER_MIN_ORDER', 
      `Minimum order value is ${voucher.min_order_value.toLocaleString()} VND`, 400);
  }
  
  // Check shop voucher scope
  if (voucher.type === 'shop' && voucher.shop_id !== shopId) {
    throw new AppError('VOUCHER_INVALID', 'This voucher is not valid for this shop', 400);
  }
  
  // Calculate discount
  const discount = calculateDiscount(voucher, orderTotal);
  
  return {
    voucher: orderDTO.serializeVoucher(voucher),
    discount,
    isValid: true,
  };
}

/**
 * Calculate discount amount
 */
function calculateDiscount(voucher, orderTotal) {
  let discount = 0;
  
  if (voucher.discount_type === 'percentage') {
    discount = orderTotal * (parseFloat(voucher.discount_value) / 100);
  } else {
    discount = parseFloat(voucher.discount_value);
  }
  
  // Apply max discount cap
  if (voucher.max_discount && discount > parseFloat(voucher.max_discount)) {
    discount = parseFloat(voucher.max_discount);
  }
  
  // Discount cannot exceed order total
  if (discount > orderTotal) {
    discount = orderTotal;
  }
  
  return Math.round(discount);
}


/**
 * Apply voucher to order
 */
async function applyVoucher(orderId, voucherId) {
  // Increment usage count
  await voucherRepository.incrementUsageCount(voucherId);
  
  // Record user usage
  await voucherRepository.recordUserUsage(voucherId, orderId);
}

/**
 * Restore voucher usage (on order cancellation)
 */
async function restoreVoucher(orderId) {
  // Get vouchers used in order
  const usages = await voucherRepository.getOrderVoucherUsages(orderId);
  
  for (const usage of usages) {
    // Decrement usage count
    await voucherRepository.decrementUsageCount(usage.voucher_id);
    
    // Remove user usage record
    await voucherRepository.removeUserUsage(usage.voucher_id, orderId);
  }
}

/**
 * Get available vouchers for user
 */
async function getAvailableVouchers(userId, orderTotal, shopId = null) {
  const vouchers = await voucherRepository.findAvailableVouchers(userId, orderTotal, shopId);
  
  return vouchers.map(voucher => ({
    ...orderDTO.serializeVoucher(voucher),
    estimatedDiscount: calculateDiscount(voucher, orderTotal),
  }));
}

/**
 * Get platform vouchers (public)
 */
async function getPlatformVouchers(userId = null) {
  const vouchers = await voucherRepository.getPlatformVouchers();
  
  // If user is logged in, check which vouchers they've collected
  const result = [];
  for (const voucher of vouchers) {
    const serialized = orderDTO.serializeVoucher(voucher);
    if (userId) {
      serialized.isCollected = await voucherRepository.hasUserCollectedVoucher(userId, voucher.id);
    }
    result.push(serialized);
  }
  
  return result;
}

/**
 * Get shop vouchers
 */
async function getShopVouchers(shopId, userId = null) {
  const vouchers = await voucherRepository.getShopVouchers(shopId);
  
  const result = [];
  for (const voucher of vouchers) {
    const serialized = orderDTO.serializeVoucher(voucher);
    if (userId) {
      serialized.isCollected = await voucherRepository.hasUserCollectedVoucher(userId, voucher.id);
    }
    result.push(serialized);
  }
  
  return result;
}

/**
 * Collect voucher to user's wallet
 */
async function collectVoucher(userId, code) {
  const voucher = await voucherRepository.findVoucherByCode(code);
  
  if (!voucher) {
    throw new AppError('VOUCHER_INVALID', 'Mã voucher không tồn tại', 400);
  }
  
  // Check if voucher is active
  if (!voucher.is_active) {
    throw new AppError('VOUCHER_INVALID', 'Voucher không còn hoạt động', 400);
  }
  
  // Check date validity
  const now = new Date();
  if (new Date(voucher.start_date) > now) {
    throw new AppError('VOUCHER_INVALID', 'Voucher chưa có hiệu lực', 400);
  }
  
  if (new Date(voucher.end_date) < now) {
    throw new AppError('VOUCHER_EXPIRED', 'Voucher đã hết hạn', 400);
  }
  
  // Check if already collected
  const alreadyCollected = await voucherRepository.hasUserCollectedVoucher(userId, voucher.id);
  if (alreadyCollected) {
    throw new AppError('VOUCHER_ALREADY_COLLECTED', 'Bạn đã lưu voucher này rồi', 400);
  }
  
  // Check usage limit
  if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
    throw new AppError('VOUCHER_USAGE_LIMIT', 'Voucher đã hết lượt sử dụng', 400);
  }
  
  await voucherRepository.collectVoucher(userId, voucher.id);
  
  return { success: true, message: 'Lưu voucher thành công' };
}

/**
 * Get user's collected vouchers (voucher wallet)
 */
async function getMyVouchers(userId, status = 'all') {
  const vouchers = await voucherRepository.getUserVouchers(userId, status);
  
  return vouchers.map(voucher => orderDTO.serializeVoucher(voucher));
}

module.exports = {
  validateVoucher,
  calculateDiscount,
  applyVoucher,
  restoreVoucher,
  getAvailableVouchers,
  getPlatformVouchers,
  getShopVouchers,
  collectVoucher,
  getMyVouchers,
};
