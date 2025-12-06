/**
 * Unified Shipping Service
 * Aggregates multiple shipping providers with fallback and caching
 * 
 * Feature: shipping-provider-integration
 * Requirements: 2.1, 3.1, 5.1, 6.1
 */

const { getProvider, isProviderRegistered } = require('./provider.factory');
const { normalizeStatus, isTerminalStatus } = require('./status.mapper');
const { ShippingStatus } = require('./shipping.interface');
const { AppError } = require('../../../../shared/utils/error.util');
const cacheService = require('../../../../shared/redis/cache.service');

// Cache TTLs
const FEE_CACHE_TTL = 300; // 5 minutes
const TRACKING_CACHE_TTL = 120; // 2 minutes

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate cache key for fee calculation
 */
function generateFeeCacheKey(shopId, providerCode, pickup, delivery, weight) {
  const pickupKey = `${pickup.province}-${pickup.district}`;
  const deliveryKey = `${delivery.province}-${delivery.district}`;
  return `shipping:fee:${shopId}:${providerCode}:${pickupKey}:${deliveryKey}:${weight}`;
}

/**
 * Generate cache key for tracking
 */
function generateTrackingCacheKey(trackingNumber) {
  return `shipping:tracking:${trackingNumber}`;
}

/**
 * Call provider API with retry mechanism
 * @param {Object} provider - Provider instance
 * @param {string} method - Method name
 * @param {Array} args - Method arguments
 * @param {number} maxRetries - Maximum retry attempts
 */
async function callWithRetry(provider, method, args, maxRetries = MAX_RETRIES) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await provider[method](...args);
    } catch (error) {
      lastError = error;
      console.error(
        `[UnifiedShipping] ${provider.providerCode}.${method} attempt ${attempt}/${maxRetries} failed:`,
        error.message
      );

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  console.error(
    `[UnifiedShipping] ${provider.providerCode}.${method} failed after ${maxRetries} attempts`
  );
  
  // TODO: Notify admin about persistent failure
  // await notifyAdmin('SHIPPING_API_FAILED', { provider: provider.providerCode, method, error: lastError });

  throw lastError;
}

/**
 * Get enabled shipping providers for a shop
 * @param {string} shopId
 * @returns {Promise<string[]>} Array of provider codes
 */
async function getShopEnabledProviders(shopId) {
  // TODO: Fetch from shipping_provider_configs table
  // For now, return default providers
  const defaultProviders = ['inhouse'];
  
  if (process.env.GHTK_API_TOKEN) {
    defaultProviders.unshift('ghtk');
  }

  return defaultProviders;
}

/**
 * Get shipping options for checkout
 * Aggregates fees from all enabled providers
 * 
 * @param {string} shopId - Shop ID
 * @param {Object} pickup - Pickup address
 * @param {Object} delivery - Delivery address
 * @param {Array} items - Items to ship
 * @param {number} codAmount - COD amount
 * @returns {Promise<{options: Array, errors: Array}>}
 */
async function getShippingOptions(shopId, pickup, delivery, items, codAmount = 0) {
  const enabledProviders = await getShopEnabledProviders(shopId);
  const options = [];
  const errors = [];

  const weight = items.reduce((sum, item) => sum + ((item.weight || 500) * (item.quantity || 1)), 0);

  for (const providerCode of enabledProviders) {
    if (!isProviderRegistered(providerCode)) {
      continue;
    }

    try {
      const provider = getProvider(providerCode);
      
      if (!provider.isConfigured()) {
        continue;
      }

      // Check cache first
      const cacheKey = generateFeeCacheKey(shopId, providerCode, pickup, delivery, weight);
      const cachedFee = await cacheService.get(cacheKey);

      if (cachedFee) {
        options.push({
          provider: providerCode,
          providerName: provider.getProviderName(),
          ...cachedFee,
          cached: true,
        });
        continue;
      }

      // Calculate fee from provider
      const result = await callWithRetry(provider, 'calculateFee', [{
        pickup,
        delivery,
        items,
        codAmount,
      }]);

      // Cache the result
      await cacheService.set(cacheKey, result, FEE_CACHE_TTL);

      options.push({
        provider: providerCode,
        providerName: provider.getProviderName(),
        ...result,
        cached: false,
      });
    } catch (error) {
      errors.push({
        provider: providerCode,
        error: error.message,
      });
    }
  }

  // Always include in-house as fallback if no options available
  if (options.length === 0 && isProviderRegistered('inhouse')) {
    try {
      const inhouseProvider = getProvider('inhouse');
      const result = await inhouseProvider.calculateFee({ pickup, delivery, items, codAmount });
      options.push({
        provider: 'inhouse',
        providerName: inhouseProvider.getProviderName(),
        ...result,
        fallback: true,
      });
    } catch (error) {
      errors.push({
        provider: 'inhouse',
        error: error.message,
      });
    }
  }

  // Sort by fee (lowest first)
  options.sort((a, b) => a.fee - b.fee);

  return { options, errors };
}

/**
 * Create shipping order with selected provider
 * 
 * @param {string} subOrderId - Sub-order ID
 * @param {string} providerCode - Selected provider
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Created shipment details
 */
async function createShippingOrder(subOrderId, providerCode, orderData) {
  if (!isProviderRegistered(providerCode)) {
    throw new AppError(`Provider ${providerCode} is not available`, 400, 'INVALID_PROVIDER');
  }

  const provider = getProvider(providerCode);

  if (!provider.isConfigured()) {
    throw new AppError(`Provider ${providerCode} is not configured`, 400, 'PROVIDER_NOT_CONFIGURED');
  }

  // Create order with retry
  const result = await callWithRetry(provider, 'createOrder', [{
    orderId: subOrderId,
    ...orderData,
  }]);

  // Validate result has tracking number
  if (!result.trackingNumber) {
    throw new AppError('Provider did not return tracking number', 500, 'MISSING_TRACKING');
  }

  return {
    subOrderId,
    provider: providerCode,
    trackingNumber: result.trackingNumber,
    providerOrderId: result.providerOrderId,
    fee: result.fee,
    estimatedDelivery: result.estimatedDelivery,
    status: ShippingStatus.CREATED,
  };
}

/**
 * Cancel shipping order
 * 
 * @param {string} trackingNumber - Tracking number
 * @param {string} providerCode - Provider code
 * @returns {Promise<Object>} Cancellation result
 */
async function cancelShippingOrder(trackingNumber, providerCode) {
  if (!isProviderRegistered(providerCode)) {
    throw new AppError(`Provider ${providerCode} is not available`, 400, 'INVALID_PROVIDER');
  }

  const provider = getProvider(providerCode);
  const result = await callWithRetry(provider, 'cancelOrder', [trackingNumber]);

  // Clear tracking cache
  const cacheKey = generateTrackingCacheKey(trackingNumber);
  await cacheService.del(cacheKey);

  return result;
}

/**
 * Get tracking information
 * 
 * @param {string} trackingNumber - Tracking number
 * @param {string} providerCode - Provider code
 * @returns {Promise<Object>} Tracking info
 */
async function getTrackingInfo(trackingNumber, providerCode) {
  const cacheKey = generateTrackingCacheKey(trackingNumber);

  // Check cache first
  const cachedTracking = await cacheService.get(cacheKey);

  try {
    if (!isProviderRegistered(providerCode)) {
      // Return cached if provider not available
      if (cachedTracking) {
        return { ...cachedTracking, stale: true };
      }
      throw new AppError(`Provider ${providerCode} is not available`, 400, 'INVALID_PROVIDER');
    }

    const provider = getProvider(providerCode);
    const result = await provider.getTracking(trackingNumber);

    // Cache the result (unless terminal status)
    if (!isTerminalStatus(result.status)) {
      await cacheService.set(cacheKey, result, TRACKING_CACHE_TTL);
    }

    return { ...result, stale: false };
  } catch (error) {
    // Return cached tracking with stale indicator on failure
    if (cachedTracking) {
      console.warn(`[UnifiedShipping] Returning stale tracking for ${trackingNumber}`);
      return { ...cachedTracking, stale: true, error: error.message };
    }
    throw error;
  }
}

/**
 * Process webhook update
 * 
 * @param {string} providerCode - Provider code
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature
 * @returns {Promise<Object>} Processing result
 */
async function processWebhook(providerCode, payload, signature) {
  if (!isProviderRegistered(providerCode)) {
    throw new AppError(`Provider ${providerCode} is not available`, 400, 'INVALID_PROVIDER');
  }

  const provider = getProvider(providerCode);

  // Validate signature
  if (!provider.validateWebhook(payload, signature)) {
    throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
  }

  // Parse payload
  const webhookData = provider.parseWebhookPayload(payload);

  // Clear tracking cache to force fresh fetch
  const cacheKey = generateTrackingCacheKey(webhookData.trackingNumber);
  await cacheService.del(cacheKey);

  return webhookData;
}

module.exports = {
  // Main functions
  getShippingOptions,
  createShippingOrder,
  cancelShippingOrder,
  getTrackingInfo,
  processWebhook,
  
  // Utilities
  getShopEnabledProviders,
  callWithRetry,
  
  // Cache utilities
  generateFeeCacheKey,
  generateTrackingCacheKey,
  
  // Constants
  FEE_CACHE_TTL,
  TRACKING_CACHE_TTL,
  MAX_RETRIES,
};
