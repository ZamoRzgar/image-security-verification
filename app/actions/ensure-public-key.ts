"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { generateRSAKeyPair, exportPublicKey, exportPrivateKey } from "@/lib/crypto-utils";

interface KeyActionResult {
  success: boolean;
  message: string;
  privateKey?: string;
  publicKeyExists: boolean;
}

/**
 * Server action to ensure a user has a public key in their profile
 * If no public key exists, it will generate a new key pair and save the public key
 * Returns the private key if a new one was generated
 */
export async function ensurePublicKeyAction(): Promise<KeyActionResult> {
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
        publicKeyExists: false
      };
    }
    
    if (!userData.user) {
      console.error("No user found");
      return { 
        success: false, 
        message: "User not authenticated",
        publicKeyExists: false
      };
    }
    
    const userId = userData.user.id;
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Check if user profile exists and has a public key
    const { data: existingProfile, error: checkError } = await serviceClient
      .from("user_profiles")
      .select("public_key")
      .eq("user_id", userId)
      .maybeSingle();
    
    // If public key exists and is not empty, return success
    if (existingProfile?.public_key && existingProfile.public_key.length > 0) {
      return {
        success: true,
        message: "Public key already exists",
        publicKeyExists: true
      };
    }
    
    // Generate new RSA key pair
    try {
      // Pass the user ID as entropy to ensure unique key generation
      const keyPair = await generateRSAKeyPair(userId);
      
      // Export the public key as base64 string
      const publicKeyString = await exportPublicKey(keyPair.publicKey);
      
      // Export private key as JWK for better compatibility
      const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
      const privateKeyString = JSON.stringify(privateKeyJwk);
      
      // Update or insert user profile with the new public key
      const { error: saveError } = await serviceClient
        .from("user_profiles")
        .upsert({ 
          user_id: userId, 
          public_key: publicKeyString,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: "user_id" 
        });
      
      if (saveError) {
        console.error("Error saving public key:", saveError);
        return { 
          success: false, 
          message: `Failed to save public key: ${saveError.message}`,
          publicKeyExists: false
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
          message: "Failed to verify public key was saved correctly",
          publicKeyExists: false
        };
      }
      
      return { 
        success: true, 
        message: "New key pair generated and public key saved",
        privateKey: privateKeyString,
        publicKeyExists: true
      };
    } catch (cryptoError: any) {
      console.error("Error generating keys:", cryptoError);
      return { 
        success: false, 
        message: `Failed to generate keys: ${cryptoError.message || JSON.stringify(cryptoError)}`,
        publicKeyExists: false
      };
    }
  } catch (error: any) {
    console.error("Error in ensurePublicKeyAction:", error);
    return { 
      success: false, 
      message: `Error: ${error.message || JSON.stringify(error)}`,
      publicKeyExists: false
    };
  }
}
