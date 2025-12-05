/**
 * Supabase Client
 * Initializes and exports Supabase client instances
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');

// Validate required configuration
if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  console.warn('Warning: Supabase configuration is incomplete. Some features may not work.');
}

/**
 * Supabase client with service role key
 * Use this for server-side operations that need full access
 */
const supabaseAdmin = createClient(
  config.supabase.url || '',
  config.supabase.serviceRoleKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase client with anon key
 * Use this for operations that should respect RLS policies
 */
const supabaseClient = createClient(
  config.supabase.url || '',
  config.supabase.anonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);

module.exports = {
  supabaseAdmin,
  supabaseClient,
};
