-- Migration: Add transit simulation columns to shipments table
-- Purpose: Support transit simulation tracking (mô phỏng hành trình trung chuyển)

-- Add transit simulation columns
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS transit_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_region VARCHAR(20),
ADD COLUMN IF NOT EXISTS dest_region VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_cross_region BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ready_for_delivery_at TIMESTAMPTZ;

-- Add status 'ready_for_delivery' to shipments
-- This status indicates shipment has arrived at delivery office and waiting for delivery shipper
COMMENT ON COLUMN shipments.transit_started_at IS 'Timestamp when transit simulation started (after pickup)';
COMMENT ON COLUMN shipments.source_region IS 'Source region: north, central, south';
COMMENT ON COLUMN shipments.dest_region IS 'Destination region: north, central, south';
COMMENT ON COLUMN shipments.is_cross_region IS 'Whether shipment crosses regions (requires inter-region transit)';
COMMENT ON COLUMN shipments.ready_for_delivery_at IS 'Timestamp when shipment arrived at delivery office';

-- Add index for transit queries
CREATE INDEX IF NOT EXISTS idx_shipments_transit ON shipments(source_region, dest_region, is_cross_region);
CREATE INDEX IF NOT EXISTS idx_shipments_ready_delivery ON shipments(status, ready_for_delivery_at) WHERE status = 'ready_for_delivery';
