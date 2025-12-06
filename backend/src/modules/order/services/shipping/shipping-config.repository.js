/**
 * Shipping Provider Config Repository
 * CRUD operations for shipping provider configurations
 * 
 * Feature: shipping-provider-integration
 * Requirements: 1.2, 7.4
 */

const { getSupabaseClient } = require('../../../../shared/supabase/supabase.client');
const { AppError } = require('../../../../shared/utils/error.util');
const crypto = require('crypto');

const TABLE_NAME = 'shipping_provider_configs';

// Encryption key for credentials (should be in env)
const ENCRYPTION_KEY = process.env.SHIPPING_CREDENTIALS_KEY || 'default-key-change-in-production';

/**
 * Encrypt sensitive credentials
 */
function encryptCredentials(credentials) {
  if (!credentials || Object.keys(credentials).length === 0) {
    return {};
  }

  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    data: encrypted,
  };
}

/**
 * Decrypt credentials
 */
function decryptCredentials(encryptedData) {
  if (!encryptedData || !encryptedData.iv || !encryptedData.data) {
    return {};
  }

  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt credentials:', error.message);
    return {};
  }
}

/**
 * Get all provider configs for a shop
 */
async function getShopConfigs(shopId) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('shop_id', shopId)
    .order('provider_code');

  if (error) {
    throw new AppError(`Failed to get shop configs: ${error.message}`, 500);
  }

  // Decrypt credentials for each config
  return data.map(config => ({
    ...config,
    credentials: decryptCredentials(config.credentials),
  }));
}

/**
 * Get enabled providers for a shop
 */
async function getEnabledProviders(shopId) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('provider_code, settings')
    .eq('shop_id', shopId)
    .eq('is_enabled', true);

  if (error) {
    throw new AppError(`Failed to get enabled providers: ${error.message}`, 500);
  }

  return data.map(config => config.provider_code);
}

/**
 * Get specific provider config
 */
async function getProviderConfig(shopId, providerCode) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('shop_id', shopId)
    .eq('provider_code', providerCode)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw new AppError(`Failed to get provider config: ${error.message}`, 500);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    credentials: decryptCredentials(data.credentials),
  };
}

/**
 * Create or update provider config
 */
async function upsertProviderConfig(shopId, providerCode, configData) {
  const supabase = getSupabaseClient();
  
  const { credentials, settings, is_enabled = true, is_default = false } = configData;

  const record = {
    shop_id: shopId,
    provider_code: providerCode,
    is_enabled,
    is_default,
    credentials: encryptCredentials(credentials),
    settings: settings || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(record, {
      onConflict: 'shop_id,provider_code',
    })
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to save provider config: ${error.message}`, 500);
  }

  return {
    ...data,
    credentials: decryptCredentials(data.credentials),
  };
}

/**
 * Enable/disable provider
 */
async function toggleProvider(shopId, providerCode, isEnabled) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('provider_code', providerCode)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to toggle provider: ${error.message}`, 500);
  }

  return data;
}

/**
 * Delete provider config
 */
async function deleteProviderConfig(shopId, providerCode) {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('shop_id', shopId)
    .eq('provider_code', providerCode);

  if (error) {
    throw new AppError(`Failed to delete provider config: ${error.message}`, 500);
  }

  return true;
}

/**
 * Set default provider for shop
 */
async function setDefaultProvider(shopId, providerCode) {
  const supabase = getSupabaseClient();
  
  // First, unset all defaults for this shop
  await supabase
    .from(TABLE_NAME)
    .update({ is_default: false })
    .eq('shop_id', shopId);

  // Then set the new default
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('provider_code', providerCode)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to set default provider: ${error.message}`, 500);
  }

  return data;
}

/**
 * Get default provider for shop
 */
async function getDefaultProvider(shopId) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('provider_code')
    .eq('shop_id', shopId)
    .eq('is_default', true)
    .eq('is_enabled', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new AppError(`Failed to get default provider: ${error.message}`, 500);
  }

  return data?.provider_code || 'inhouse';
}

module.exports = {
  getShopConfigs,
  getEnabledProviders,
  getProviderConfig,
  upsertProviderConfig,
  toggleProvider,
  deleteProviderConfig,
  setDefaultProvider,
  getDefaultProvider,
  
  // Utilities
  encryptCredentials,
  decryptCredentials,
};
