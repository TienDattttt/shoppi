-- Migration: Create follows table
-- Description: Follow relationships between customers and shops

CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: a user can only follow a shop once
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique_user_shop 
    ON follows(user_id, shop_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_shop ON follows(shop_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);
