import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

// Create a Supabase client with the service role key for admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { user_id, public_key } = await request.json();
    
    if (!user_id || !public_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // First try with the route handler client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    let result = await supabase
      .from('user_profiles')
      .insert({
        user_id,
        public_key,
      });
      
    // If there's an error and we have the service role key, try with admin privileges
    if (result.error && supabaseUrl && supabaseServiceRoleKey) {
      const supabaseAdmin = createClient<Database>(
        supabaseUrl,
        supabaseServiceRoleKey
      );
      
      result = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id,
          public_key,
        });
    }
    
    if (result.error) {
      console.error('Error creating user profile:', result.error);
      return NextResponse.json(
        { error: result.error.message || 'Failed to create user profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
