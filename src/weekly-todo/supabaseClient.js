import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://yloqjcojhvmaxfvsgpkh.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3FqY29qaHZtYXhmdnNncGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDg4NDAsImV4cCI6MjA5OTk4NDg0MH0.XfSGNW22xnwckpPjjNzz8UUha3RiUJRSWXn0M27n2sk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
