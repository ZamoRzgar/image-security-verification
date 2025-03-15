"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Server action to debug and fix user profile issues
 * Uses service role client to bypass RLS policies
 */
export async function debugUserProfile(): Promise<{ 
  success: boolean; 
  message: string; 
  userId?: string;
  profileExists?: boolean;
  publicKeyExists?: boolean;
  fixed?: boolean;
}> {
  try {
    console.log("Server action: debugUserProfile started");
    
    // Get the current user from the session
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ 
      cookies: async () => cookieStore 
    });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Server action: Auth error", userError);
      return { 
        success: false, 
        message: `Authentication error: ${userError.message}` 
      };
    }
    
    if (!userData.user) {
      console.error("Server action: No user found");
      return { 
        success: false, 
        message: "User not authenticated" 
      };
    }
    
    const userId = userData.user.id;
    console.log("Server action: User authenticated", userId);
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Check if user profile exists
    const { data: profileData, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId);
    
    if (profileError) {
      console.error("Server action: Error checking user profile", profileError);
      return { 
        success: false, 
        message: `Failed to check user profile: ${profileError.message}`,
        userId
      };
    }
    
    const profileExists = profileData && profileData.length > 0;
    const publicKeyExists = profileExists && profileData[0].public_key;
    
    console.log("Server action: Profile check", { 
      profileExists, 
      publicKeyExists,
      profile: profileData?.[0] 
    });
    
    // If profile doesn't exist or public key is missing, try to fix it
    if (!profileExists || !publicKeyExists) {
      // Get the user's metadata to see if the public key is there
      const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(userId);
      
      if (authError) {
        console.error("Server action: Error getting user data", authError);
        return { 
          success: false, 
          message: `Failed to get user data: ${authError.message}`,
          userId,
          profileExists,
          publicKeyExists
        };
      }
      
      const metadataPublicKey = authUser.user?.user_metadata?.public_key;
      
      if (!metadataPublicKey) {
        console.error("Server action: No public key found in user metadata");
        return { 
          success: false, 
          message: "No public key found in user metadata",
          userId,
          profileExists,
          publicKeyExists
        };
      }
      
      // Fix the user profile
      let result;
      if (!profileExists) {
        // Create new profile
        result = await serviceClient
          .from("user_profiles")
          .insert({ 
            user_id: userId, 
            public_key: metadataPublicKey 
          });
      } else {
        // Update existing profile
        result = await serviceClient
          .from("user_profiles")
          .update({ public_key: metadataPublicKey })
          .eq("user_id", userId);
      }
      
      if (result.error) {
        console.error("Server action: Error fixing user profile", result.error);
        return { 
          success: false, 
          message: `Failed to fix user profile: ${result.error.message}`,
          userId,
          profileExists,
          publicKeyExists
        };
      }
      
      return { 
        success: true, 
        message: "User profile fixed successfully",
        userId,
        profileExists,
        publicKeyExists,
        fixed: true
      };
    }
    
    return { 
      success: true, 
      message: "User profile is valid",
      userId,
      profileExists,
      publicKeyExists
    };
  } catch (error: any) {
    console.error("Server action: Error in debugUserProfile", error);
    return { 
      success: false, 
      message: `Debug error: ${error.message || JSON.stringify(error)}` 
    };
  }
}
