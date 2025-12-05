-- Migration: Create OTPs table
-- Description: Stores OTP codes for verification (registration, login, password reset)

CREATE TABLE IF NOT EXISTS otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- phone or email
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('registration', 'login', 'password_reset')),
    
    -- Attempt tracking
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    
    -- Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_otps_identifier ON otps(identifier);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_otps_purpose ON otps(purpose);

-- Composite index for finding valid OTPs
CREATE INDEX IF NOT EXISTS idx_otps_identifier_purpose_valid 
    ON otps(identifier, purpose, expires_at) 
    WHERE verified_at IS NULL;
