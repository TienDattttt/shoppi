-- Migration: Create payments table
-- Description: Store payment transactions for orders

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    
    -- Payment provider info
    provider VARCHAR(50) NOT NULL, -- 'momo', 'vnpay', 'zalopay', 'cod'
    provider_transaction_id VARCHAR(255), -- Transaction ID from provider
    provider_order_id VARCHAR(255), -- Order ID sent to provider
    
    -- Payment details
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'VND',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Payment URLs
    pay_url TEXT, -- URL to redirect user for payment
    return_url TEXT, -- URL to return after payment
    callback_url TEXT, -- Webhook callback URL
    
    -- Provider response data
    provider_response JSONB, -- Full response from provider
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Timestamps
    paid_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_provider ON payments(provider);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider_transaction_id ON payments(provider_transaction_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Unique constraint for provider transaction
CREATE UNIQUE INDEX idx_payments_provider_txn 
ON payments(provider, provider_transaction_id) 
WHERE provider_transaction_id IS NOT NULL;

-- Status check constraint
ALTER TABLE payments 
ADD CONSTRAINT chk_payments_status 
CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'expired'));

-- Provider check constraint
ALTER TABLE payments 
ADD CONSTRAINT chk_payments_provider 
CHECK (provider IN ('momo', 'vnpay', 'zalopay', 'cod', 'bank_transfer'));

-- Amount check constraint
ALTER TABLE payments 
ADD CONSTRAINT chk_payments_amount 
CHECK (amount > 0);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Create voucher_usage table for tracking voucher applications
CREATE TABLE IF NOT EXISTS voucher_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL,
    order_id UUID NOT NULL,
    user_id UUID NOT NULL,
    discount_amount DECIMAL(15,2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_voucher_usage_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
    CONSTRAINT fk_voucher_usage_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_voucher_usage_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_voucher_usage_voucher_id ON voucher_usage(voucher_id);
CREATE INDEX idx_voucher_usage_user_id ON voucher_usage(user_id);
CREATE UNIQUE INDEX idx_voucher_usage_unique ON voucher_usage(voucher_id, order_id);
