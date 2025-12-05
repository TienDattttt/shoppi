/**
 * Preference Service
 * Handles user notification preferences management
 */

const { supabaseAdmin } = require('../../../shared/supabase/supabase.client');
const { v4: uuidv4 } = require('uuid');

// Default preferences for new users (all enabled)
const DEFAULT_PREFERENCES = {
  push_enabled: true,
  in_app_enabled: true,
  order_updates: true,
  promotions: true,
  price_drops: true,
  new_reviews: true,
};

// Mapping of notification types to preference fields
const TYPE_TO_PREFERENCE = {
  order_created: 'order_updates',
  order_shipped: 'order_updates',
  order_delivered: 'order_updates',
  order_cancelled: 'order_updates',
  promotion: 'promotions',
  flash_sale: 'promotions',
  voucher: 'promotions',
  price_drop: 'price_drops',
  new_review: 'new_reviews',
};

/**
 * Get user notification preferences
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User preferences or null
 */
async function getPreferences(userId) {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get preferences: ${error.message}`);
  }

  return data || null;
}

/**
 * Update user notification preferences
 * @param {string} userId - User ID
 * @param {object} prefs - Preferences to update
 * @returns {Promise<object>} Updated preferences
 */
async function updatePreferences(userId, prefs) {
  // Check if preferences exist
  const existing = await getPreferences(userId);

  if (!existing) {
    // Create new preferences with provided values
    return createDefaultPreferences(userId, prefs);
  }

  // Update existing preferences
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .update({
      ...prefs,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update preferences: ${error.message}`);
  }

  return data;
}

/**
 * Check if notification should be sent based on user preferences
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} channel - Channel (push, in_app)
 * @returns {Promise<boolean>} Whether to send the notification
 */
async function shouldSend(userId, type, channel) {
  const prefs = await getPreferences(userId);

  // If no preferences, use defaults (all enabled)
  if (!prefs) {
    return true;
  }

  // Check channel preference
  if (channel === 'push' && !prefs.push_enabled) {
    return false;
  }

  if (channel === 'in_app' && !prefs.in_app_enabled) {
    return false;
  }

  // Check type-specific preference
  const prefField = TYPE_TO_PREFERENCE[type];
  if (prefField && prefs[prefField] === false) {
    return false;
  }

  return true;
}


/**
 * Create default preferences for a new user
 * All channels and types are enabled by default
 * @param {string} userId - User ID
 * @param {object} [overrides] - Optional preference overrides
 * @returns {Promise<object>} Created preferences
 */
async function createDefaultPreferences(userId, overrides = {}) {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .insert({
      id: uuidv4(),
      user_id: userId,
      ...DEFAULT_PREFERENCES,
      ...overrides,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create preferences: ${error.message}`);
  }

  return data;
}

/**
 * Delete user preferences (used when user is deleted)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function deletePreferences(userId) {
  const { error } = await supabaseAdmin
    .from('notification_preferences')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete preferences: ${error.message}`);
  }
}

/**
 * Check if user has opted out of promotional notifications
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if opted out
 */
async function hasOptedOutOfPromotions(userId) {
  const prefs = await getPreferences(userId);
  return prefs ? !prefs.promotions : false;
}

module.exports = {
  getPreferences,
  updatePreferences,
  shouldSend,
  createDefaultPreferences,
  deletePreferences,
  hasOptedOutOfPromotions,
  DEFAULT_PREFERENCES,
  TYPE_TO_PREFERENCE,
};
