import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the requested user ID from the URL
    const userId = params.id;
    
    // Get the current user from the session to verify permissions
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const currentUserId = userData.user.id;
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Check if current user is an admin or the user themselves
    const { data: currentUserProfile, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', currentUserId)
      .single();
    
    const isAdmin = currentUserProfile?.role === 'admin';
    const isSameUser = currentUserId === userId;
    
    // Only allow admins or the user themselves to access the profile
    if (!isAdmin && !isSameUser) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    // Get the requested user's profile
    const { data: profile, error: fetchError } = await serviceClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    // If profile doesn't exist, return a default profile with user role
    if (!profile) {
      return NextResponse.json({
        data: {
          user_id: userId,
          role: 'user',
          created_at: null,
          updated_at: null,
          public_key: null
        }
      });
    }
    
    // Return the profile data
    return NextResponse.json({ data: profile });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
