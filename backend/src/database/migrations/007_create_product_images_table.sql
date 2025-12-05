-- Migration: Create product images table
-- Description: Images associated with products

CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    url TEXT NOT NULL,
    alt_text VARCHAR(200),
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    
    -- File metadata
    file_size INT,
    width INT,
    height INT,
    format VARCHAR(10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_sort_order ON product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary image per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_images_one_primary 
    ON product_images(product_id) 
    WHERE is_primary = true;
