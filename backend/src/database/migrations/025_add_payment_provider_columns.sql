-- Migration: Add payment provider columns to orders table
-- Description: Store payment provider order ID and transaction ID for tracking

-- Add payment provider columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_provider_order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_provider_transaction_id VARCHAR(100);

-- Add zalopay to payment_method check constraint
-- First drop the existing constraint, then add new one
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN ('cod', 'vnpay', 'momo', 'zalopay', 'wallet'));

-- Index for payment provider order ID (for webhook lookups)
CREATE INDEX IF NOT EXISTS idx_orders_payment_provider_order_id ON orders(payment_provider_order_id);
