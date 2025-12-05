-- Migration: Create shippers table
-- Requirements: 4 (Shipper Management)

CREATE TABLE IF NOT EXISTS shippers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Vehicle information
    vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('motorbike', 'car', 'bicycle', 'truck')),
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_brand VARCHAR(50),
    vehicle_model VARCHAR(50),
    
    -- Identity documents
    id_card_number VARCHAR(20),
    driver_license VARCHAR(50),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    
    -- Current location (updated in real-time)
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    
    -- Statistics
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    avg_rating DECIMAL(2, 1) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    
    -- Working area (optional)
    working_district VARCHAR(100),
    working_city VARCHAR(100),
    max_distance_km DECIMAL(5, 2) DEFAULT 10,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(user_id),
    UNIQUE(vehicle_plate)
);

-- Indexes
CREATE INDEX idx_shippers_user_id ON shippers(user_id);
CREATE INDEX idx_shippers_status ON shippers(status);
CREATE INDEX idx_shippers_is_online ON shippers(is_online) WHERE is_online = true;
CREATE INDEX idx_shippers_location ON shippers(current_lat, current_lng) WHERE is_online = true;
CREATE INDEX idx_shippers_working_area ON shippers(working_city, working_district);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shippers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shippers_updated_at
    BEFORE UPDATE ON shippers
    FOR EACH ROW
    EXECUTE FUNCTION update_shippers_updated_at();

-- Comments
COMMENT ON TABLE shippers IS 'Shipper profiles and status';
COMMENT ON COLUMN shippers.is_online IS 'Whether shipper is currently online and accepting deliveries';
COMMENT ON COLUMN shippers.is_available IS 'Whether shipper is available (not currently on a delivery)';
COMMENT ON COLUMN shippers.current_lat IS 'Current latitude from GPS tracking';
COMMENT ON COLUMN shippers.current_lng IS 'Current longitude from GPS tracking';
