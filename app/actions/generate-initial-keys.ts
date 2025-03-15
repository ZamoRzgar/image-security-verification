"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { generateRSAKeyPair, exportPublicKey } from "@/lib/crypto-utils";

interface GenerateKeysResult {
  success: boolean;
  message: string;
  privateKey?: string;
  needsKeys: boolean;
}

/**
 * Server action to generate initial keys for a new user
 * This is called when a user logs in for the first time
 * It generates a new key pair, saves the public key to the database,
 * and returns the private key to the user
 */
export async function generateInitialKeysAction(): Promise<GenerateKeysResult> {
  try {
    // Get the current user from the session
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      return { 
        success: false, 
        message: `Authentication error: ${userError.message}`,
        needsKeys: false
      };
    }
    
    if (!userData.user) {
      console.error("No user found");
      return { 
        success: false, 
        message: "User not authenticated",
        needsKeys: false
      };
    }
    
    const userId = userData.user.id;
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Check if user profile exists and if the public key is the default one
    const { data: profileData, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("public_key")
      .eq("user_id", userId)
      .single();
    
    if (profileError) {
      console.error("Error checking profile:", profileError);
      return { 
        success: false, 
        message: `Failed to check profile: ${profileError.message}`,
        needsKeys: false
      };
    }
    
    // Check if this is a default key that needs to be replaced
    const isDefaultKey = profileData.public_key.startsWith('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu5sVBczU9q');
    
    if (!isDefaultKey) {
      // User already has a real key pair
      return {
        success: true,
        message: "User already has a key pair",
        needsKeys: false
      };
    }
    
    // Generate new RSA key pair
    const keyPair = await generateRSAKeyPair();
    
    // Export the public key as base64 string
    const publicKeyString = await exportPublicKey(keyPair.publicKey);
    
    // Export private key as JWK for better compatibility
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const privateKeyString = JSON.stringify(privateKeyJwk);
    
    // Update the user profile with the new public key
    const { error: updateError } = await serviceClient
      .from("user_profiles")
      .update({ 
        public_key: publicKeyString,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);
    
    if (updateError) {
      console.error("Error updating public key:", updateError);
      return { 
        success: false, 
        message: `Failed to update public key: ${updateError.message}`,
        needsKeys: true
      };
    }
    
    return { 
      success: true, 
      message: "Keys generated successfully",
      privateKey: privateKeyString,
      needsKeys: true
    };
  } catch (error: any) {
    console.error("Error in generateInitialKeysAction:", error);
    return { 
      success: false, 
      message: `Error: ${error.message || JSON.stringify(error)}`,
      needsKeys: false
    };
  }
}
