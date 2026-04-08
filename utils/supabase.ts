import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// C'est l'outil qui va nous permettre de parler à ta base de données Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);