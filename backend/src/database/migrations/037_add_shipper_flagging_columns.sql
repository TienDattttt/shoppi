-- Migration: Add shipper flagging columns for low rating
-- Requirements: 15.4 (Flag shipper when rating falls below 3.5)
-- Task: 11.3 Implement low rating flagging

-- ========================================
-- ADD FLAGGING COLUMNS
-- Thêm các cột để đánh dấu shipper cần review
-- ========================================

-- Flag status
ALTER TABLE shippers
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- Reason for flagging
ALTER TABLE shippers
ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

-- When the shipper was flagged
ALTER TABLE shippers
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE;

-- ========================================
-- INDEX FOR FLAGGED SHIPPERS
-- ========================================
CREATE INDEX IF NOT EXISTS idx_shippers_is_flagged ON shippers(is_flagged) WHERE is_flagged = true;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON COLUMN shippers.is_flagged IS 'Shipper đã bị đánh dấu cần review (do rating thấp hoặc vi phạm)';
COMMENT ON COLUMN shippers.flagged_reason IS 'Lý do bị đánh dấu';
COMMENT ON COLUMN shippers.flagged_at IS 'Thời điểm bị đánh dấu';
