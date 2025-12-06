-- Migration: Create shipping_provider_configs table
-- Feature: shipping-provider-integration
-- Requirements: 1.2, 7.4

-- Table to store shipping provider configurations per shop
CREATE TABLE IF NOT EXISTS shipping_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Shop reference (NULL for platform-wide config)
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Provider identification
  provider_code VARCHAR(50) NOT NULL, -- 'ghtk', 'ghn', 'viettelpost', 'inhouse'
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Encrypted credentials (API tokens, etc.)
  credentials JSONB DEFAULT '{}',
  
  -- Provider-specific settings
  settings JSONB DEFAULT '{}',
  -- Example settings:
  -- {
  --   "defaultWeight": 500,
  --   "pickupAddress": {...},
  --   "autoCreateOrder": true,
  --   "webhookSecret": "..."
  -- }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique provider per shop
  UNIQUE(shop_id, provider_code)
);

-- Index for quick lookup by shop
CREATE INDEX IF NOT EXISTS idx_shipping_provider_configs_shop_id 
  ON shipping_provider_configs(shop_id);

-- Index for finding enabled providers
CREATE INDEX IF NOT EXISTS idx_shipping_provider_configs_enabled 
  ON shipping_provider_configs(shop_id, is_enabled) 
  WHERE is_enabled = true;

-- Index for provider code lookup
CREATE INDEX IF NOT EXISTS idx_shipping_provider_configs_provider_code 
  ON shipping_provider_configs(provider_code);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shipping_provider_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shipping_provider_configs_updated_at ON shipping_provider_configs;
CREATE TRIGGER trigger_shipping_provider_configs_updated_at
  BEFORE UPDATE ON shipping_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_shipping_provider_configs_updated_at();

-- Comments
COMMENT ON TABLE shipping_provider_configs IS 'Stores shipping provider configurations per shop';
COMMENT ON COLUMN shipping_provider_configs.provider_code IS 'Provider identifier: ghtk, ghn, viettelpost, inhouse';
COMMENT ON COLUMN shipping_provider_configs.credentials IS 'Encrypted API credentials (tokens, keys)';
COMMENT ON COLUMN shipping_provider_configs.settings IS 'Provider-specific settings like default weight, pickup address';
