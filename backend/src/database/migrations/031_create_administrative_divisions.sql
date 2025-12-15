-- Migration: Create administrative divisions tables
-- Dữ liệu hành chính Việt Nam theo Công văn số 2896/BNV-CQĐP của Bộ Nội Vụ
-- Cấu trúc mới: Chỉ còn 2 cấp - Tỉnh/TP và Xã/Phường

-- ========================================
-- BẢNG TỈNH/THÀNH PHỐ (34 đơn vị sau sáp nhập)
-- ========================================
CREATE TABLE IF NOT EXISTS provinces (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,      -- Mã tỉnh (01, 04, 08, ...)
    name VARCHAR(100) NOT NULL,            -- Tên ngắn (Hà Nội, Cao Bằng...)
    full_name VARCHAR(150),                -- Tên đầy đủ (Thành phố Hà Nội, Tỉnh Cao Bằng...)
    short_code VARCHAR(10),                -- Mã viết tắt (HNI, CBG, TGQ...)
    code_name VARCHAR(50),                 -- Slug (ha-noi, cao-bang...)
    
    -- Loại đơn vị hành chính
    place_type VARCHAR(50),                -- "Thành phố Trung Ương", "Tỉnh"
    
    -- Phân vùng miền
    region VARCHAR(20) NOT NULL CHECK (region IN ('north', 'central', 'south')),
    
    -- Tọa độ trung tâm
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BẢNG XÃ/PHƯỜNG (3321 đơn vị)
-- Đây là cấp hành chính thấp nhất, trực thuộc tỉnh
-- ========================================
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,      -- Mã xã/phường (ward_code)
    name VARCHAR(100) NOT NULL,            -- Tên (Phường Ba Đình, Xã Sóc Sơn...)
    code_name VARCHAR(50),                 -- Slug
    
    -- Liên kết tỉnh (trực thuộc)
    province_code VARCHAR(10) NOT NULL REFERENCES provinces(code),
    
    -- Loại đơn vị
    ward_type VARCHAR(20),                 -- 'phuong' (đô thị), 'xa' (nông thôn)
    
    -- Tọa độ
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_provinces_region ON provinces(region);
CREATE INDEX idx_provinces_code ON provinces(code);
CREATE INDEX idx_wards_province ON wards(province_code);
CREATE INDEX idx_wards_code ON wards(code);
CREATE INDEX idx_wards_type ON wards(ward_type);

-- ========================================
-- XÓA BẢNG DISTRICTS CŨ (không còn cấp quận/huyện)
-- ========================================
DROP TABLE IF EXISTS districts CASCADE;

-- ========================================
-- CẬP NHẬT BẢNG POST_OFFICES
-- Liên kết với wards thay vì districts
-- ============================ ============
ALTER TABLE post_offices 
DROP CONSTRAINT IF EXISTS post_offices_office_type_check;

ALTER TABLE post_offices 
ADD CONSTRAINT post_offices_office_type_check 
CHECK (office_type IN ('local', 'regional'));

-- Xóa cột district_code cũ nếu có
ALTER TABLE post_offices DROP COLUMN IF EXISTS district_code;

-- Thêm liên kết với ward
ALTER TABLE post_offices
ADD COLUMN IF NOT EXISTS province_code VARCHAR(10) REFERENCES provinces(code),
ADD COLUMN IF NOT EXISTS ward_code VARCHAR(10) REFERENCES wards(code);

-- Index
CREATE INDEX IF NOT EXISTS idx_post_offices_province ON post_offices(province_code);
CREATE INDEX IF NOT EXISTS idx_post_offices_ward ON post_offices(ward_code);

-- Comments
COMMENT ON TABLE provinces IS 'Danh sách tỉnh/thành phố trực thuộc trung ương (34 đơn vị)';
COMMENT ON TABLE wards IS 'Danh sách xã/phường trực thuộc tỉnh (3321 đơn vị)';
COMMENT ON COLUMN wards.ward_type IS 'phuong = đô thị, xa = nông thôn';
