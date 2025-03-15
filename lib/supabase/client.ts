import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

// Create a client-side Supabase client
export const createClient = () => {
  return createClientComponentClient<Database>();
};
