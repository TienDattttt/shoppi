-- Migration: Create reviews table
-- Description: Product reviews and ratings from customers

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID,
    
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    content TEXT,
    
    is_verified_purchase BOOLEAN DEFAULT false,
    
    -- Partner reply
    reply TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    replied_by UUID REFERENCES users(id),
    
    -- Moderation
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged')),
    
    -- Helpful votes
    helpful_count INT DEFAULT 0 CHECK (helpful_count >= 0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(product_id, rating) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(product_id, created_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(product_id, is_verified_purchase) WHERE status = 'active';

-- Unique constraint: one review per user per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_user_product 
    ON reviews(user_id, product_id) 
    WHERE status = 'active';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update product rating when review changes
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE products SET
        avg_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND status = 'active'
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
            AND status = 'active'
        )
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product rating
DROP TRIGGER IF EXISTS update_product_rating_trigger ON reviews;
CREATE TRIGGER update_product_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_product_rating();
