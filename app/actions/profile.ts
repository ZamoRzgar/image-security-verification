"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Server action to save a user's public key to their profile
 * Uses service role client to bypass RLS policies
 */
export async function saveUserPublicKeyAction(userId: string, publicKey: string): Promise<boolean> {
  try {
    console.log("Server action: saveUserPublicKeyAction started", { userId });
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Check if user profile exists
    const { data: existingProfile, error: checkError } = await serviceClient
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (checkError && checkError.code !== "PGRST116") {
      console.error("Server action: Error checking user profile", checkError);
      throw new Error(`Failed to check user profile: ${checkError.message}`);
    }
    
    let result;
    
    if (existingProfile) {
      // Update existing profile
      console.log("Server action: Updating existing user profile");
      result = await serviceClient
        .from("user_profiles")
        .update({ public_key: publicKey })
        .eq("user_id", userId);
    } else {
      // Insert new profile
      console.log("Server action: Creating new user profile");
      result = await serviceClient
        .from("user_profiles")
        .insert({ user_id: userId, public_key: publicKey });
    }
    
    if (result.error) {
      console.error("Server action: Error saving public key", result.error);
      throw new Error(`Failed to save public key: ${result.error.message}`);
    }
    
    console.log("Server action: Public key saved successfully");
    return true;
  } catch (error: any) {
    console.error("Server action: Error in saveUserPublicKeyAction", error);
    throw new Error(`Failed to save public key: ${error.message || JSON.stringify(error)}`);
  }
}
