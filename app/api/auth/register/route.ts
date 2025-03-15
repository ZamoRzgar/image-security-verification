import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { user_id, public_key } = await request.json();
    
    if (!user_id || !public_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Insert the user profile with server-side authentication
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_id,
        public_key,
      });
      
    if (error) {
      console.error('Error creating user profile:', error);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
