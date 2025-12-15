-- Migration: Add document URL columns to shippers table
-- For storing shipper registration documents (ID card, driver license)

ALTER TABLE shippers 
ADD COLUMN IF NOT EXISTS id_card_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_card_back_url TEXT,
ADD COLUMN IF NOT EXISTS driver_license_url TEXT;

-- Comments
COMMENT ON COLUMN shippers.id_card_front_url IS 'URL to front side of ID card/CCCD image';
COMMENT ON COLUMN shippers.id_card_back_url IS 'URL to back side of ID card/CCCD image';
COMMENT ON COLUMN shippers.driver_license_url IS 'URL to driver license image';
