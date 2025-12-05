-- Migration: Create categories table
-- Description: Hierarchical product categories (max 3 levels)

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id),
    
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    
    level INT DEFAULT 1 CHECK (level >= 1 AND level <= 3),
    path TEXT,
    
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- SEO
    meta_title VARCHAR(100),
    meta_description VARCHAR(200),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(parent_id, sort_order) WHERE is_active = true;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update path and level on insert/update
CREATE OR REPLACE FUNCTION update_category_path_and_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.level = 1;
        NEW.path = '/' || NEW.slug;
    ELSE
        SELECT level + 1, path || '/' || NEW.slug
        INTO NEW.level, NEW.path
        FROM categories
        WHERE id = NEW.parent_id;
        
        IF NEW.level > 3 THEN
            RAISE EXCEPTION 'Category hierarchy cannot exceed 3 levels';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update path and level
DROP TRIGGER IF EXISTS update_category_path_level ON categories;
CREATE TRIGGER update_category_path_level
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_category_path_and_level();
