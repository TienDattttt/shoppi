-- Migration: Create products table
-- Description: Main products table for e-commerce platform

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    category_id UUID REFERENCES categories(id),
    
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(250) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    
    base_price DECIMAL(15,2) NOT NULL CHECK (base_price >= 0),
    compare_at_price DECIMAL(15,2) CHECK (compare_at_price >= 0),
    currency VARCHAR(3) DEFAULT 'VND',
    
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('draft', 'pending', 'active', 'rejected', 'revision_required', 'inactive')),
    rejection_reason TEXT,
    
    -- Aggregated data
    total_sold INT DEFAULT 0 CHECK (total_sold >= 0),
    view_count INT DEFAULT 0 CHECK (view_count >= 0),
    avg_rating DECIMAL(2,1) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    review_count INT DEFAULT 0 CHECK (review_count >= 0),
    
    -- SEO
    meta_title VARCHAR(100),
    meta_description VARCHAR(200),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_price ON products(base_price) WHERE deleted_at IS NULL;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
