-- Migration: Create inventory management functions
-- Description: Atomic functions for real-time inventory management (Shopee-like)

-- ============================================
-- FUNCTION: Reserve stock atomically
-- Used when customer adds to cart or places order
-- ============================================
CREATE OR REPLACE FUNCTION reserve_stock(
    p_variant_id UUID,
    p_quantity INT
)
RETURNS TABLE (
    success BOOLEAN,
    available_quantity INT,
    reserved_quantity INT,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_qty INT;
    v_current_reserved INT;
    v_available INT;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT quantity, reserved_quantity 
    INTO v_current_qty, v_current_reserved
    FROM product_variants 
    WHERE id = p_variant_id AND deleted_at IS NULL
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 'Variant not found'::TEXT;
        RETURN;
    END IF;
    
    v_available := v_current_qty - v_current_reserved;
    
    IF v_available < p_quantity THEN
        RETURN QUERY SELECT false, v_available, v_current_reserved, 
            format('Insufficient stock. Available: %s, Requested: %s', v_available, p_quantity)::TEXT;
        RETURN;
    END IF;
    
    -- Reserve the stock
    UPDATE product_variants 
    SET reserved_quantity = reserved_quantity + p_quantity,
        updated_at = NOW()
    WHERE id = p_variant_id;
    
    RETURN QUERY SELECT true, v_available - p_quantity, v_current_reserved + p_quantity, 'Stock reserved successfully'::TEXT;
END;
$$;

-- ============================================
-- FUNCTION: Release reserved stock atomically
-- Used when order is cancelled or cart item removed
-- ============================================
CREATE OR REPLACE FUNCTION release_stock(
    p_variant_id UUID,
    p_quantity INT
)
RETURNS TABLE (
    success BOOLEAN,
    available_quantity INT,
    reserved_quantity INT,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_qty INT;
    v_current_reserved INT;
    v_release_amount INT;
BEGIN
    -- Lock the row for update
    SELECT quantity, reserved_quantity 
    INTO v_current_qty, v_current_reserved
    FROM product_variants 
    WHERE id = p_variant_id AND deleted_at IS NULL
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 'Variant not found'::TEXT;
        RETURN;
    END IF;
    
    -- Can't release more than reserved
    v_release_amount := LEAST(p_quantity, v_current_reserved);
    
    -- Release the stock
    UPDATE product_variants 
    SET reserved_quantity = reserved_quantity - v_release_amount,
        updated_at = NOW()
    WHERE id = p_variant_id;
    
    RETURN QUERY SELECT true, 
        v_current_qty - (v_current_reserved - v_release_amount), 
        v_current_reserved - v_release_amount, 
        format('Released %s units', v_release_amount)::TEXT;
END;
$$;

-- ============================================
-- FUNCTION: Confirm stock deduction atomically
-- Used when order is completed/delivered
-- ============================================
CREATE OR REPLACE FUNCTION confirm_stock_deduction(
    p_variant_id UUID,
    p_quantity INT
)
RETURNS TABLE (
    success BOOLEAN,
    new_quantity INT,
    new_reserved INT,
    is_out_of_stock BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_qty INT;
    v_current_reserved INT;
    v_new_qty INT;
    v_new_reserved INT;
BEGIN
    -- Lock the row for update
    SELECT quantity, reserved_quantity 
    INTO v_current_qty, v_current_reserved
    FROM product_variants 
    WHERE id = p_variant_id AND deleted_at IS NULL
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, false, 'Variant not found'::TEXT;
        RETURN;
    END IF;
    
    v_new_qty := v_current_qty - p_quantity;
    v_new_reserved := GREATEST(0, v_current_reserved - p_quantity);
    
    IF v_new_qty < 0 THEN
        RETURN QUERY SELECT false, v_current_qty, v_current_reserved, false, 
            'Insufficient stock for deduction'::TEXT;
        RETURN;
    END IF;
    
    -- Deduct the stock
    UPDATE product_variants 
    SET quantity = v_new_qty,
        reserved_quantity = v_new_reserved,
        is_active = (v_new_qty > 0),
        updated_at = NOW()
    WHERE id = p_variant_id;
    
    -- Update product total_sold
    UPDATE products 
    SET total_sold = total_sold + p_quantity,
        updated_at = NOW()
    WHERE id = (SELECT product_id FROM product_variants WHERE id = p_variant_id);
    
    RETURN QUERY SELECT true, v_new_qty, v_new_reserved, (v_new_qty = 0), 'Stock deducted successfully'::TEXT;
END;
$$;

-- ============================================
-- FUNCTION: Check stock availability
-- Used before adding to cart or checkout
-- ============================================
CREATE OR REPLACE FUNCTION check_stock_availability(
    p_variant_id UUID,
    p_required_quantity INT DEFAULT 1
)
RETURNS TABLE (
    is_available BOOLEAN,
    available_quantity INT,
    total_quantity INT,
    reserved_quantity INT,
    is_low_stock BOOLEAN,
    low_stock_threshold INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_variant RECORD;
    v_available INT;
BEGIN
    SELECT * INTO v_variant
    FROM product_variants 
    WHERE id = p_variant_id AND deleted_at IS NULL AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 0, false, 0;
        RETURN;
    END IF;
    
    v_available := v_variant.quantity - v_variant.reserved_quantity;
    
    RETURN QUERY SELECT 
        (v_available >= p_required_quantity),
        v_available,
        v_variant.quantity,
        v_variant.reserved_quantity,
        (v_variant.quantity <= v_variant.low_stock_threshold),
        v_variant.low_stock_threshold;
END;
$$;

-- ============================================
-- FUNCTION: Bulk check stock for cart items
-- Used at checkout to validate all items
-- ============================================
CREATE OR REPLACE FUNCTION check_cart_stock(
    p_items JSONB -- Array of {variant_id, quantity}
)
RETURNS TABLE (
    variant_id UUID,
    requested_quantity INT,
    available_quantity INT,
    is_available BOOLEAN,
    product_name TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item JSONB;
    v_variant_id UUID;
    v_requested INT;
    v_available INT;
    v_product_name TEXT;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_requested := (v_item->>'quantity')::INT;
        
        SELECT 
            pv.quantity - pv.reserved_quantity,
            p.name
        INTO v_available, v_product_name
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.id = v_variant_id AND pv.deleted_at IS NULL;
        
        IF NOT FOUND THEN
            v_available := 0;
            v_product_name := 'Unknown Product';
        END IF;
        
        RETURN QUERY SELECT 
            v_variant_id,
            v_requested,
            COALESCE(v_available, 0),
            (COALESCE(v_available, 0) >= v_requested),
            v_product_name;
    END LOOP;
END;
$$;

-- ============================================
-- TRIGGER: Notify on inventory change (for Realtime)
-- ============================================
CREATE OR REPLACE FUNCTION notify_inventory_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_available_old INT;
    v_available_new INT;
    v_product_id UUID;
BEGIN
    v_available_old := OLD.quantity - OLD.reserved_quantity;
    v_available_new := NEW.quantity - NEW.reserved_quantity;
    
    -- Get product_id for the notification
    v_product_id := NEW.product_id;
    
    -- Notify via pg_notify for real-time updates
    PERFORM pg_notify(
        'inventory_changes',
        json_build_object(
            'variant_id', NEW.id,
            'product_id', v_product_id,
            'old_available', v_available_old,
            'new_available', v_available_new,
            'is_out_of_stock', (v_available_new <= 0),
            'is_low_stock', (NEW.quantity <= NEW.low_stock_threshold),
            'timestamp', NOW()
        )::TEXT
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for inventory notifications
DROP TRIGGER IF EXISTS trigger_inventory_change ON product_variants;
CREATE TRIGGER trigger_inventory_change
    AFTER UPDATE OF quantity, reserved_quantity ON product_variants
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity 
          OR OLD.reserved_quantity IS DISTINCT FROM NEW.reserved_quantity)
    EXECUTE FUNCTION notify_inventory_change();

-- ============================================
-- INDEX: For faster inventory queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_variants_available_stock 
    ON product_variants ((quantity - reserved_quantity)) 
    WHERE deleted_at IS NULL AND is_active = true;

COMMENT ON FUNCTION reserve_stock IS 'Atomically reserve stock for an order. Returns success status and updated quantities.';
COMMENT ON FUNCTION release_stock IS 'Atomically release reserved stock when order is cancelled.';
COMMENT ON FUNCTION confirm_stock_deduction IS 'Atomically deduct stock when order is completed.';
COMMENT ON FUNCTION check_stock_availability IS 'Check if a variant has enough stock available.';
COMMENT ON FUNCTION check_cart_stock IS 'Bulk check stock availability for all cart items.';
