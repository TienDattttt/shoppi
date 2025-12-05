-- Migration: Create tracking_events table
-- Description: Order tracking history events

CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_events_sub_order ON tracking_events(sub_order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created_at ON tracking_events(created_at DESC);

-- Function to increment voucher usage count
CREATE OR REPLACE FUNCTION increment_voucher_usage(voucher_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE vouchers 
    SET used_count = used_count + 1 
    WHERE id = voucher_id;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement voucher usage count
CREATE OR REPLACE FUNCTION decrement_voucher_usage(voucher_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE vouchers 
    SET used_count = GREATEST(0, used_count - 1) 
    WHERE id = voucher_id;
END;
$$ LANGUAGE plpgsql;
