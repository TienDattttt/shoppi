/**
 * Shipping Provider Factory
 * Factory pattern for creating shipping provider instances
 * 
 * Feature: shipping-provider-integration
 * Requirements: 8.3, 8.4
 */

const { AppError } = require('../../../../shared/utils/error.util');

// Provider registry - will be populated as providers are registered
const providers = new Map();

// Provider configurations cache
const configCache = new Map();

/**
 * Register a shipping provider
 * @param {string} code - Provider code (e.g., 'ghtk', 'ghn', 'inhouse')
 * @param {Class} ProviderClass - Provider class that extends BaseShippingProvider
 */
function registerProvider(code, ProviderClass) {
  if (!code || typeof code !== 'string') {
    throw new Error('Provider code must be a non-empty string');
  }
  if (!ProviderClass || typeof ProviderClass !== 'function') {
    throw new Error('ProviderClass must be a constructor function');
  }
  providers.set(code.toLowerCase(), ProviderClass);
}

/**
 * Get list of registered provider codes
 * @returns {string[]}
 */
function getRegisteredProviders() {
  return Array.from(providers.keys());
}

/**
 * Check if a provider is registered
 * @param {string} code
 * @returns {boolean}
 */
function isProviderRegistered(code) {
  return providers.has(code?.toLowerCase());
}

/**
 * Get provider instance
 * @param {string} providerCode - Provider code
 * @param {Object} config - Provider configuration (optional, will use cached if not provided)
 * @returns {BaseShippingProvider}
 */
function getProvider(providerCode, config = null) {
  if (!providerCode) {
    throw new AppError('Provider code is required', 400, 'INVALID_PROVIDER');
  }

  const code = providerCode.toLowerCase();
  const ProviderClass = providers.get(code);

  if (!ProviderClass) {
    const available = getRegisteredProviders().join(', ');
    throw new AppError(
      `Unknown shipping provider: ${providerCode}. Available: ${available || 'none'}`,
      400,
      'INVALID_PROVIDER'
    );
  }

  // Use provided config or get from cache/environment
  const providerConfig = config || getProviderConfig(code);

  try {
    return new ProviderClass(providerConfig);
  } catch (error) {
    throw new AppError(
      `Failed to initialize provider ${providerCode}: ${error.message}`,
      500,
      'PROVIDER_INIT_FAILED'
    );
  }
}

/**
 * Get provider configuration from cache or environment
 * @param {string} providerCode
 * @returns {Object}
 */
function getProviderConfig(providerCode) {
  const code = providerCode.toLowerCase();

  // Check cache first
  if (configCache.has(code)) {
    return configCache.get(code);
  }

  // Build config from environment variables
  let config = {};

  switch (code) {
    case 'ghtk':
      config = {
        apiToken: process.env.GHTK_API_TOKEN,
        sandbox: process.env.GHTK_SANDBOX === 'true',
      };
      break;

    case 'ghn':
      config = {
        apiToken: process.env.GHN_API_TOKEN,
        shopId: process.env.GHN_SHOP_ID,
        sandbox: process.env.GHN_SANDBOX === 'true',
      };
      break;

    case 'viettelpost':
    case 'vtp':
      config = {
        username: process.env.VTP_USERNAME,
        password: process.env.VTP_PASSWORD,
        sandbox: process.env.VTP_SANDBOX === 'true',
      };
      break;

    case 'inhouse':
      config = {
        // In-house provider uses internal shipper module
        enabled: true,
      };
      break;

    default:
      config = {};
  }

  return config;
}

/**
 * Set provider configuration in cache
 * @param {string} providerCode
 * @param {Object} config
 */
function setProviderConfig(providerCode, config) {
  configCache.set(providerCode.toLowerCase(), config);
}

/**
 * Clear provider configuration cache
 * @param {string} providerCode - Optional, clears all if not provided
 */
function clearConfigCache(providerCode = null) {
  if (providerCode) {
    configCache.delete(providerCode.toLowerCase());
  } else {
    configCache.clear();
  }
}

/**
 * Get all available providers with their status
 * @returns {Array<{code: string, name: string, registered: boolean, configured: boolean}>}
 */
function getAllProviders() {
  const allCodes = ['ghtk', 'ghn', 'viettelpost', 'inhouse'];
  
  return allCodes.map(code => {
    const registered = isProviderRegistered(code);
    let configured = false;
    let name = code.toUpperCase();

    if (registered) {
      try {
        const provider = getProvider(code);
        configured = provider.isConfigured();
        name = provider.getProviderName();
      } catch (e) {
        // Provider not configured
      }
    }

    return { code, name, registered, configured };
  });
}

/**
 * Validate that a provider has required interface methods
 * @param {Object} provider
 * @returns {boolean}
 */
function validateProviderInterface(provider) {
  const requiredMethods = [
    'calculateFee',
    'createOrder',
    'cancelOrder',
    'getTracking',
    'validateWebhook',
  ];

  return requiredMethods.every(method => 
    typeof provider[method] === 'function'
  );
}

module.exports = {
  registerProvider,
  getProvider,
  getRegisteredProviders,
  isProviderRegistered,
  getProviderConfig,
  setProviderConfig,
  clearConfigCache,
  getAllProviders,
  validateProviderInterface,
};
