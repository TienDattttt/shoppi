/**
 * Shipping Module Index
 * Exports all shipping-related functionality and registers providers
 * 
 * Feature: shipping-provider-integration
 */

// Import interfaces and base classes
const { ShippingProviderInterface, BaseShippingProvider, ShippingStatus } = require('./shipping.interface');

// Import factory
const providerFactory = require('./provider.factory');

// Import providers
const GHTKProvider = require('./providers/ghtk.provider');
const InHouseProvider = require('./providers/inhouse.provider');

// Import services
const unifiedShippingService = require('./unified-shipping.service');
const statusMapper = require('./status.mapper');

// Import repositories
const shippingConfigRepo = require('./shipping-config.repository');
const externalShipmentRepo = require('./external-shipment.repository');

// Import webhooks
const ghtkWebhook = require('./webhooks/ghtk.webhook');

// Register providers
providerFactory.registerProvider('ghtk', GHTKProvider);
providerFactory.registerProvider('inhouse', InHouseProvider);

// Export everything
module.exports = {
  // Interfaces
  ShippingProviderInterface,
  BaseShippingProvider,
  ShippingStatus,

  // Factory
  ...providerFactory,

  // Providers
  GHTKProvider,
  InHouseProvider,

  // Services
  ...unifiedShippingService,

  // Status mapping
  ...statusMapper,

  // Repositories
  shippingConfigRepo,
  externalShipmentRepo,

  // Webhooks
  ghtkWebhook,
};
