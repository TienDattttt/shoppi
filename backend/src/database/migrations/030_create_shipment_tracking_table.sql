-- Migration: Create shipment tracking events table
-- Mục đích: Lưu lịch sử tracking chi tiết cho người dùng theo dõi
-- Giả lập luồng giao vận thực tế: Shop -> Bưu cục lấy hàng -> Kho trung chuyển -> Bưu cục giao -> Khách

-- ========================================
-- BẢNG SHIPMENT TRACKING EVENTS
-- Lưu từng sự kiện tracking theo thời gian
-- ========================================
CREATE TABLE IF NOT EXISTS shipment_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    
    -- Event info
    status VARCHAR(50) NOT NULL,
    status_vi VARCHAR(100) NOT NULL,  -- Vietnamese description
    description TEXT,
    description_vi TEXT,              -- Vietnamese description
    
    -- Location info (where event happened)
    location_name VARCHAR(200),       -- e.g., "Bưu cục Quận 1", "Kho trung chuyển HCM"
    location_address TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    
    -- Actor info
    actor_type VARCHAR(20),           -- 'system', 'shipper', 'warehouse', 'shop'
    actor_id UUID,
    actor_name VARCHAR(100),
    
    -- Timestamps
    event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tracking_shipment_id ON shipment_tracking_events(shipment_id);
CREATE INDEX idx_tracking_event_time ON shipment_tracking_events(event_time DESC);
CREATE INDEX idx_tracking_status ON shipment_tracking_events(status);

-- ========================================
-- BẢNG POST OFFICES (BƯU CỤC)
-- Lưu thông tin các bưu cục trong hệ thống
-- ========================================
CREATE TABLE IF NOT EXISTS post_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,  -- e.g., "HCM-Q1-001"
    name VARCHAR(200) NOT NULL,
    name_vi VARCHAR(200) NOT NULL,
    
    -- Location
    address TEXT NOT NULL,
    district VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(20) CHECK (region IN ('north', 'central', 'south')),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    -- Type (chỉ có 2 loại: local và regional, không có hub)
    office_type VARCHAR(20) NOT NULL CHECK (office_type IN (
        'local',        -- Bưu cục địa phương (lấy/giao hàng)
        'regional'      -- Kho trung chuyển miền (Bắc/Trung/Nam)
    )),
    
    -- Parent office (for hierarchy)
    parent_office_id UUID REFERENCES post_offices(id),
    
    -- Contact
    phone VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_post_offices_code ON post_offices(code);
CREATE INDEX idx_post_offices_district ON post_offices(district, city);
CREATE INDEX idx_post_offices_region ON post_offices(region);
CREATE INDEX idx_post_offices_type ON post_offices(office_type);
CREATE INDEX idx_post_offices_location ON post_offices(lat, lng);

-- ========================================
-- ALTER SHIPMENTS TABLE
-- Thêm các cột mới cho tracking chi tiết
-- ========================================
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS pickup_office_id UUID REFERENCES post_offices(id),
ADD COLUMN IF NOT EXISTS delivery_office_id UUID REFERENCES post_offices(id),
ADD COLUMN IF NOT EXISTS pickup_shipper_id UUID REFERENCES shippers(id),
ADD COLUMN IF NOT EXISTS delivery_shipper_id UUID REFERENCES shippers(id),
ADD COLUMN IF NOT EXISTS current_location_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS current_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS current_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS last_tracking_update TIMESTAMP WITH TIME ZONE;

-- ========================================
-- ALTER SHIPPERS TABLE
-- Thêm bưu cục mà shipper thuộc về
-- ========================================
ALTER TABLE shippers
ADD COLUMN IF NOT EXISTS post_office_id UUID REFERENCES post_offices(id),
ADD COLUMN IF NOT EXISTS current_pickup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_delivery_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_daily_orders INTEGER DEFAULT 50;

-- Index cho việc tìm shipper theo bưu cục
CREATE INDEX IF NOT EXISTS idx_shippers_post_office ON shippers(post_office_id) WHERE post_office_id IS NOT NULL;

-- ========================================
-- NOTE: Seed data được chuyển sang script riêng
-- Chạy: node src/database/seeds/vietnam-administrative.js
-- 
-- Script sẽ tạo:
-- - 34 tỉnh/thành phố (theo cải cách hành chính mới)
-- - 3321 xã/phường
-- - 3 kho trung chuyển miền (Bắc, Trung, Nam)
-- - Bưu cục cho mỗi xã/phường
-- ========================================

-- Comments
COMMENT ON TABLE shipment_tracking_events IS 'Lịch sử tracking chi tiết của shipment';
COMMENT ON TABLE post_offices IS 'Danh sách bưu cục và kho trung chuyển';
COMMENT ON COLUMN shipment_tracking_events.status_vi IS 'Mô tả trạng thái bằng tiếng Việt cho UI';
