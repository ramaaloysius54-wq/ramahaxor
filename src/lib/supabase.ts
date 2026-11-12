import { createClient } from '@supabase/supabase-js';
// Tambahkan kata "type" sebelum { Database }
import type { Database } from '../types/supabase';

const supabaseUrl = 'https://wmauyurhlwodusqnbkcv.supabase.co';
const supabaseAnonKey = 'sb_publishable_eZ7Tdo4P-oW10lvImVUJbA_QJlYNNke';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
