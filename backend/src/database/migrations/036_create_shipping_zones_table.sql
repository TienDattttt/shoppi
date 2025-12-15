-- Migration: Create shipping_zones table
-- Requirements: 11.2 (Zone-based pricing for shipping fee calculation)

CREATE TABLE IF NOT EXISTS shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zone type: determines pricing tier based on delivery distance
    zone_type VARCHAR(30) NOT NULL CHECK (zone_type IN ('same_district', 'same_city', 'same_region', 'different_region')),
    
    -- Pricing configuration
    base_fee DECIMAL(12, 2) NOT NULL,
    per_km_fee DECIMAL(12, 2) DEFAULT 0,
    
    -- Delivery time estimate
    estimated_days INTEGER NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one active zone per type
    UNIQUE(zone_type)
);

-- Indexes
CREATE INDEX idx_shipping_zones_zone_type ON shipping_zones(zone_type);
CREATE INDEX idx_shipping_zones_is_active ON shipping_zones(is_active) WHERE is_active = true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shipping_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipping_zones_updated_at
    BEFORE UPDATE ON shipping_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_shipping_zones_updated_at();

-- Insert default shipping zones
INSERT INTO shipping_zones (zone_type, base_fee, per_km_fee, estimated_days) VALUES
    ('same_district', 15000, 2000, 1),
    ('same_city', 20000, 2500, 2),
    ('same_region', 30000, 3000, 3),
    ('different_region', 40000, 3500, 5)
ON CONFLICT (zone_type) DO NOTHING;

-- Comments
COMMENT ON TABLE shipping_zones IS 'Shipping fee zones based on delivery distance';
COMMENT ON COLUMN shipping_zones.zone_type IS 'Zone classification: same_district, same_city, same_region, different_region';
COMMENT ON COLUMN shipping_zones.base_fee IS 'Base shipping fee in VND for this zone';
COMMENT ON COLUMN shipping_zones.per_km_fee IS 'Additional fee per kilometer in VND';
COMMENT ON COLUMN shipping_zones.estimated_days IS 'Estimated delivery time in days';
COMMENT ON COLUMN shipping_zones.is_active IS 'Whether this zone is currently active for shipping';
