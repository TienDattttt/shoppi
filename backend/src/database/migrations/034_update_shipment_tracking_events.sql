-- Migration: Update shipment_tracking_events table
-- Purpose: Add default value for actor_type to match design specification
-- Requirements: 1.1, 1.4

-- Add default value for actor_type column
ALTER TABLE shipment_tracking_events 
ALTER COLUMN actor_type SET DEFAULT 'system';

-- Verify indexes exist (these should already exist from migration 030)
-- If not, create them
CREATE INDEX IF NOT EXISTS idx_tracking_shipment_id ON shipment_tracking_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_event_time ON shipment_tracking_events(event_time DESC);

-- Add composite index for efficient queries by shipment and time
CREATE INDEX IF NOT EXISTS idx_tracking_shipment_event_time ON shipment_tracking_events(shipment_id, event_time DESC);

-- Comment on table structure
COMMENT ON COLUMN shipment_tracking_events.actor_type IS 'Type of actor: system, shipper, shop, customer. Defaults to system.';
