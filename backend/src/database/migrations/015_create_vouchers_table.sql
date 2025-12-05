-- Migration: Create vouchers table
-- Description: Discount vouchers (platform and shop vouchers)

CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Type: platform (applies to entire order) or shop (applies to specific shop)
    type VARCHAR(20) CHECK (type IN ('platform', 'shop')),
    shop_id UUID, -- NULL for platform vouchers
    
    -- Discount configuration
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(15,2) NOT NULL,
    max_discount DECIMAL(15,2), -- Cap for percentage discounts
    min_order_value DECIMAL(15,2) DEFAULT 0,
    
    -- Usage limits
    usage_limit INT, -- Total usage limit (NULL = unlimited)
    used_count INT DEFAULT 0,
    per_user_limit INT DEFAULT 1, -- How many times each user can use
    
    -- Validity period
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_shop ON vouchers(shop_id) WHERE shop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active, start_date, end_date) 
    WHERE is_active = true;

-- Voucher usages tracking table
CREATE TABLE IF NOT EXISTS voucher_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID NOT NULL REFERENCES vouchers(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(voucher_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_voucher_usages_voucher ON voucher_usages(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usages_user ON voucher_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usages_order ON voucher_usages(order_id);
