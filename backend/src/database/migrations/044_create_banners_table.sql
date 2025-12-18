-- Migration: Create banners table for homepage hero banners
-- Requirements: Admin can manage homepage banners

-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_text VARCHAR(100) DEFAULT 'Mua ngay',
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active banners query
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, position) WHERE is_active = true;

-- Insert default banners
INSERT INTO banners (title, description, image_url, link_url, position, is_active) VALUES
('Siêu Sale 12.12', 'Giảm đến 50% cho tất cả sản phẩm điện tử', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop', '/search?sort=best_selling', 1, true),
('Bộ sưu tập mới', 'Khám phá xu hướng thời trang mới nhất', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop', '/categories', 2, true),
('Tuần lễ công nghệ', 'Ưu đãi tốt nhất cho laptop và phụ kiện', 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?q=80&w=2070&auto=format&fit=crop', '/search?q=laptop', 3, true);

-- Add comment
COMMENT ON TABLE banners IS 'Homepage hero banners managed by admin';
