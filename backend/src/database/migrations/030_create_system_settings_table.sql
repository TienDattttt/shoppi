-- Migration: Create system_settings table
-- Description: Store platform-wide configuration settings

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
    ('site_name', '"Shoppi"', 'Platform name'),
    ('contact_email', '"contact@shoppi.com"', 'Contact email'),
    ('maintenance_mode', 'false', 'Enable maintenance mode'),
    ('auto_approve_products', 'true', 'Auto approve products from trusted shops')
ON CONFLICT (key) DO NOTHING;
