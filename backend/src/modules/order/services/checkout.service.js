/**
 * Checkout Service
 * Business logic for order creation and checkout process
 * 
 * Requirements: 12.1 - Create separate shipments for each shop in multi-shop orders
 */

const orderRepository = require('../order.repository');
const cartRepository = require('../cart.repository');
const voucherService = require('./voucher.service');
const shippingService = require('./shipping.service');
const unifiedShippingService = require('./shipping/unified-shipping.service');
const paymentService = require('./payment.service');
const orderDTO = require('../order.dto');
const { AppError } = require('../../../shared/utils/error.util');
const rabbitmq = require('../../../shared/rabbitmq/rabbitmq.client');
const notificationService = require('../../notification/notification.service');
const shipmentRepository = require('../../shipper/shipment.repository');

/**
 * Create order from cart items
 */
async function createOrder(userId, checkoutData) {
  const {
    cartItemIds,
    shippingAddressId,
    paymentMethod,
    platformVoucherCode,
    voucherCode, // Alias for platformVoucherCode
    shopVouchers,
    customerNote,
  } = checkoutData;
  
  // Use voucherCode as alias for platformVoucherCode
  const effectiveVoucherCode = platformVoucherCode || voucherCode;
  
  // Get cart items
  const cartItems = await cartRepository.findCartItemsByIds(cartItemIds, userId);
  
  if (cartItems.length === 0) {
    throw new AppError('CART_EMPTY', 'No valid cart items found', 400);
  }
  
  // Validate stock availability
  await validateStockAvailability(cartItems);
  
  // Group items by shop
  const itemsByShop = groupItemsByShop(cartItems);
  
  // Calculate totals
  const { subtotal, shippingTotal, discountTotal, grandTotal, shopTotals } = 
    await calculateOrderTotals(itemsByShop, shippingAddressId, effectiveVoucherCode, shopVouchers, userId);
  
  // Get shipping address details
  const shippingAddress = await getShippingAddress(shippingAddressId);
  
  // Create order
  const order = await orderRepository.createOrder({
    userId,
    subtotal,
    shippingTotal,
    discountTotal,
    grandTotal,
    paymentMethod,
    shippingAddressId,
    shippingName: shippingAddress.name,
    shippingPhone: shippingAddress.phone,
    shippingAddress: shippingAddress.fullAddress,
    platformVoucherId: null, // Will be set if voucher is valid
    customerNote,
  });
  
  // Create sub-orders for each shop
  for (const [shopId, shopItems] of Object.entries(itemsByShop)) {
    const shopTotal = shopTotals[shopId];
    
    const subOrder = await orderRepository.createSubOrder({
      orderId: order.id,
      shopId,
      subtotal: shopTotal.subtotal,
      shippingFee: shopTotal.shippingFee,
      discount: shopTotal.discount,
      total: shopTotal.total,
      shopVoucherId: shopTotal.voucherId,
    });
    
    // Create order items
    // Note: product_variants uses 'price' and 'compare_at_price' (not 'sale_price')
    const orderItems = shopItems.map(item => ({
      subOrderId: subOrder.id,
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.products?.name || 'Unknown Product',
      variantName: item.product_variants?.name || null,
      sku: item.product_variants?.sku || null,
      unitPrice: item.product_variants?.price || 0,
      quantity: item.quantity,
      totalPrice: (item.product_variants?.price || 0) * item.quantity,
      imageUrl: item.product_variants?.image_url || item.products?.thumbnail_url || null,
    }));
    
    await orderRepository.createOrderItems(orderItems);
    
    // Requirements: 12.1 - Create separate shipment for each shop
    // Create shipment for this sub-order with unique tracking number
    try {
      // Add order_id to subOrder for shipment creation
      const subOrderWithOrderId = { ...subOrder, order_id: order.id };
      await createShipmentForSubOrder(subOrderWithOrderId, shopId, shopTotal, shippingAddress, paymentMethod, shippingAddressId);
    } catch (shipmentError) {
      console.error(`[Checkout] Failed to create shipment for sub-order ${subOrder.id}:`, shipmentError.message);
      // Don't throw - order is created, shipment can be created later by partner
    }
  }
  
  // Reserve stock
  await reserveStock(cartItems);
  
  // Remove items from cart
  await cartRepository.removeCartItems(cartItemIds);
  
  // Handle payment
  const paymentResult = await paymentService.initiatePayment(order.id, paymentMethod);
  
  // Get full order with sub-orders
  const fullOrder = await orderRepository.findOrderById(order.id);
  
  // Publish ORDER_CREATED event via RabbitMQ
  try {
    const eventData = {
      orderId: fullOrder.id,
      userId: fullOrder.user_id,
      grandTotal: fullOrder.grand_total,
      paymentMethod: fullOrder.payment_method,
      subOrders: fullOrder.sub_orders?.map(so => ({
        id: so.id,
        shopId: so.shop_id,
        total: so.total,
      })) || [],
      createdAt: fullOrder.created_at,
    };
    
    console.log('[Checkout] Publishing order.created event:', { orderId: fullOrder.id });
    const published = await rabbitmq.publishOrderEvent('created', eventData);
    
    if (published) {
      console.log('[Checkout] Event published to RabbitMQ successfully');
    } else {
      // Fallback: Send notifications directly if RabbitMQ not available
      console.log('[Checkout] RabbitMQ not available, sending notifications directly');
      await sendOrderNotificationsDirect(fullOrder);
    }
  } catch (error) {
    console.error('[Checkout] Failed to publish ORDER_CREATED event:', error.message);
    // Fallback on error
    await sendOrderNotificationsDirect(fullOrder);
  }
  
  return {
    order: orderDTO.serializeOrder(fullOrder),
    payment: paymentResult,
  };
}


/**
 * Send order notifications directly (fallback when RabbitMQ not available)
 */
async function sendOrderNotificationsDirect(order) {
  const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
  
  try {
    // 1. Send notification to customer
    await notificationService.send(order.user_id, 'ORDER', {
      title: 'Đặt hàng thành công',
      body: `Đơn hàng #${order.id.substring(0, 8)} đã được tạo. Tổng: ${formatCurrency(order.grand_total)}`,
      payload: {
        orderId: order.id,
        total: order.grand_total,
      },
      sendPush: false,
    });
    console.log('[Checkout] Customer notification sent');
    
    // 2. Send notification to each partner
    for (const subOrder of (order.sub_orders || [])) {
      // Get partner ID from shop
      const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('partner_id')
        .eq('id', subOrder.shop_id)
        .single();
      
      if (shop?.partner_id) {
        await notificationService.send(shop.partner_id, 'ORDER', {
          title: 'Đơn hàng mới',
          body: `Bạn có đơn hàng mới #${order.id.substring(0, 8)}. Tổng: ${formatCurrency(subOrder.total)}`,
          payload: {
            orderId: order.id,
            subOrderId: subOrder.id,
            total: subOrder.total,
          },
          sendPush: false,
        });
        console.log('[Checkout] Partner notification sent to:', shop.partner_id);
      }
    }
  } catch (error) {
    console.error('[Checkout] Failed to send direct notifications:', error.message);
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Group cart items by shop
 */
function groupItemsByShop(items) {
  const grouped = {};
  
  for (const item of items) {
    const shopId = item.products?.shop_id || 'unknown';
    
    if (!grouped[shopId]) {
      grouped[shopId] = [];
    }
    
    grouped[shopId].push(item);
  }
  
  return grouped;
}

/**
 * Validate stock availability for all items
 */
async function validateStockAvailability(items) {
  for (const item of items) {
    const variant = item.product_variants;
    
    if (!variant) {
      throw new AppError('PRODUCT_NOT_FOUND', 
        `Product variant not found for item`, 400);
    }
    
    // Database uses 'quantity' column (not 'stock_quantity')
    const availableStock = variant.quantity || 0;
    
    if (availableStock < item.quantity) {
      throw new AppError('INSUFFICIENT_STOCK', 
        `Insufficient stock for ${item.products?.name || 'item'}. Available: ${availableStock}`, 400);
    }
  }
}

/**
 * Calculate order totals
 */
async function calculateOrderTotals(itemsByShop, shippingAddressId, platformVoucherCode, shopVouchers, userId) {
  let subtotal = 0;
  let shippingTotal = 0;
  let discountTotal = 0;
  const shopTotals = {};
  
  for (const [shopId, items] of Object.entries(itemsByShop)) {
    // Calculate shop subtotal
    // Note: product_variants uses 'price' column (not 'sale_price')
    const shopSubtotal = items.reduce((sum, item) => {
      const price = item.product_variants?.price || 0;
      return sum + (parseFloat(price) * item.quantity);
    }, 0);
    
    // Calculate shipping fee
    const shippingResult = await shippingService.calculateShippingFee(shopId, shippingAddressId, items);
    const shippingFee = shippingResult.fee || 0;
    
    // Calculate shop discount
    let shopDiscount = 0;
    let shopVoucherId = null;
    
    if (shopVouchers && shopVouchers[shopId]) {
      try {
        const validation = await voucherService.validateVoucher(
          shopVouchers[shopId], userId, shopSubtotal, shopId
        );
        shopDiscount = validation.discount;
        shopVoucherId = validation.voucher.id;
      } catch (error) {
        // Voucher invalid, continue without discount
      }
    }
    
    shopTotals[shopId] = {
      subtotal: shopSubtotal,
      shippingFee,
      discount: shopDiscount,
      total: shopSubtotal + shippingFee - shopDiscount,
      voucherId: shopVoucherId,
    };
    
    subtotal += shopSubtotal;
    shippingTotal += shippingFee;
    discountTotal += shopDiscount;
  }
  
  // Apply platform voucher
  if (platformVoucherCode) {
    try {
      const validation = await voucherService.validateVoucher(
        platformVoucherCode, userId, subtotal
      );
      discountTotal += validation.discount;
    } catch (error) {
      // Platform voucher invalid, continue without discount
    }
  }
  
  const grandTotal = subtotal + shippingTotal - discountTotal;
  
  return { subtotal, shippingTotal, discountTotal, grandTotal, shopTotals };
}

/**
 * Reserve stock for order items
 */
async function reserveStock(items) {
  // Would update product_variants.reserved_quantity
  // Placeholder - actual implementation would use database transaction
}

/**
 * Get shipping address details from database
 */
async function getShippingAddress(addressId) {
  const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
  
  // Try to fetch from database
  const { data, error } = await supabaseAdmin
    .from('user_addresses')
    .select('*')
    .eq('id', addressId)
    .single();
  
  if (data) {
    return {
      name: data.name,
      phone: data.phone,
      fullAddress: data.full_address || data.address_line,
    };
  }
  
  // Fallback for legacy mock IDs
  const mockAddresses = {
    'addr-1': {
      name: 'Nguyễn Văn A',
      phone: '0912345678',
      fullAddress: 'Số 1, Đại Cồ Việt, Hai Bà Trưng, Hà Nội',
    },
    'addr-2': {
      name: 'Nguyễn Văn A',
      phone: '0987654321',
      fullAddress: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    },
  };
  
  return mockAddresses[addressId] || {
    name: 'Khách hàng',
    phone: '0123456789',
    fullAddress: 'Địa chỉ giao hàng',
  };
}

/**
 * Create shipment for a sub-order
 * Requirements: 12.1 - Create separate shipment per shop with unique tracking number
 * 
 * @param {Object} subOrder - Sub-order data
 * @param {string} shopId - Shop ID
 * @param {Object} shopTotal - Shop totals (subtotal, shippingFee, etc.)
 * @param {Object} shippingAddress - Delivery address
 * @param {string} paymentMethod - Payment method (for COD calculation)
 * @param {string} shippingAddressId - Shipping address ID for coordinates lookup
 */
async function createShipmentForSubOrder(subOrder, shopId, shopTotal, shippingAddress, paymentMethod, shippingAddressId) {
  const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
  
  // Get shop details for pickup address
  const { data: shop, error: shopError } = await supabaseAdmin
    .from('shops')
    .select('id, shop_name, address, city, district, ward, lat, lng, phone')
    .eq('id', shopId)
    .single();
  
  if (shopError || !shop) {
    console.warn(`[Checkout] Shop not found for shipment creation: ${shopId}`);
    return null;
  }
  
  // Get delivery address coordinates if available
  let deliveryLat = null;
  let deliveryLng = null;
  
  if (shippingAddressId) {
    const { data: address } = await supabaseAdmin
      .from('user_addresses')
      .select('lat, lng')
      .eq('id', shippingAddressId)
      .single();
    
    if (address) {
      deliveryLat = address.lat;
      deliveryLng = address.lng;
    }
  }
  
  // Calculate COD amount (if payment method is COD)
  const codAmount = paymentMethod === 'cod' ? parseFloat(shopTotal.total) : 0;
  
  // Build pickup address string
  const pickupAddress = shop.address || 
    [shop.ward, shop.district, shop.city].filter(Boolean).join(', ') ||
    'Shop address';
  
  // Create shipment data
  const shipmentData = {
    sub_order_id: subOrder.id,
    
    // Pickup (Shop)
    pickup_address: pickupAddress,
    pickup_lat: shop.lat,
    pickup_lng: shop.lng,
    pickup_contact_name: shop.shop_name,
    pickup_contact_phone: shop.phone,
    
    // Delivery (Customer)
    delivery_address: shippingAddress.fullAddress,
    delivery_lat: deliveryLat,
    delivery_lng: deliveryLng,
    delivery_contact_name: shippingAddress.name,
    delivery_contact_phone: shippingAddress.phone,
    
    // Fees
    shipping_fee: shopTotal.shippingFee || 0,
    cod_amount: codAmount,
    
    // Status - created but waiting for partner to mark ready to ship
    status: 'created',
  };
  
  // Create shipment with unique tracking number
  const shipment = await shipmentRepository.createShipment(shipmentData);
  
  console.log(`[Checkout] Created shipment ${shipment.id} with tracking ${shipment.tracking_number} for sub-order ${subOrder.id}`);
  
  // Publish shipment created event
  try {
    await rabbitmq.publishToExchange(
      rabbitmq.EXCHANGES.EVENTS,
      'shipment.created',
      {
        event: 'SHIPMENT_CREATED',
        shipmentId: shipment.id,
        subOrderId: subOrder.id,
        orderId: subOrder.order_id,
        trackingNumber: shipment.tracking_number,
        shopId: shopId,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (e) {
    console.error('[Checkout] Failed to publish shipment event:', e.message);
  }
  
  return shipment;
}

/**
 * Get shipping options for checkout
 * Uses unified shipping service to aggregate fees from all providers
 * 
 * Feature: shipping-provider-integration
 * Requirements: 2.1, 2.4
 */
async function getShippingOptions(shopId, deliveryAddress, items, codAmount = 0) {
  // Get shop pickup address (placeholder - would fetch from shop settings)
  const pickupAddress = {
    province: 'Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    address: '123 Nguyễn Huệ',
    name: 'Shop Name',
    phone: '0901234567',
  };

  // Get delivery address details
  const delivery = {
    province: deliveryAddress.province || 'Hồ Chí Minh',
    district: deliveryAddress.district || 'Quận 3',
    ward: deliveryAddress.ward || 'Phường 1',
    address: deliveryAddress.address || '',
    name: deliveryAddress.name || '',
    phone: deliveryAddress.phone || '',
  };

  // Get shipping options from unified service
  const { options, errors } = await unifiedShippingService.getShippingOptions(
    shopId,
    pickupAddress,
    delivery,
    items,
    codAmount
  );

  return {
    options: options.map(opt => ({
      provider: opt.provider,
      providerName: opt.providerName,
      fee: opt.fee,
      estimatedDays: opt.estimatedDays,
      serviceName: opt.serviceName,
    })),
    errors,
  };
}

/**
 * Create external shipment after order confirmation
 * 
 * Feature: shipping-provider-integration
 * Requirements: 3.1, 3.3
 */
async function createExternalShipment(subOrderId, providerCode, orderData) {
  try {
    const result = await unifiedShippingService.createShippingOrder(
      subOrderId,
      providerCode,
      orderData
    );

    return result;
  } catch (error) {
    console.error(`Failed to create external shipment for ${subOrderId}:`, error.message);
    // Don't throw - order can still proceed with manual shipping assignment
    return null;
  }
}

module.exports = {
  createOrder,
  groupItemsByShop,
  validateStockAvailability,
  calculateOrderTotals,
  reserveStock,
  getShippingAddress,
  getShippingOptions,
  createExternalShipment,
};
