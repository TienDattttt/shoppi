/**
 * Order Validators
 * Validation schemas for order operations
 */

/**
 * Validate add to cart request
 */
function validateAddToCart(data) {
  const errors = [];
  
  if (!data.productId) {
    errors.push({ field: 'productId', message: 'Product ID is required' });
  }
  
  if (!data.variantId) {
    errors.push({ field: 'variantId', message: 'Variant ID is required' });
  }
  
  if (!data.quantity || data.quantity < 1) {
    errors.push({ field: 'quantity', message: 'Quantity must be at least 1' });
  }
  
  if (!Number.isInteger(data.quantity)) {
    errors.push({ field: 'quantity', message: 'Quantity must be an integer' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      productId: data.productId,
      variantId: data.variantId,
      quantity: parseInt(data.quantity),
    } : null,
  };
}

/**
 * Validate update cart item request
 */
function validateUpdateCartItem(data) {
  const errors = [];
  
  if (data.quantity === undefined || data.quantity === null) {
    errors.push({ field: 'quantity', message: 'Quantity is required' });
  } else if (data.quantity < 1) {
    errors.push({ field: 'quantity', message: 'Quantity must be at least 1' });
  } else if (!Number.isInteger(data.quantity)) {
    errors.push({ field: 'quantity', message: 'Quantity must be an integer' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? { quantity: parseInt(data.quantity) } : null,
  };
}


/**
 * Validate checkout request
 */
function validateCheckout(data) {
  const errors = [];
  
  if (!data.cartItemIds || !Array.isArray(data.cartItemIds) || data.cartItemIds.length === 0) {
    errors.push({ field: 'cartItemIds', message: 'At least one cart item is required' });
  }
  
  if (!data.shippingAddressId) {
    errors.push({ field: 'shippingAddressId', message: 'Shipping address is required' });
  }
  
  if (!data.paymentMethod) {
    errors.push({ field: 'paymentMethod', message: 'Payment method is required' });
  } else {
    const validMethods = ['cod', 'vnpay', 'momo', 'wallet'];
    if (!validMethods.includes(data.paymentMethod)) {
      errors.push({ field: 'paymentMethod', message: 'Invalid payment method' });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      cartItemIds: data.cartItemIds,
      shippingAddressId: data.shippingAddressId,
      paymentMethod: data.paymentMethod,
      platformVoucherCode: data.platformVoucherCode || null,
      shopVouchers: data.shopVouchers || {},
      customerNote: data.customerNote || null,
    } : null,
  };
}

/**
 * Validate cancel order request
 */
function validateCancelOrder(data) {
  const errors = [];
  
  if (!data.reason || data.reason.trim().length === 0) {
    errors.push({ field: 'reason', message: 'Cancellation reason is required' });
  }
  
  if (data.reason && data.reason.length > 500) {
    errors.push({ field: 'reason', message: 'Reason must not exceed 500 characters' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? { reason: data.reason.trim() } : null,
  };
}

/**
 * Validate return request
 */
function validateReturnRequest(data) {
  const errors = [];
  
  if (!data.reason || data.reason.trim().length === 0) {
    errors.push({ field: 'reason', message: 'Return reason is required' });
  }
  
  const validReasons = [
    'defective',
    'wrong_item',
    'not_as_described',
    'changed_mind',
    'other',
  ];
  
  if (data.reason && !validReasons.includes(data.reason)) {
    errors.push({ field: 'reason', message: 'Invalid return reason' });
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? {
      reason: data.reason,
      description: data.description.trim(),
      images: data.images || [],
    } : null,
  };
}

/**
 * Validate voucher code
 */
function validateVoucherCode(code) {
  if (!code || typeof code !== 'string') {
    return { isValid: false, error: 'Voucher code is required' };
  }
  
  const trimmedCode = code.trim().toUpperCase();
  
  if (trimmedCode.length < 3 || trimmedCode.length > 50) {
    return { isValid: false, error: 'Invalid voucher code format' };
  }
  
  return { isValid: true, code: trimmedCode };
}

module.exports = {
  validateAddToCart,
  validateUpdateCartItem,
  validateCheckout,
  validateCancelOrder,
  validateReturnRequest,
  validateVoucherCode,
};
