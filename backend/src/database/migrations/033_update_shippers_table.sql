-- Migration: Update shippers table for COD management
-- Requirements: 3.2 (Shipper Assignment), 6.4 (COD Management)
-- Task: 1.2 Create migration for shippers table updates

-- ========================================
-- ADD COD TRACKING COLUMNS
-- Thêm các cột để theo dõi COD hàng ngày của shipper
-- ========================================

-- Daily COD collected amount
ALTER TABLE shippers
ADD COLUMN IF NOT EXISTS daily_cod_collected DECIMAL(12, 2) DEFAULT 0;

-- Date when COD was last collected/reset
ALTER TABLE shippers
ADD COLUMN IF NOT EXISTS daily_cod_collected_at DATE;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON COLUMN shippers.daily_cod_collected IS 'Tổng tiền COD shipper đã thu trong ngày';
COMMENT ON COLUMN shippers.daily_cod_collected_at IS 'Ngày thu COD (để reset hàng ngày)';

-- ========================================
-- NOTE: Columns already added in migration 030:
-- - post_office_id UUID REFERENCES post_offices(id)
-- - current_pickup_count INTEGER DEFAULT 0
-- - current_delivery_count INTEGER DEFAULT 0
-- - max_daily_orders INTEGER DEFAULT 50
-- ========================================
