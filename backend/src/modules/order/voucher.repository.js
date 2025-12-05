/**
 * Voucher Repository
 * Database operations for vouchers
 */

const { supabase } = require('../../shared/supabase/supabase.client');

/**
 * Find voucher by code
 */
async function findVoucherByCode(code) {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Find voucher by ID
 */
async function findVoucherById(voucherId) {
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('id', voucherId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Get user's voucher usage count
 */
async function getUserVoucherUsage(voucherId, userId) {
  const { count, error } = await supabase
    .from('voucher_usages')
    .select('*', { count: 'exact', head: true })
    .eq('voucher_id', voucherId)
    .eq('user_id', userId);
  
  if (error) throw error;
  return count || 0;
}

/**
 * Increment voucher usage count
 */
async function incrementUsageCount(voucherId) {
  const { error } = await supabase.rpc('increment_voucher_usage', {
    voucher_id: voucherId,
  });
  
  if (error) throw error;
}


/**
 * Decrement voucher usage count
 */
async function decrementUsageCount(voucherId) {
  const { error } = await supabase.rpc('decrement_voucher_usage', {
    voucher_id: voucherId,
  });
  
  if (error) throw error;
}

/**
 * Record user voucher usage
 */
async function recordUserUsage(voucherId, orderId, userId) {
  const { error } = await supabase
    .from('voucher_usages')
    .insert({
      voucher_id: voucherId,
      order_id: orderId,
      user_id: userId,
    });
  
  if (error) throw error;
}

/**
 * Remove user voucher usage
 */
async function removeUserUsage(voucherId, orderId) {
  const { error } = await supabase
    .from('voucher_usages')
    .delete()
    .eq('voucher_id', voucherId)
    .eq('order_id', orderId);
  
  if (error) throw error;
}

/**
 * Get order voucher usages
 */
async function getOrderVoucherUsages(orderId) {
  const { data, error } = await supabase
    .from('voucher_usages')
    .select('*')
    .eq('order_id', orderId);
  
  if (error) throw error;
  return data || [];
}

/**
 * Find available vouchers for user
 */
async function findAvailableVouchers(userId, orderTotal, shopId = null) {
  const now = new Date().toISOString();
  
  let query = supabase
    .from('vouchers')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .lte('min_order_value', orderTotal);
  
  if (shopId) {
    // Get shop vouchers
    query = query.or(`type.eq.platform,and(type.eq.shop,shop_id.eq.${shopId})`);
  } else {
    // Get platform vouchers only
    query = query.eq('type', 'platform');
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Filter by usage limits
  const availableVouchers = [];
  for (const voucher of data || []) {
    // Check global usage limit
    if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
      continue;
    }
    
    // Check per-user limit
    const userUsage = await getUserVoucherUsage(voucher.id, userId);
    if (voucher.per_user_limit && userUsage >= voucher.per_user_limit) {
      continue;
    }
    
    availableVouchers.push(voucher);
  }
  
  return availableVouchers;
}

/**
 * Create voucher
 */
async function createVoucher(voucherData) {
  const { data, error } = await supabase
    .from('vouchers')
    .insert({
      code: voucherData.code.toUpperCase(),
      type: voucherData.type,
      shop_id: voucherData.shopId,
      discount_type: voucherData.discountType,
      discount_value: voucherData.discountValue,
      max_discount: voucherData.maxDiscount,
      min_order_value: voucherData.minOrderValue || 0,
      usage_limit: voucherData.usageLimit,
      per_user_limit: voucherData.perUserLimit || 1,
      start_date: voucherData.startDate,
      end_date: voucherData.endDate,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

module.exports = {
  findVoucherByCode,
  findVoucherById,
  getUserVoucherUsage,
  incrementUsageCount,
  decrementUsageCount,
  recordUserUsage,
  removeUserUsage,
  getOrderVoucherUsages,
  findAvailableVouchers,
  createVoucher,
};
