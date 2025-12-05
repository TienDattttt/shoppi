/**
 * Checkout Service
 * Business logic for order creation and checkout process
 */

const orderRepository = require('../order.repository');
const cartRepository = require('../cart.repository');
const voucherService = require('./voucher.service');
const shippingService = require('./shipping.service');
const paymentService = require('./payment.service');
const orderDTO = require('../order.dto');
const { AppError } = require('../../../shared/utils/error.util');
const rabbitmq = require('../../../shared/rabbitmq/rabbitmq.client');

/**
 * Create order from cart items
 */
async function createOrder(userId, checkoutData) {
  const {
    cartItemIds,
    shippingAddressId,
    paymentMethod,
    platformVoucherCode,
    shopVouchers,
    customerNote,
  } = checkoutData;
  
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
    await calculateOrderTotals(itemsByShop, shippingAddressId, platformVoucherCode, shopVouchers, userId);
  
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
    const orderItems = shopItems.map(item => ({
      subOrderId: subOrder.id,
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.products?.name || 'Unknown Product',
      variantName: item.product_variants?.name || null,
      sku: item.product_variants?.sku || null,
      unitPrice: item.product_variants?.sale_price || item.product_variants?.price || 0,
      quantity: item.quantity,
      totalPrice: (item.product_variants?.sale_price || item.product_variants?.price || 0) * item.quantity,
      imageUrl: item.product_variants?.image_url || item.products?.thumbnail_url || null,
    }));
    
    await orderRepository.createOrderItems(orderItems);
  }
  
  // Reserve stock
  await reserveStock(cartItems);
  
  // Remove items from cart
  await cartRepository.removeCartItems(cartItemIds);
  
  // Handle payment
  const paymentResult = await paymentService.initiatePayment(order.id, paymentMethod);
  
  // Get full order with sub-orders
  const fullOrder = await orderRepository.findOrderById(order.id);
  
  // Publish ORDER_CREATED event
  try {
    await rabbitmq.publishOrderEvent('created', {
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
    });
  } catch (error) {
    console.error('Failed to publish ORDER_CREATED event:', error.message);
  }
  
  return {
    order: orderDTO.serializeOrder(fullOrder),
    payment: paymentResult,
  };
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
    
    if (variant.stock_quantity < item.quantity) {
      throw new AppError('INSUFFICIENT_STOCK', 
        `Insufficient stock for ${item.products?.name || 'item'}. Available: ${variant.stock_quantity}`, 400);
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
    const shopSubtotal = items.reduce((sum, item) => {
      const price = item.product_variants?.sale_price || item.product_variants?.price || 0;
      return sum + (parseFloat(price) * item.quantity);
    }, 0);
    
    // Calculate shipping fee
    const shippingFee = await shippingService.calculateShippingFee(shopId, shippingAddressId, items);
    
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
 * Get shipping address details
 */
async function getShippingAddress(addressId) {
  // Would fetch from user addresses table
  // Placeholder
  return {
    name: 'Customer Name',
    phone: '0123456789',
    fullAddress: '123 Street, District, City',
  };
}

module.exports = {
  createOrder,
  groupItemsByShop,
  validateStockAvailability,
  calculateOrderTotals,
  reserveStock,
  getShippingAddress,
};
