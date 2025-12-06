-- Migration: Create external_shipments table
-- Feature: shipping-provider-integration
-- Requirements: 3.3

-- Table to store shipments created with external providers
CREATE TABLE IF NOT EXISTS external_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Order reference
  sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
  
  -- Provider information
  provider_code VARCHAR(50) NOT NULL, -- 'ghtk', 'ghn', 'viettelpost'
  provider_order_id VARCHAR(100), -- ID returned by provider
  tracking_number VARCHAR(100) NOT NULL,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'created',
  -- Unified statuses: created, assigned, picked_up, delivering, delivered, failed, returned, returning, cancelled
  provider_status VARCHAR(100), -- Raw status from provider
  status_message TEXT, -- Human-readable status message
  
  -- Financial
  shipping_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  cod_amount DECIMAL(12,2) DEFAULT 0,
  insurance_fee DECIMAL(12,2) DEFAULT 0,
  
  -- Addresses (snapshot at creation time)
  pickup_address JSONB NOT NULL,
  -- {
  --   "name": "Shop Name",
  --   "phone": "0901234567",
  --   "address": "123 Street",
  --   "ward": "Ward 1",
  --   "district": "District 1",
  --   "province": "Ho Chi Minh"
  -- }
  
  delivery_address JSONB NOT NULL,
  -- Same structure as pickup_address
  
  -- Package info
  package_info JSONB DEFAULT '{}',
  -- {
  --   "weight": 500,
  --   "length": 20,
  --   "width": 15,
  --   "height": 10,
  --   "items": [...]
  -- }
  
  -- Tracking history
  status_history JSONB DEFAULT '[]',
  -- [
  --   {"status": "created", "timestamp": "...", "message": "..."},
  --   {"status": "picked_up", "timestamp": "...", "message": "..."}
  -- ]
  
  -- Delivery info
  estimated_delivery_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Webhook data
  last_webhook_at TIMESTAMPTZ,
  webhook_data JSONB DEFAULT '{}'
);

-- Index for tracking number lookup (most common query)
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_shipments_tracking_number 
  ON external_shipments(tracking_number);

-- Index for sub_order lookup
CREATE INDEX IF NOT EXISTS idx_external_shipments_sub_order_id 
  ON external_shipments(sub_order_id);

-- Index for provider order ID
CREATE INDEX IF NOT EXISTS idx_external_shipments_provider_order_id 
  ON external_shipments(provider_code, provider_order_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_external_shipments_status 
  ON external_shipments(status);

-- Index for provider-specific queries
CREATE INDEX IF NOT EXISTS idx_external_shipments_provider_status 
  ON external_shipments(provider_code, status);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_external_shipments_created_at 
  ON external_shipments(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_external_shipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_external_shipments_updated_at ON external_shipments;
CREATE TRIGGER trigger_external_shipments_updated_at
  BEFORE UPDATE ON external_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_external_shipments_updated_at();

-- Comments
COMMENT ON TABLE external_shipments IS 'Stores shipments created with external shipping providers';
COMMENT ON COLUMN external_shipments.provider_code IS 'Shipping provider: ghtk, ghn, viettelpost';
COMMENT ON COLUMN external_shipments.tracking_number IS 'Tracking number from provider';
COMMENT ON COLUMN external_shipments.status IS 'Unified status: created, assigned, picked_up, delivering, delivered, failed, returned, cancelled';
COMMENT ON COLUMN external_shipments.provider_status IS 'Raw status code/string from provider';
COMMENT ON COLUMN external_shipments.status_history IS 'Array of status changes with timestamps';
