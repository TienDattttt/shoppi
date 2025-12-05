-- Migration: Create product variants table
-- Description: Product variants with different attributes (color, size, etc.)

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    
    name VARCHAR(200),
    attributes JSONB DEFAULT '{}',
    
    price DECIMAL(15,2) CHECK (price >= 0),
    compare_at_price DECIMAL(15,2) CHECK (compare_at_price >= 0),
    
    -- Inventory
    quantity INT DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INT DEFAULT 0 CHECK (reserved_quantity >= 0),
    low_stock_threshold INT DEFAULT 10 CHECK (low_stock_threshold >= 0),
    
    -- Media
    image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CHECK (reserved_quantity <= quantity)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_active ON product_variants(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_variants_quantity ON product_variants(quantity) WHERE deleted_at IS NULL;

-- GIN index for JSONB attributes
CREATE INDEX IF NOT EXISTS idx_variants_attributes ON product_variants USING GIN (attributes);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_variants_updated_at ON product_variants;
CREATE TRIGGER update_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
