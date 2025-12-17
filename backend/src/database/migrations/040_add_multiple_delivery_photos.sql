-- Migration: Add support for multiple delivery proof photos (1-3 photos)
-- Also add customer confirmation and rating fields

-- Add delivery_photo_urls column (JSON array for multiple photos)
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS delivery_photo_urls JSONB DEFAULT '[]'::jsonb;

-- Add customer confirmation fields
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS customer_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
ADD COLUMN IF NOT EXISTS customer_feedback TEXT;

-- Add coins reward for customer (like Shopee xu)
ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS coins_rewarded INTEGER DEFAULT 0;

-- Comments
COMMENT ON COLUMN shipments.delivery_photo_urls IS 'Array of delivery proof photo URLs (1-3 photos)';
COMMENT ON COLUMN shipments.customer_confirmed IS 'Whether customer has confirmed receipt';
COMMENT ON COLUMN shipments.customer_confirmed_at IS 'When customer confirmed receipt';
COMMENT ON COLUMN shipments.customer_rating IS 'Customer rating for delivery (1-5 stars)';
COMMENT ON COLUMN shipments.customer_feedback IS 'Customer feedback for delivery';
COMMENT ON COLUMN shipments.coins_rewarded IS 'Coins/xu rewarded to customer for confirming receipt';

-- Index for finding unconfirmed deliveries
CREATE INDEX IF NOT EXISTS idx_shipments_customer_confirmed 
ON shipments(customer_confirmed) 
WHERE status = 'delivered' AND customer_confirmed = FALSE;
