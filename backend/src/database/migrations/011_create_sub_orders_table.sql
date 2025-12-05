-- Migration: Create sub_orders table
-- Description: Sub-orders per shop (each shop has one sub-order per main order)

CREATE TABLE IF NOT EXISTS sub_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL,
    
    -- Totals
    subtotal DECIMAL(15,2) NOT NULL,
    shipping_fee DECIMAL(15,2) DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'processing', 'ready_to_ship',
                          'shipping', 'delivered', 'completed', 'cancelled', 
                          'return_requested', 'return_approved', 'returned', 'refunded')),
    
    -- Voucher
    shop_voucher_id UUID,
    
    -- Shipping
    tracking_number VARCHAR(50),
    shipper_id UUID,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Return window
    return_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Partner notes
    partner_note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_orders_order ON sub_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_shop ON sub_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_status ON sub_orders(status);
CREATE INDEX IF NOT EXISTS idx_sub_orders_shipper ON sub_orders(shipper_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_tracking ON sub_orders(tracking_number);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_sub_orders_updated_at ON sub_orders;
CREATE TRIGGER update_sub_orders_updated_at
    BEFORE UPDATE ON sub_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
