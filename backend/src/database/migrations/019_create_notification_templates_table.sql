-- Migration: Create notification_templates table
-- Description: Store notification templates with variable support

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    type VARCHAR(50) UNIQUE NOT NULL,
    title_template VARCHAR(200) NOT NULL,
    body_template TEXT NOT NULL,
    
    push_title VARCHAR(100),
    push_body VARCHAR(200),
    
    variables JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT true,
    version INT DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for type lookup
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
