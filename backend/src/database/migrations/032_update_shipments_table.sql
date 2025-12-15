-- Migration: Update shipments table for shipper integration
-- Requirements: 3.1 (Automatic Shipper Assignment), 6.1 (COD Management), 8.2 (Failed Delivery Handling)

-- Add pickup and delivery office references
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS pickup_office_id UUID REFERENCES post_offices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delivery_office_id UUID REFERENCES post_offices(id) ON DELETE SET NULL;

-- Add separate pickup and delivery shipper references
-- pickup_shipper_id: shipper who picks up from shop
-- delivery_shipper_id: shipper who delivers to customer (may be different in hub model)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS pickup_shipper_id UUID REFERENCES shippers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delivery_shipper_id UUID REFERENCES shippers(id) ON DELETE SET NULL;

-- Add current location tracking fields
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS current_location_name TEXT,
ADD COLUMN IF NOT EXISTS current_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_tracking_update TIMESTAMP WITH TIME ZONE;

-- Add estimated pickup timestamp
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS estimated_pickup TIMESTAMP WITH TIME ZONE;

-- Add delivery attempts tracking for failed delivery handling
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS delivery_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_delivery_attempt TIMESTAMP WITH TIME ZONE;

-- Add COD collection tracking
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS cod_collected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cod_collected_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_office_id ON shipments(pickup_office_id);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_office_id ON shipments(delivery_office_id);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_shipper_id ON shipments(pickup_shipper_id);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_shipper_id ON shipments(delivery_shipper_id);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_attempts ON shipments(delivery_attempts) WHERE delivery_attempts > 0;
CREATE INDEX IF NOT EXISTS idx_shipments_cod_collected ON shipments(cod_collected) WHERE cod_amount > 0;
CREATE INDEX IF NOT EXISTS idx_shipments_next_delivery_attempt ON shipments(next_delivery_attempt) WHERE next_delivery_attempt IS NOT NULL;

-- Comments for new columns
COMMENT ON COLUMN shipments.pickup_office_id IS 'Post office responsible for pickup';
COMMENT ON COLUMN shipments.delivery_office_id IS 'Post office responsible for delivery';
COMMENT ON COLUMN shipments.pickup_shipper_id IS 'Shipper assigned for pickup from shop';
COMMENT ON COLUMN shipments.delivery_shipper_id IS 'Shipper assigned for delivery to customer';
COMMENT ON COLUMN shipments.current_location_name IS 'Human-readable current location name';
COMMENT ON COLUMN shipments.current_location_lat IS 'Current latitude of shipment';
COMMENT ON COLUMN shipments.current_location_lng IS 'Current longitude of shipment';
COMMENT ON COLUMN shipments.last_tracking_update IS 'Timestamp of last location/status update';
COMMENT ON COLUMN shipments.estimated_pickup IS 'Estimated time for shipper to pick up from shop';
COMMENT ON COLUMN shipments.delivery_attempts IS 'Number of delivery attempts made';
COMMENT ON COLUMN shipments.next_delivery_attempt IS 'Scheduled time for next delivery attempt';
COMMENT ON COLUMN shipments.cod_collected IS 'Whether COD amount has been collected';
COMMENT ON COLUMN shipments.cod_collected_at IS 'Timestamp when COD was collected';
