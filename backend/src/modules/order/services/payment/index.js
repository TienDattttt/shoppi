/**
 * Payment Module Index
 * Exports all payment-related components
 */

// Interface and constants
const {
  PaymentProviderInterface,
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PAYMENT_ERRORS,
} = require('./payment.interface');

// Base provider
const BasePaymentProvider = require('./base.provider');

// Providers
const MoMoProvider = require('./providers/momo.provider');
const VNPayProvider = require('./providers/vnpay.provider');
const ZaloPayProvider = require('./providers/zalopay.provider');

// Webhooks
const { handleMoMoCallback } = require('./webhooks/momo.webhook');
const { handleVNPayReturn, handleVNPayIPN } = require('./webhooks/vnpay.webhook');
const { handleZaloPayCallback } = require('./webhooks/zalopay.webhook');

/**
 * Get payment provider by name
 * @param {string} providerName - Provider name (momo, vnpay, zalopay)
 * @returns {BasePaymentProvider}
 */
function getProvider(providerName) {
  const providers = {
    [PAYMENT_PROVIDERS.MOMO]: MoMoProvider,
    [PAYMENT_PROVIDERS.VNPAY]: VNPayProvider,
    [PAYMENT_PROVIDERS.ZALOPAY]: ZaloPayProvider,
  };

  const ProviderClass = providers[providerName];
  if (!ProviderClass) {
    throw new Error(`Unknown payment provider: ${providerName}`);
  }

  return new ProviderClass();
}

module.exports = {
  // Interface
  PaymentProviderInterface,
  BasePaymentProvider,
  
  // Constants
  PAYMENT_STATUS,
  PAYMENT_PROVIDERS,
  PAYMENT_ERRORS,
  
  // Providers
  MoMoProvider,
  VNPayProvider,
  ZaloPayProvider,
  getProvider,
  
  // Webhooks
  handleMoMoCallback,
  handleVNPayReturn,
  handleVNPayIPN,
  handleZaloPayCallback,
};
