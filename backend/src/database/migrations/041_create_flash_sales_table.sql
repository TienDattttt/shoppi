-- Migration: Create Flash Sales tables
-- Description: Tables for managing flash sale campaigns and products

-- ========================================
-- 1. FLASH SALES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS flash_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status: draft, scheduled, active, ended, cancelled
    status VARCHAR(20) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'scheduled', 'active', 'ended', 'cancelled')),
    
    -- Limits
    max_products INTEGER DEFAULT 100,
    
    -- Display
    banner_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. FLASH SALE PRODUCTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS flash_sale_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flash_sale_id UUID NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    
    -- Pricing
    original_price DECIMAL(15, 2) NOT NULL,
    flash_price DECIMAL(15, 2) NOT NULL,
    discount_percent INTEGER GENERATED ALWAYS AS (
        CASE WHEN original_price > 0 
        THEN ROUND(((original_price - flash_price) / original_price) * 100)
        ELSE 0 END
    ) STORED,
    
    -- Stock limits
    flash_stock INTEGER NOT NULL DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    
    -- Per-user limit
    limit_per_user INTEGER DEFAULT 1,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(flash_sale_id, product_id, variant_id),
    CHECK (flash_price > 0),
    CHECK (flash_price < original_price),
    CHECK (flash_stock >= 0),
    CHECK (sold_count >= 0 AND sold_count <= flash_stock)
);

-- ========================================
-- 3. FLASH SALE PURCHASES (tracking)
-- ========================================
CREATE TABLE IF NOT EXISTS flash_sale_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flash_sale_id UUID NOT NULL REFERENCES flash_sales(id),
    flash_sale_product_id UUID NOT NULL REFERENCES flash_sale_products(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for checking user purchase limits
    UNIQUE(flash_sale_product_id, user_id, order_id)
);

-- ========================================
-- 4. INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_flash_sales_status ON flash_sales(status);
CREATE INDEX IF NOT EXISTS idx_flash_sales_timing ON flash_sales(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_flash_sales_featured ON flash_sales(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_flash_sale_products_sale ON flash_sale_products(flash_sale_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_products_product ON flash_sale_products(product_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_products_active ON flash_sale_products(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_flash_sale_purchases_user ON flash_sale_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_flash_sale_purchases_product ON flash_sale_purchases(flash_sale_product_id);

-- ========================================
-- 5. TRIGGERS
-- ========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_flash_sale_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_flash_sales_updated_at
    BEFORE UPDATE ON flash_sales
    FOR EACH ROW
    EXECUTE FUNCTION update_flash_sale_updated_at();

CREATE TRIGGER trigger_flash_sale_products_updated_at
    BEFORE UPDATE ON flash_sale_products
    FOR EACH ROW
    EXECUTE FUNCTION update_flash_sale_updated_at();

-- Auto-update flash sale status based on time
CREATE OR REPLACE FUNCTION auto_update_flash_sale_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If scheduled and start_time has passed, set to active
    IF NEW.status = 'scheduled' AND NEW.start_time <= NOW() THEN
        NEW.status = 'active';
    END IF;
    
    -- If active and end_time has passed, set to ended
    IF NEW.status = 'active' AND NEW.end_time <= NOW() THEN
        NEW.status = 'ended';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_flash_sale_auto_status
    BEFORE INSERT OR UPDATE ON flash_sales
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_flash_sale_status();

-- ========================================
-- 6. COMMENTS
-- ========================================
COMMENT ON TABLE flash_sales IS 'Flash sale campaigns with time-limited discounts';
COMMENT ON TABLE flash_sale_products IS 'Products included in flash sales with special pricing';
COMMENT ON TABLE flash_sale_purchases IS 'Track user purchases during flash sales for limit enforcement';
