'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// Create a Supabase client with the service role key for admin privileges
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Creates a user profile with the provided user ID and public key
 * Uses the service role to bypass RLS policies
 */
export async function createUserProfile(userId: string, publicKey: string) {
  try {
    // Insert the user profile with admin privileges
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: userId,
        public_key: publicKey,
      })
      
    if (error) {
      console.error('Error creating user profile:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Server error:', error)
    return { success: false, error: error?.message || 'Internal server error' }
  }
}
