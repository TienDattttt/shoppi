/**
 * Order DTOs (Data Transfer Objects)
 * Defines data structures for order operations and serialization
 */

/**
 * Serialize order object for API response
 * @param {object} order - Raw order object from database
 * @returns {object} Serialized order
 */
function serializeOrder(order) {
  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.order_number,
    userId: order.user_id,
    
    // Totals
    subtotal: parseFloat(order.subtotal) || 0,
    shippingTotal: parseFloat(order.shipping_total) || 0,
    discountTotal: parseFloat(order.discount_total) || 0,
    grandTotal: parseFloat(order.grand_total) || 0,
    
    // Status
    status: order.status,
    
    // Payment
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    paidAt: order.paid_at ? new Date(order.paid_at).toISOString() : null,
    
    // Shipping
    shippingAddressId: order.shipping_address_id,
    shippingName: order.shipping_name,
    shippingPhone: order.shipping_phone,
    shippingAddress: order.shipping_address,
    
    // Voucher
    platformVoucherId: order.platform_voucher_id,
    
    // Notes
    customerNote: order.customer_note,
    cancelReason: order.cancel_reason,
    
    // Timestamps
    createdAt: order.created_at ? new Date(order.created_at).toISOString() : null,
    updatedAt: order.updated_at ? new Date(order.updated_at).toISOString() : null,
    completedAt: order.completed_at ? new Date(order.completed_at).toISOString() : null,
    cancelledAt: order.cancelled_at ? new Date(order.cancelled_at).toISOString() : null,
    
    // Sub-orders
    subOrders: order.sub_orders ? order.sub_orders.map(serializeSubOrder) : [],
  };
}

/**
 * Deserialize order data from API request
 * @param {object} data - Order data from API request
 * @returns {object} Database-ready order object
 */
function deserializeOrder(data) {
  if (!data) return null;

  return {
    id: data.id,
    order_number: data.orderNumber,
    user_id: data.userId,
    subtotal: data.subtotal,
    shipping_total: data.shippingTotal,
    discount_total: data.discountTotal,
    grand_total: data.grandTotal,
    status: data.status,
    payment_method: data.paymentMethod,
    payment_status: data.paymentStatus,
    paid_at: data.paidAt,
    shipping_address_id: data.shippingAddressId,
    shipping_name: data.shippingName,
    shipping_phone: data.shippingPhone,
    shipping_address: data.shippingAddress,
    platform_voucher_id: data.platformVoucherId,
    customer_note: data.customerNote,
    cancel_reason: data.cancelReason,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
    completed_at: data.completedAt,
    cancelled_at: data.cancelledAt,
    sub_orders: data.subOrders ? data.subOrders.map(deserializeSubOrder) : [],
  };
}

/**
 * Serialize sub-order object for API response
 * @param {object} subOrder - Raw sub-order object from database
 * @returns {object} Serialized sub-order
 */
function serializeSubOrder(subOrder) {
  if (!subOrder) return null;

  return {
    id: subOrder.id,
    orderId: subOrder.order_id,
    shopId: subOrder.shop_id,
    
    // Totals
    subtotal: parseFloat(subOrder.subtotal) || 0,
    shippingFee: parseFloat(subOrder.shipping_fee) || 0,
    discount: parseFloat(subOrder.discount) || 0,
    total: parseFloat(subOrder.total) || 0,
    
    // Status
    status: subOrder.status,
    
    // Voucher
    shopVoucherId: subOrder.shop_voucher_id,
    
    // Shipping
    trackingNumber: subOrder.tracking_number,
    shipperId: subOrder.shipper_id,
    shippedAt: subOrder.shipped_at ? new Date(subOrder.shipped_at).toISOString() : null,
    deliveredAt: subOrder.delivered_at ? new Date(subOrder.delivered_at).toISOString() : null,
    
    // Return
    returnDeadline: subOrder.return_deadline ? new Date(subOrder.return_deadline).toISOString() : null,
    
    // Notes
    partnerNote: subOrder.partner_note,
    
    // Timestamps
    createdAt: subOrder.created_at ? new Date(subOrder.created_at).toISOString() : null,
    updatedAt: subOrder.updated_at ? new Date(subOrder.updated_at).toISOString() : null,
    
    // Items
    items: subOrder.order_items ? subOrder.order_items.map(serializeOrderItem) : [],
    
    // Parent order info (if joined)
    order: subOrder.orders ? {
      orderNumber: subOrder.orders.order_number,
      shippingName: subOrder.orders.shipping_name,
      shippingPhone: subOrder.orders.shipping_phone,
      shippingAddress: subOrder.orders.shipping_address,
      paymentMethod: subOrder.orders.payment_method,
      paymentStatus: subOrder.orders.payment_status,
    } : null,
    
    // Shop info (if joined)
    shops: subOrder.shops ? {
      id: subOrder.shops.id,
      shop_name: subOrder.shops.shop_name,
      logo_url: subOrder.shops.logo_url,
      partner_id: subOrder.shops.partner_id,
    } : null,
  };
}

/**
 * Deserialize sub-order data from API request
 * @param {object} data - Sub-order data from API request
 * @returns {object} Database-ready sub-order object
 */
function deserializeSubOrder(data) {
  if (!data) return null;

  return {
    id: data.id,
    order_id: data.orderId,
    shop_id: data.shopId,
    subtotal: data.subtotal,
    shipping_fee: data.shippingFee,
    discount: data.discount,
    total: data.total,
    status: data.status,
    shop_voucher_id: data.shopVoucherId,
    tracking_number: data.trackingNumber,
    shipper_id: data.shipperId,
    shipped_at: data.shippedAt,
    delivered_at: data.deliveredAt,
    return_deadline: data.returnDeadline,
    partner_note: data.partnerNote,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
    order_items: data.items ? data.items.map(deserializeOrderItem) : [],
  };
}

/**
 * Serialize order item for API response
 * @param {object} item - Raw order item from database
 * @returns {object} Serialized order item
 */
function serializeOrderItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    subOrderId: item.sub_order_id,
    productId: item.product_id,
    variantId: item.variant_id,
    productName: item.product_name,
    variantName: item.variant_name,
    sku: item.sku,
    unitPrice: parseFloat(item.unit_price) || 0,
    quantity: item.quantity,
    totalPrice: parseFloat(item.total_price) || 0,
    imageUrl: item.image_url,
    createdAt: item.created_at ? new Date(item.created_at).toISOString() : null,
  };
}

/**
 * Deserialize order item from API request
 * @param {object} data - Order item data from API request
 * @returns {object} Database-ready order item object
 */
function deserializeOrderItem(data) {
  if (!data) return null;

  return {
    id: data.id,
    sub_order_id: data.subOrderId,
    product_id: data.productId,
    variant_id: data.variantId,
    product_name: data.productName,
    variant_name: data.variantName,
    sku: data.sku,
    unit_price: data.unitPrice,
    quantity: data.quantity,
    total_price: data.totalPrice,
    image_url: data.imageUrl,
    created_at: data.createdAt,
  };
}

/**
 * Serialize cart for API response
 * @param {object} cart - Raw cart object from database
 * @returns {object} Serialized cart
 */
function serializeCart(cart) {
  if (!cart) return null;

  return {
    id: cart.id,
    userId: cart.user_id,
    updatedAt: cart.updated_at ? new Date(cart.updated_at).toISOString() : null,
    items: cart.cart_items ? cart.cart_items.map(serializeCartItem) : [],
  };
}

/**
 * Serialize cart item for API response
 * @param {object} item - Raw cart item from database
 * @returns {object} Serialized cart item
 */
function serializeCartItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    cartId: item.cart_id,
    productId: item.product_id,
    variantId: item.variant_id,
    quantity: item.quantity,
    isSelected: item.is_selected,
    isAvailable: item.is_available,
    createdAt: item.created_at ? new Date(item.created_at).toISOString() : null,
    updatedAt: item.updated_at ? new Date(item.updated_at).toISOString() : null,
    
    // Product info (if joined)
    product: item.products ? {
      id: item.products.id,
      name: item.products.name,
      slug: item.products.slug,
      shopId: item.products.shop_id,
      thumbnailUrl: item.products.thumbnail_url || null,
    } : null,
    
    // Variant info (if joined)
    variant: item.product_variants ? {
      id: item.product_variants.id,
      name: item.product_variants.name,
      sku: item.product_variants.sku,
      price: parseFloat(item.product_variants.price) || 0,
      compareAtPrice: item.product_variants.compare_at_price ? parseFloat(item.product_variants.compare_at_price) : null,
      stockQuantity: item.product_variants.quantity || 0,
      imageUrl: item.product_variants.image_url,
      attributes: item.product_variants.attributes,
    } : null,
  };
}

/**
 * Serialize voucher for API response
 * @param {object} voucher - Raw voucher object from database
 * @returns {object} Serialized voucher
 */
function serializeVoucher(voucher) {
  if (!voucher) return null;

  return {
    id: voucher.id,
    code: voucher.code,
    type: voucher.type,
    shopId: voucher.shop_id,
    discountType: voucher.discount_type,
    discountValue: parseFloat(voucher.discount_value) || 0,
    maxDiscount: voucher.max_discount ? parseFloat(voucher.max_discount) : null,
    minOrderValue: parseFloat(voucher.min_order_value) || 0,
    usageLimit: voucher.usage_limit,
    usedCount: voucher.used_count,
    perUserLimit: voucher.per_user_limit,
    startDate: voucher.start_date ? new Date(voucher.start_date).toISOString() : null,
    endDate: voucher.end_date ? new Date(voucher.end_date).toISOString() : null,
    isActive: voucher.is_active,
    createdAt: voucher.created_at ? new Date(voucher.created_at).toISOString() : null,
  };
}

/**
 * Serialize tracking event for API response
 * @param {object} event - Raw tracking event from database
 * @returns {object} Serialized tracking event
 */
function serializeTrackingEvent(event) {
  if (!event) return null;

  return {
    id: event.id,
    subOrderId: event.sub_order_id,
    eventType: event.event_type,
    description: event.description,
    location: event.location,
    createdBy: event.created_by,
    createdAt: event.created_at ? new Date(event.created_at).toISOString() : null,
  };
}

module.exports = {
  serializeOrder,
  deserializeOrder,
  serializeSubOrder,
  deserializeSubOrder,
  serializeOrderItem,
  deserializeOrderItem,
  serializeCart,
  serializeCartItem,
  serializeVoucher,
  serializeTrackingEvent,
};
