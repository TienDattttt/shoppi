import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client only if credentials are provided
export const supabase: SupabaseClient | null = 
    supabaseUrl && supabaseAnonKey 
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

// Check if realtime is available
export const isRealtimeAvailable = (): boolean => {
    return supabase !== null;
};
