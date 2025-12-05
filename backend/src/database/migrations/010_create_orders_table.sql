-- Migration: Create orders table
-- Description: Main orders table for e-commerce platform

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Totals
    subtotal DECIMAL(15,2) NOT NULL,
    shipping_total DECIMAL(15,2) DEFAULT 0,
    discount_total DECIMAL(15,2) DEFAULT 0,
    grand_total DECIMAL(15,2) NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending_payment'
        CHECK (status IN ('pending_payment', 'payment_failed', 'confirmed', 
                          'completed', 'cancelled', 'refunded')),
    
    -- Payment
    payment_method VARCHAR(20) CHECK (payment_method IN ('cod', 'vnpay', 'momo', 'wallet')),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Shipping
    shipping_address_id UUID,
    shipping_name VARCHAR(100),
    shipping_phone VARCHAR(20),
    shipping_address TEXT,
    
    -- Vouchers
    platform_voucher_id UUID,
    
    -- Notes
    customer_note TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
