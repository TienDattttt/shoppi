-- Migration: Create Return Requests table
-- Description: Tables for managing product return/refund requests

-- ========================================
-- 1. RETURN REQUESTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    order_id UUID NOT NULL REFERENCES orders(id),
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    shop_id UUID NOT NULL REFERENCES shops(id),
    
    -- Request details
    request_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Reason: damaged, wrong_item, not_as_described, change_mind, other
    reason VARCHAR(50) NOT NULL 
        CHECK (reason IN ('damaged', 'wrong_item', 'not_as_described', 'defective', 'change_mind', 'other')),
    reason_detail TEXT,
    
    -- Type: return (trả hàng hoàn tiền), refund_only (chỉ hoàn tiền)
    request_type VARCHAR(20) NOT NULL DEFAULT 'return'
        CHECK (request_type IN ('return', 'refund_only', 'exchange')),
    
    -- Status flow: pending -> approved/rejected -> (escalated) -> shipping -> received -> refunded/completed
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN (
            'pending',           -- Chờ shop xử lý
            'approved',          -- Shop đồng ý
            'rejected',          -- Shop từ chối
            'escalated',         -- Khách khiếu nại lên Admin
            'shipping',          -- Đang gửi trả hàng
            'received',          -- Shop đã nhận hàng
            'refunding',         -- Đang hoàn tiền
            'refunded',          -- Đã hoàn tiền
            'completed',         -- Hoàn tất
            'cancelled'          -- Khách hủy yêu cầu
        )),
    
    -- Refund amount
    refund_amount DECIMAL(15, 2) NOT NULL,
    refund_shipping BOOLEAN DEFAULT false,
    
    -- Evidence (photos/videos)
    evidence_urls TEXT[], -- Array of image/video URLs
    
    -- Shop response
    shop_response TEXT,
    shop_responded_at TIMESTAMP WITH TIME ZONE,
    shop_responded_by UUID REFERENCES users(id),
    
    -- Admin intervention (escalation)
    admin_note TEXT,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalation_reason TEXT,
    escalation_evidence_urls TEXT[],
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Return shipping
    return_tracking_number VARCHAR(50),
    return_shipper VARCHAR(100),
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    
    -- Refund info
    refund_method VARCHAR(20), -- original, wallet, bank
    refund_transaction_id VARCHAR(100),
    refunded_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE -- Auto-approve if shop doesn't respond
);

-- ========================================
-- 2. RETURN REQUEST ITEMS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS return_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    
    -- Denormalized product info for display
    product_name VARCHAR(255),
    product_image TEXT,
    variant_name VARCHAR(255),
    
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    
    -- Item-specific reason (optional)
    item_reason TEXT,
    item_evidence_urls TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. RETURN REQUEST HISTORY TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS return_request_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('customer', 'shop', 'admin', 'system')),
    actor_id UUID REFERENCES users(id),
    
    note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_sub_order ON return_requests(sub_order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer ON return_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_shop ON return_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_requests_number ON return_requests(request_number);

CREATE INDEX IF NOT EXISTS idx_return_request_items_request ON return_request_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_request_history_request ON return_request_history(return_request_id);

-- ========================================
-- 5. TRIGGERS
-- ========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_return_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_return_requests_updated_at
    BEFORE UPDATE ON return_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_return_request_updated_at();

-- Generate request number
CREATE OR REPLACE FUNCTION generate_return_request_number()
RETURNS TRIGGER AS $$
DECLARE
    seq_num INTEGER;
BEGIN
    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 9) AS INTEGER)), 0) + 1
    INTO seq_num
    FROM return_requests
    WHERE request_number LIKE 'RR' || TO_CHAR(NOW(), 'YYMMDD') || '%';
    
    NEW.request_number = 'RR' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_return_request_number
    BEFORE INSERT ON return_requests
    FOR EACH ROW
    WHEN (NEW.request_number IS NULL)
    EXECUTE FUNCTION generate_return_request_number();

-- Set expiry date (3 days for shop to respond)
CREATE OR REPLACE FUNCTION set_return_request_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at IS NULL THEN
        NEW.expires_at = NOW() + INTERVAL '3 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_return_request_expiry
    BEFORE INSERT ON return_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_return_request_expiry();

-- ========================================
-- 6. COMMENTS
-- ========================================
COMMENT ON TABLE return_requests IS 'Customer return/refund requests';
COMMENT ON TABLE return_request_items IS 'Items included in return request';
COMMENT ON TABLE return_request_history IS 'Status change history for return requests';
