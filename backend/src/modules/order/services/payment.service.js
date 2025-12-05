/**
 * Payment Service
 * Business logic for payment processing
 */

const orderRepository = require('../order.repository');
const { AppError } = require('../../../shared/utils/error.util');

// Payment method constants
const PAYMENT_METHODS = {
  COD: 'cod',
  VNPAY: 'vnpay',
  MOMO: 'momo',
  WALLET: 'wallet',
};

/**
 * Initiate payment for order
 */
async function initiatePayment(orderId, method) {
  const order = await orderRepository.findOrderById(orderId);
  
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  switch (method) {
    case PAYMENT_METHODS.COD:
      return handleCODPayment(order);
    case PAYMENT_METHODS.VNPAY:
      return createVNPayPayment(order);
    case PAYMENT_METHODS.MOMO:
      return createMoMoPayment(order);
    case PAYMENT_METHODS.WALLET:
      return handleWalletPayment(order);
    default:
      throw new AppError('INVALID_PAYMENT_METHOD', 'Invalid payment method', 400);
  }
}

/**
 * Handle COD payment
 */
async function handleCODPayment(order) {
  // For COD, confirm order immediately
  await orderRepository.updateOrderStatus(order.id, 'confirmed');
  
  // Update sub-orders to pending (waiting for partner confirmation)
  const subOrders = await orderRepository.findSubOrdersByOrderId(order.id);
  for (const subOrder of subOrders) {
    await orderRepository.updateSubOrderStatus(subOrder.id, 'pending');
  }
  
  return {
    method: PAYMENT_METHODS.COD,
    status: 'pending',
    message: 'Order confirmed. Payment will be collected on delivery.',
  };
}

/**
 * Create VNPay payment URL
 */
async function createVNPayPayment(order) {
  // VNPay integration placeholder
  const vnpayUrl = generateVNPayUrl(order);
  
  return {
    method: PAYMENT_METHODS.VNPAY,
    status: 'pending',
    paymentUrl: vnpayUrl,
    message: 'Redirect to VNPay to complete payment',
  };
}


/**
 * Generate VNPay payment URL
 */
function generateVNPayUrl(order) {
  // VNPay URL generation placeholder
  // Would use VNPay SDK/API
  const baseUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const params = new URLSearchParams({
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'DEMO',
    vnp_Amount: Math.round(order.grand_total * 100),
    vnp_OrderInfo: `Payment for order ${order.order_number}`,
    vnp_TxnRef: order.id,
    vnp_ReturnUrl: `${process.env.APP_URL}/api/payments/callback/vnpay`,
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Create MoMo payment
 */
async function createMoMoPayment(order) {
  // MoMo integration placeholder
  const momoUrl = generateMoMoUrl(order);
  
  return {
    method: PAYMENT_METHODS.MOMO,
    status: 'pending',
    paymentUrl: momoUrl,
    message: 'Redirect to MoMo to complete payment',
  };
}

/**
 * Generate MoMo payment URL
 */
function generateMoMoUrl(order) {
  // MoMo URL generation placeholder
  const baseUrl = process.env.MOMO_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';
  return `${baseUrl}?orderId=${order.id}`;
}

/**
 * Handle wallet payment
 */
async function handleWalletPayment(order) {
  // Wallet payment placeholder
  // Would deduct from user's wallet balance
  
  return {
    method: PAYMENT_METHODS.WALLET,
    status: 'processing',
    message: 'Processing wallet payment',
  };
}

/**
 * Handle payment callback
 */
async function handleCallback(provider, data) {
  switch (provider) {
    case 'vnpay':
      return handleVNPayCallback(data);
    case 'momo':
      return handleMoMoCallback(data);
    default:
      throw new AppError('INVALID_PROVIDER', 'Invalid payment provider', 400);
  }
}

/**
 * Handle VNPay callback
 */
async function handleVNPayCallback(data) {
  const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionStatus } = data;
  
  const orderId = vnp_TxnRef;
  
  if (vnp_ResponseCode === '00' && vnp_TransactionStatus === '00') {
    // Payment successful
    await orderRepository.updatePaymentStatus(orderId, 'paid');
    
    // Update sub-orders to pending
    const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
    for (const subOrder of subOrders) {
      await orderRepository.updateSubOrderStatus(subOrder.id, 'pending');
    }
  } else {
    // Payment failed
    await orderRepository.updatePaymentStatus(orderId, 'failed');
    await orderRepository.updateOrderStatus(orderId, 'payment_failed');
    
    // Release reserved stock
    await releaseStock(orderId);
  }
}

/**
 * Handle MoMo callback
 */
async function handleMoMoCallback(data) {
  const { orderId, resultCode } = data;
  
  if (resultCode === 0) {
    // Payment successful
    await orderRepository.updatePaymentStatus(orderId, 'paid');
    
    const subOrders = await orderRepository.findSubOrdersByOrderId(orderId);
    for (const subOrder of subOrders) {
      await orderRepository.updateSubOrderStatus(subOrder.id, 'pending');
    }
  } else {
    // Payment failed
    await orderRepository.updatePaymentStatus(orderId, 'failed');
    await orderRepository.updateOrderStatus(orderId, 'payment_failed');
    
    await releaseStock(orderId);
  }
}

/**
 * Release reserved stock
 */
async function releaseStock(orderId) {
  // Would update product_variants.reserved_quantity
  // Placeholder
}

/**
 * Process refund
 */
async function processRefund(orderId, amount) {
  const order = await orderRepository.findOrderById(orderId);
  
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  
  // Process refund based on payment method
  switch (order.payment_method) {
    case PAYMENT_METHODS.VNPAY:
      return processVNPayRefund(order, amount);
    case PAYMENT_METHODS.MOMO:
      return processMoMoRefund(order, amount);
    case PAYMENT_METHODS.WALLET:
      return processWalletRefund(order, amount);
    case PAYMENT_METHODS.COD:
      // No refund needed for COD
      return { status: 'not_applicable', message: 'COD orders do not require refund' };
    default:
      throw new AppError('INVALID_PAYMENT_METHOD', 'Cannot process refund', 400);
  }
}

/**
 * Process VNPay refund (placeholder)
 */
async function processVNPayRefund(order, amount) {
  return { status: 'processing', message: 'VNPay refund initiated' };
}

/**
 * Process MoMo refund (placeholder)
 */
async function processMoMoRefund(order, amount) {
  return { status: 'processing', message: 'MoMo refund initiated' };
}

/**
 * Process wallet refund
 */
async function processWalletRefund(order, amount) {
  // Would credit user's wallet
  return { status: 'completed', message: 'Wallet refund completed' };
}

module.exports = {
  PAYMENT_METHODS,
  initiatePayment,
  handleCallback,
  processRefund,
  handleCODPayment,
  createVNPayPayment,
  createMoMoPayment,
  handleWalletPayment,
  releaseStock,
};
