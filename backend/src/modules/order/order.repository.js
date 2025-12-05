/**
 * Order Repository
 * Database operations for orders, sub_orders, and order_items
 */

const { supabase } = require('../../shared/supabase/supabase.client');

/**
 * Generate unique order number
 */
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

// ==================== ORDER OPERATIONS ====================

/**
 * Create new order
 */
async function createOrder(orderData) {
  const orderNumber = generateOrderNumber();
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: orderData.userId,
      subtotal: orderData.subtotal,
      shipping_total: orderData.shippingTotal || 0,
      discount_total: orderData.discountTotal || 0,
      grand_total: orderData.grandTotal,
      status: 'pending_payment',
      payment_method: orderData.paymentMethod,
      payment_status: 'pending',
      shipping_address_id: orderData.shippingAddressId,
      shipping_name: orderData.shippingName,
      shipping_phone: orderData.shippingPhone,
      shipping_address: orderData.shippingAddress,
      platform_voucher_id: orderData.platformVoucherId,
      customer_note: orderData.customerNote,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Find order by ID
 */
async function findOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      sub_orders (
        *,
        order_items (*)
      )
    `)
    .eq('id', orderId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Find orders by user with filters
 */
async function findOrdersByUser(userId, filters = {}) {
  const { status, startDate, endDate, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;
  
  let query = supabase
    .from('orders')
    .select(`
      *,
      sub_orders (
        *,
        order_items (*)
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate);
  }
  
  query = query.range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    orders: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Update order status
 */
async function updateOrderStatus(orderId, status) {
  const updateData = { status, updated_at: new Date().toISOString() };
  
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update order payment status
 */
async function updatePaymentStatus(orderId, paymentStatus) {
  const updateData = { 
    payment_status: paymentStatus, 
    updated_at: new Date().toISOString() 
  };
  
  if (paymentStatus === 'paid') {
    updateData.paid_at = new Date().toISOString();
    updateData.status = 'confirmed';
  }
  
  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Cancel order
 */
async function cancelOrder(orderId, reason) {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();
  
  if (error) throw error;
  
  // Also cancel all sub-orders
  await supabase
    .from('sub_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('order_id', orderId);
  
  return data;
}

// ==================== SUB-ORDER OPERATIONS ====================

/**
 * Create sub-order
 */
async function createSubOrder(subOrderData) {
  const { data, error } = await supabase
    .from('sub_orders')
    .insert({
      order_id: subOrderData.orderId,
      shop_id: subOrderData.shopId,
      subtotal: subOrderData.subtotal,
      shipping_fee: subOrderData.shippingFee || 0,
      discount: subOrderData.discount || 0,
      total: subOrderData.total,
      status: 'pending',
      shop_voucher_id: subOrderData.shopVoucherId,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Find sub-order by ID
 */
async function findSubOrderById(subOrderId) {
  const { data, error } = await supabase
    .from('sub_orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('id', subOrderId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Find sub-orders by order ID
 */
async function findSubOrdersByOrderId(orderId) {
  const { data, error } = await supabase
    .from('sub_orders')
    .select(`
      *,
      order_items (*)
    `)
    .eq('order_id', orderId);
  
  if (error) throw error;
  return data || [];
}

/**
 * Find sub-orders by shop with filters
 */
async function findSubOrdersByShop(shopId, filters = {}) {
  const { status, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;
  
  let query = supabase
    .from('sub_orders')
    .select(`
      *,
      order_items (*),
      orders!inner (
        order_number,
        user_id,
        shipping_name,
        shipping_phone,
        shipping_address,
        payment_method,
        payment_status
      )
    `, { count: 'exact' })
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  query = query.range(offset, offset + limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return {
    orders: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Update sub-order status
 */
async function updateSubOrderStatus(subOrderId, status) {
  const { data, error } = await supabase
    .from('sub_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', subOrderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update sub-order for shipping
 */
async function updateSubOrderForShipping(subOrderId, shipperId) {
  const { data, error } = await supabase
    .from('sub_orders')
    .update({
      status: 'shipping',
      shipper_id: shipperId,
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subOrderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Mark sub-order as delivered
 */
async function markAsDelivered(subOrderId, proofOfDelivery) {
  const deliveredAt = new Date();
  const returnDeadline = new Date(deliveredAt);
  returnDeadline.setDate(returnDeadline.getDate() + 7); // 7 days return window
  
  const { data, error } = await supabase
    .from('sub_orders')
    .update({
      status: 'delivered',
      delivered_at: deliveredAt.toISOString(),
      return_deadline: returnDeadline.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subOrderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Cancel sub-order
 */
async function cancelSubOrder(subOrderId, reason) {
  const { data, error } = await supabase
    .from('sub_orders')
    .update({
      status: 'cancelled',
      partner_note: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subOrderId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ==================== ORDER ITEM OPERATIONS ====================

/**
 * Create order items
 */
async function createOrderItems(items) {
  const { data, error } = await supabase
    .from('order_items')
    .insert(items.map(item => ({
      sub_order_id: item.subOrderId,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      variant_name: item.variantName,
      sku: item.sku,
      unit_price: item.unitPrice,
      quantity: item.quantity,
      total_price: item.totalPrice,
      image_url: item.imageUrl,
    })))
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Find order items by sub-order ID
 */
async function findOrderItemsBySubOrderId(subOrderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('sub_order_id', subOrderId);
  
  if (error) throw error;
  return data || [];
}

module.exports = {
  // Order
  generateOrderNumber,
  createOrder,
  findOrderById,
  findOrdersByUser,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
  
  // SubOrder
  createSubOrder,
  findSubOrderById,
  findSubOrdersByOrderId,
  findSubOrdersByShop,
  updateSubOrderStatus,
  updateSubOrderForShipping,
  markAsDelivered,
  cancelSubOrder,
  
  // OrderItem
  createOrderItems,
  findOrderItemsBySubOrderId,
};
