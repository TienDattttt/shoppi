-- Migration: Create shipments table
-- Requirements: 5 (Shipment Management)

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_order_id UUID NOT NULL REFERENCES sub_orders(id) ON DELETE CASCADE,
    shipper_id UUID REFERENCES shippers(id) ON DELETE SET NULL,
    
    -- Tracking
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN (
        'created',      -- Shipment created, waiting for shipper assignment
        'assigned',     -- Shipper assigned
        'picked_up',    -- Shipper picked up from shop
        'delivering',   -- On the way to customer
        'delivered',    -- Successfully delivered
        'failed',       -- Delivery failed
        'cancelled',    -- Cancelled
        'returned'      -- Returned to shop
    )),
    
    -- Pickup location (Shop)
    pickup_address TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    pickup_contact_name VARCHAR(100),
    pickup_contact_phone VARCHAR(20),
    
    -- Delivery location (Customer)
    delivery_address TEXT NOT NULL,
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    delivery_contact_name VARCHAR(100),
    delivery_contact_phone VARCHAR(20),
    
    -- Distance and time estimates
    distance_km DECIMAL(10, 2),
    estimated_duration_minutes INTEGER,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    
    -- Actual timestamps
    assigned_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Shipping fee
    shipping_fee DECIMAL(12, 2) DEFAULT 0,
    cod_amount DECIMAL(12, 2) DEFAULT 0,
    
    -- Notes and reasons
    delivery_notes TEXT,
    failure_reason TEXT,
    return_reason TEXT,
    
    -- Proof of delivery
    delivery_photo_url TEXT,
    recipient_signature_url TEXT,
    
    -- Rating (after delivery)
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(sub_order_id)
);

-- Indexes
CREATE INDEX idx_shipments_sub_order_id ON shipments(sub_order_id);
CREATE INDEX idx_shipments_shipper_id ON shipments(shipper_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX idx_shipments_shipper_status ON shipments(shipper_id, status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipments_updated_at
    BEFORE UPDATE ON shipments
    FOR EACH ROW
    EXECUTE FUNCTION update_shipments_updated_at();

-- Comments
COMMENT ON TABLE shipments IS 'Shipment records for order deliveries';
COMMENT ON COLUMN shipments.tracking_number IS 'Unique tracking number for customer to track delivery';
COMMENT ON COLUMN shipments.cod_amount IS 'Cash on delivery amount to collect';
COMMENT ON COLUMN shipments.delivery_photo_url IS 'Photo proof of delivery';
