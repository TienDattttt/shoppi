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
  ZALOPAY: 'zalopay',
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
    case PAYMENT_METHODS.ZALOPAY:
      return createZaloPayPayment(order);
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
  const VNPayProvider = require('./payment/providers/vnpay.provider');
  const vnpayProvider = new VNPayProvider();
  
  try {
    const result = await vnpayProvider.createPayment({
      id: order.id,
      orderNumber: order.order_number,
      amount: order.grand_total,
      currency: 'VND',
      description: `Thanh toán đơn hàng ${order.order_number}`,
    });
    
    return {
      paymentId: result.paymentId,
      payUrl: result.payUrl,
      provider: 'vnpay',
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    console.error('[Payment] VNPay payment creation failed:', error.message);
    throw new AppError('PAYMENT_FAILED', 'Failed to create VNPay payment: ' + error.message, 500);
  }
}

/**
 * Create MoMo payment
 */
async function createMoMoPayment(order) {
  const MoMoProvider = require('./payment/providers/momo.provider');
  const momoProvider = new MoMoProvider();
  
  try {
    const result = await momoProvider.createPayment({
      id: order.id,
      orderNumber: order.order_number,
      amount: order.grand_total,
      currency: 'VND',
      description: `Thanh toán đơn hàng ${order.order_number}`,
    });
    
    return {
      paymentId: result.paymentId,
      payUrl: result.payUrl,
      provider: 'momo',
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    console.error('[Payment] MoMo payment creation failed:', error.message);
    throw new AppError('PAYMENT_FAILED', 'Failed to create MoMo payment: ' + error.message, 500);
  }
}

/**
 * Create ZaloPay payment
 */
async function createZaloPayPayment(order) {
  const ZaloPayProvider = require('./payment/providers/zalopay.provider');
  const zalopayProvider = new ZaloPayProvider();
  
  try {
    const result = await zalopayProvider.createPayment({
      id: order.id,
      orderNumber: order.order_number,
      amount: order.grand_total,
      currency: 'VND',
      description: `Thanh toán đơn hàng ${order.order_number}`,
    });
    
    return {
      paymentId: result.paymentId,
      payUrl: result.payUrl,
      provider: 'zalopay',
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    console.error('[Payment] ZaloPay payment creation failed:', error.message);
    throw new AppError('PAYMENT_FAILED', 'Failed to create ZaloPay payment: ' + error.message, 500);
  }
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
