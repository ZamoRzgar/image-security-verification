"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { generateRSAKeyPair, exportPublicKey } from "@/lib/crypto-utils";

interface RegenerateKeysResult {
  success: boolean;
  message: string;
  privateKey?: string;
}

/**
 * Server action to regenerate keys for a user
 * Uses service role client to bypass RLS policies
 */
export async function regenerateKeysAction(): Promise<RegenerateKeysResult> {
  try {
    // Get the current user from the session
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      return { 
        success: false, 
        message: `Authentication error: ${userError.message}` 
      };
    }
    
    if (!userData.user) {
      console.error("No user found");
      return { 
        success: false, 
        message: "User not authenticated" 
      };
    }
    
    const userId = userData.user.id;
    
    // Generate new RSA key pair
    try {
      const keyPair = await generateRSAKeyPair();
      
      // Export the public key as base64 string
      const publicKeyString = await exportPublicKey(keyPair.publicKey);
      
      // Export private key as JWK for better compatibility
      const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const privateKeyString = JSON.stringify(privateKeyJwk);
      
      // Use service role client to bypass RLS policies
      const serviceClient = createServiceRoleClient();
      
      // Check if user profile exists
      const { data: existingProfile, error: checkError } = await serviceClient
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      let result;
      
      if (existingProfile) {
        // Update existing profile
        result = await serviceClient
          .from("user_profiles")
          .update({ 
            public_key: publicKeyString,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);
      } else {
        // Insert new profile with all required fields
        result = await serviceClient
          .from("user_profiles")
          .insert({ 
            user_id: userId, 
            public_key: publicKeyString,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      if (result.error) {
        console.error("Error saving public key:", result.error);
        return { 
          success: false, 
          message: `Failed to save public key: ${result.error.message}` 
        };
      }
      
      // Verify that the public key was saved correctly
      const { data: verifyData, error: verifyError } = await serviceClient
        .from("user_profiles")
        .select("public_key")
        .eq("user_id", userId)
        .single();
      
      if (verifyError || !verifyData?.public_key) {
        console.error("Verification failed:", verifyError);
        return { 
          success: false, 
          message: "Failed to verify public key was saved correctly" 
        };
      }
      
      return { 
        success: true, 
        message: "Keys regenerated successfully",
        privateKey: privateKeyString
      };
    } catch (cryptoError: any) {
      console.error("Error generating keys:", cryptoError);
      return { 
        success: false, 
        message: `Failed to generate keys: ${cryptoError.message || JSON.stringify(cryptoError)}` 
      };
    }
  } catch (error: any) {
    console.error("Error in regenerateKeysAction:", error);
    return { 
      success: false, 
      message: `Regeneration error: ${error.message || JSON.stringify(error)}` 
    };
  }
}
