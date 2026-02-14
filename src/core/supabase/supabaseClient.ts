
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Key not found in environment variables.');
}

export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');
