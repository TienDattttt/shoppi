-- Migration: Create shops table
-- Description: Shop management for partners on the e-commerce platform

CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES users(id),
    
    -- Basic Info
    shop_name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Address & Location
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    ward VARCHAR(100),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    
    -- Images
    logo_url TEXT,
    banner_url TEXT,
    
    -- Operating Hours (JSON)
    operating_hours JSONB,
    
    -- Statistics
    follower_count INT DEFAULT 0 CHECK (follower_count >= 0),
    product_count INT DEFAULT 0 CHECK (product_count >= 0),
    avg_rating DECIMAL(2,1) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    review_count INT DEFAULT 0 CHECK (review_count >= 0),
    response_rate DECIMAL(5,2) DEFAULT 0 CHECK (response_rate >= 0 AND response_rate <= 100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'active', 'rejected', 'revision_required', 'suspended')),
    rejection_reason TEXT,
    
    -- Categories
    category_ids UUID[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shops_partner ON shops(partner_id);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
CREATE INDEX IF NOT EXISTS idx_shops_created_at ON shops(created_at);
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_shops_rating ON shops(avg_rating) WHERE status = 'active';

-- Unique constraint: one shop per partner
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_unique_partner 
    ON shops(partner_id);

-- Unique constraint: shop_name must be unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_unique_name 
    ON shops(LOWER(shop_name));

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_shops_updated_at ON shops;
CREATE TRIGGER update_shops_updated_at
    BEFORE UPDATE ON shops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
