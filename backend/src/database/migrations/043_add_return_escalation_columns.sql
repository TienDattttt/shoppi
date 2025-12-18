-- Migration: Add escalation columns to return_requests
-- Description: Add columns for escalation feature and product info in items

-- Add escalation columns to return_requests
ALTER TABLE return_requests 
ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
ADD COLUMN IF NOT EXISTS escalation_evidence_urls TEXT[],
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Add product info columns to return_request_items
ALTER TABLE return_request_items
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS product_image TEXT,
ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255);

-- Update status check constraint to include 'escalated'
ALTER TABLE return_requests DROP CONSTRAINT IF EXISTS return_requests_status_check;
ALTER TABLE return_requests ADD CONSTRAINT return_requests_status_check 
CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'escalated',
    'shipping',
    'received',
    'refunding',
    'refunded',
    'completed',
    'cancelled'
));

-- Add index for escalated returns
CREATE INDEX IF NOT EXISTS idx_return_requests_escalated ON return_requests(escalated_at) WHERE escalated_at IS NOT NULL;
