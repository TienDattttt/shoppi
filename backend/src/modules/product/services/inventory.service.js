/**
 * Inventory Service
 * Business logic for inventory/stock management
 */

const productRepository = require('../product.repository');
const { AppError, NotFoundError, ValidationError } = require('../../../shared/utils/error.util');

// Event emitter for notifications (can be replaced with actual notification service)
const EventEmitter = require('events');
const inventoryEvents = new EventEmitter();

/**
 * Get variant with stock info
 * @param {string} variantId
 * @returns {Promise<object>}
 */
async function getVariantStock(variantId) {
  const variant = await productRepository.findVariantById(variantId);
  
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  return {
    variantId: variant.id,
    productId: variant.product_id,
    sku: variant.sku,
    quantity: variant.quantity,
    reservedQuantity: variant.reserved_quantity,
    availableQuantity: variant.quantity - variant.reserved_quantity,
    lowStockThreshold: variant.low_stock_threshold,
    isLowStock: variant.quantity <= variant.low_stock_threshold,
    isOutOfStock: variant.quantity === 0,
  };
}

/**
 * Update stock quantity
 * @param {string} variantId
 * @param {number} newQuantity
 * @param {string} reason - Reason for stock update
 * @returns {Promise<object>}
 */
async function updateStock(variantId, newQuantity, reason = 'manual_update') {
  // Validate quantity
  if (typeof newQuantity !== 'number' || !Number.isInteger(newQuantity)) {
    throw new ValidationError('Quantity must be an integer');
  }

  if (newQuantity < 0) {
    throw new AppError('NEGATIVE_STOCK', 'Stock quantity cannot be negative', 400);
  }

  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }


  // Check if new quantity would be less than reserved
  if (newQuantity < variant.reserved_quantity) {
    throw new AppError(
      'INSUFFICIENT_STOCK',
      `Cannot set quantity to ${newQuantity}. ${variant.reserved_quantity} units are reserved.`,
      400
    );
  }

  const oldQuantity = variant.quantity;
  
  // Update the variant
  const updatedVariant = await productRepository.updateVariant(variantId, {
    quantity: newQuantity,
    is_active: newQuantity > 0, // Auto-deactivate if out of stock
  });

  // Check for low stock alert
  if (newQuantity <= variant.low_stock_threshold && newQuantity > 0) {
    emitLowStockAlert(updatedVariant, oldQuantity);
  }

  // Check for out of stock
  if (newQuantity === 0) {
    emitOutOfStockAlert(updatedVariant);
  }

  // Log the change
  logStockChange(variantId, oldQuantity, newQuantity, reason);

  return {
    variantId: updatedVariant.id,
    sku: updatedVariant.sku,
    previousQuantity: oldQuantity,
    newQuantity: updatedVariant.quantity,
    reservedQuantity: updatedVariant.reserved_quantity,
    availableQuantity: updatedVariant.quantity - updatedVariant.reserved_quantity,
    isLowStock: updatedVariant.quantity <= variant.low_stock_threshold,
    isOutOfStock: updatedVariant.quantity === 0,
  };
}

/**
 * Adjust stock (add or subtract)
 * @param {string} variantId
 * @param {number} adjustment - Positive to add, negative to subtract
 * @param {string} reason
 * @returns {Promise<object>}
 */
async function adjustStock(variantId, adjustment, reason = 'adjustment') {
  if (typeof adjustment !== 'number' || !Number.isInteger(adjustment)) {
    throw new ValidationError('Adjustment must be an integer');
  }

  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  const newQuantity = variant.quantity + adjustment;
  
  if (newQuantity < 0) {
    throw new AppError('NEGATIVE_STOCK', 'Stock adjustment would result in negative quantity', 400);
  }

  return updateStock(variantId, newQuantity, reason);
}

/**
 * Reserve stock for an order
 * @param {string} variantId
 * @param {number} quantity
 * @returns {Promise<object>}
 */
async function reserveStock(variantId, quantity) {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Quantity must be a positive integer');
  }

  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  const availableStock = variant.quantity - variant.reserved_quantity;
  
  if (availableStock < quantity) {
    throw new AppError(
      'INSUFFICIENT_STOCK',
      `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`,
      400
    );
  }

  const updatedVariant = await productRepository.updateVariant(variantId, {
    reserved_quantity: variant.reserved_quantity + quantity,
  });

  return {
    variantId: updatedVariant.id,
    sku: updatedVariant.sku,
    quantity: updatedVariant.quantity,
    reservedQuantity: updatedVariant.reserved_quantity,
    availableQuantity: updatedVariant.quantity - updatedVariant.reserved_quantity,
  };
}

/**
 * Release reserved stock (e.g., order cancelled)
 * @param {string} variantId
 * @param {number} quantity
 * @returns {Promise<object>}
 */
async function releaseStock(variantId, quantity) {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Quantity must be a positive integer');
  }

  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  // Can't release more than reserved
  const releaseAmount = Math.min(quantity, variant.reserved_quantity);
  
  const updatedVariant = await productRepository.updateVariant(variantId, {
    reserved_quantity: variant.reserved_quantity - releaseAmount,
  });

  return {
    variantId: updatedVariant.id,
    sku: updatedVariant.sku,
    quantity: updatedVariant.quantity,
    reservedQuantity: updatedVariant.reserved_quantity,
    availableQuantity: updatedVariant.quantity - updatedVariant.reserved_quantity,
    releasedQuantity: releaseAmount,
  };
}

/**
 * Confirm stock deduction (order completed)
 * @param {string} variantId
 * @param {number} quantity
 * @returns {Promise<object>}
 */
async function confirmStockDeduction(variantId, quantity) {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Quantity must be a positive integer');
  }

  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  const newQuantity = variant.quantity - quantity;
  const newReserved = Math.max(0, variant.reserved_quantity - quantity);

  if (newQuantity < 0) {
    throw new AppError('NEGATIVE_STOCK', 'Stock deduction would result in negative quantity', 400);
  }

  const updatedVariant = await productRepository.updateVariant(variantId, {
    quantity: newQuantity,
    reserved_quantity: newReserved,
    is_active: newQuantity > 0,
  });

  // Check alerts
  if (newQuantity <= variant.low_stock_threshold && newQuantity > 0) {
    emitLowStockAlert(updatedVariant, variant.quantity);
  }
  if (newQuantity === 0) {
    emitOutOfStockAlert(updatedVariant);
  }

  return {
    variantId: updatedVariant.id,
    sku: updatedVariant.sku,
    quantity: updatedVariant.quantity,
    reservedQuantity: updatedVariant.reserved_quantity,
    availableQuantity: updatedVariant.quantity - updatedVariant.reserved_quantity,
    isOutOfStock: updatedVariant.quantity === 0,
  };
}


/**
 * Set low stock threshold
 * @param {string} variantId
 * @param {number} threshold
 * @returns {Promise<object>}
 */
async function setLowStockThreshold(variantId, threshold) {
  if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 0) {
    throw new ValidationError('Threshold must be a non-negative integer');
  }

  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    throw new NotFoundError('Variant not found');
  }

  const updatedVariant = await productRepository.updateVariant(variantId, {
    low_stock_threshold: threshold,
  });

  return {
    variantId: updatedVariant.id,
    sku: updatedVariant.sku,
    lowStockThreshold: updatedVariant.low_stock_threshold,
    isLowStock: updatedVariant.quantity <= threshold,
  };
}

/**
 * Get low stock variants for a shop
 * @param {string} shopId
 * @returns {Promise<object[]>}
 */
async function getLowStockVariants(shopId) {
  // This would need a custom query - for now return empty
  // In production, implement a proper query joining products and variants
  return [];
}

/**
 * Bulk update stock
 * @param {Array<{variantId: string, quantity: number}>} updates
 * @param {string} reason
 * @returns {Promise<object[]>}
 */
async function bulkUpdateStock(updates, reason = 'bulk_update') {
  const results = [];
  const errors = [];

  for (const update of updates) {
    try {
      const result = await updateStock(update.variantId, update.quantity, reason);
      results.push({ success: true, ...result });
    } catch (error) {
      errors.push({
        success: false,
        variantId: update.variantId,
        error: error.message,
      });
    }
  }

  return { results, errors };
}

// ============================================
// ALERT HELPERS
// ============================================

/**
 * Emit low stock alert
 * @param {object} variant
 * @param {number} previousQuantity
 */
function emitLowStockAlert(variant, previousQuantity) {
  inventoryEvents.emit('lowStock', {
    type: 'LOW_STOCK',
    variantId: variant.id,
    productId: variant.product_id,
    sku: variant.sku,
    currentQuantity: variant.quantity,
    previousQuantity,
    threshold: variant.low_stock_threshold,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit out of stock alert
 * @param {object} variant
 */
function emitOutOfStockAlert(variant) {
  inventoryEvents.emit('outOfStock', {
    type: 'OUT_OF_STOCK',
    variantId: variant.id,
    productId: variant.product_id,
    sku: variant.sku,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log stock change (placeholder - implement with actual logging)
 * @param {string} variantId
 * @param {number} oldQuantity
 * @param {number} newQuantity
 * @param {string} reason
 */
function logStockChange(variantId, oldQuantity, newQuantity, reason) {
  // In production, save to inventory_logs table
  console.log(`[Inventory] Variant ${variantId}: ${oldQuantity} -> ${newQuantity} (${reason})`);
}

/**
 * Subscribe to inventory events
 * @param {string} event - 'lowStock' or 'outOfStock'
 * @param {Function} handler
 */
function onInventoryEvent(event, handler) {
  inventoryEvents.on(event, handler);
}

/**
 * Check if variant is in stock
 * @param {string} variantId
 * @param {number} requiredQuantity
 * @returns {Promise<boolean>}
 */
async function isInStock(variantId, requiredQuantity = 1) {
  const variant = await productRepository.findVariantById(variantId);
  if (!variant) {
    return false;
  }
  
  const availableStock = variant.quantity - variant.reserved_quantity;
  return availableStock >= requiredQuantity;
}

/**
 * Get stock status string
 * @param {object} variant
 * @returns {string}
 */
function getStockStatus(variant) {
  if (!variant) return 'unavailable';
  if (variant.quantity === 0) return 'out_of_stock';
  if (variant.quantity <= variant.low_stock_threshold) return 'low_stock';
  return 'in_stock';
}

module.exports = {
  getVariantStock,
  updateStock,
  adjustStock,
  reserveStock,
  releaseStock,
  confirmStockDeduction,
  setLowStockThreshold,
  getLowStockVariants,
  bulkUpdateStock,
  onInventoryEvent,
  isInStock,
  getStockStatus,
  // For testing
  inventoryEvents,
};
