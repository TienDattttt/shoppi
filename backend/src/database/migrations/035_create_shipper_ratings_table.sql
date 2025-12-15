-- Migration: Create shipper_ratings table
-- Requirements: 15.1, 15.2 (Shipper Rating System)

CREATE TABLE IF NOT EXISTS shipper_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    shipper_id UUID NOT NULL REFERENCES shippers(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rating (1-5 stars)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    
    -- Optional feedback comment
    comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one rating per shipment
    UNIQUE(shipment_id)
);

-- Indexes
CREATE INDEX idx_shipper_ratings_shipment_id ON shipper_ratings(shipment_id);
CREATE INDEX idx_shipper_ratings_shipper_id ON shipper_ratings(shipper_id);
CREATE INDEX idx_shipper_ratings_customer_id ON shipper_ratings(customer_id);
CREATE INDEX idx_shipper_ratings_created_at ON shipper_ratings(created_at DESC);
CREATE INDEX idx_shipper_ratings_shipper_rating ON shipper_ratings(shipper_id, rating);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shipper_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shipper_ratings_updated_at
    BEFORE UPDATE ON shipper_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_shipper_ratings_updated_at();

-- Function to update shipper's average rating when a rating is added/updated/deleted
CREATE OR REPLACE FUNCTION update_shipper_avg_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_shipper_id UUID;
BEGIN
    -- Determine which shipper to update
    IF TG_OP = 'DELETE' THEN
        target_shipper_id := OLD.shipper_id;
    ELSE
        target_shipper_id := NEW.shipper_id;
    END IF;
    
    -- Update shipper's avg_rating and total_ratings
    UPDATE shippers SET
        avg_rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
            FROM shipper_ratings
            WHERE shipper_id = target_shipper_id
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM shipper_ratings
            WHERE shipper_id = target_shipper_id
        )
    WHERE id = target_shipper_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update shipper rating
CREATE TRIGGER trigger_update_shipper_avg_rating
    AFTER INSERT OR UPDATE OR DELETE ON shipper_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_shipper_avg_rating();

-- Comments
COMMENT ON TABLE shipper_ratings IS 'Customer ratings for shipper delivery service';
COMMENT ON COLUMN shipper_ratings.shipment_id IS 'Reference to the shipment being rated';
COMMENT ON COLUMN shipper_ratings.shipper_id IS 'Reference to the shipper being rated';
COMMENT ON COLUMN shipper_ratings.customer_id IS 'Reference to the customer who submitted the rating';
COMMENT ON COLUMN shipper_ratings.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN shipper_ratings.comment IS 'Optional feedback comment from customer';
