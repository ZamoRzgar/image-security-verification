"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

interface ImageMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  publicUrl: string;
  signature: string;
  hash: string;
  createdAt: string;
  userId: string;
  ownerEmail?: string;
}

/**
 * Server action to find an image by its hash
 * Strictly enforces user boundaries - only finds images belonging to the specified user
 */
export async function findImageByHashAction(hash: string, currentUserId: string): Promise<ImageMetadata | null> {
  try {
    console.log("Server action: findImageByHashAction started", { hash, currentUserId });
    
    // Require currentUserId - reject if not provided
    if (!currentUserId) {
      console.error("Server action: No user ID provided");
      return null;
    }
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Always filter by user_id to enforce security boundaries
    const { data, error } = await serviceClient
      .from("images")
      .select("*")
      .eq("hash", hash)
      .eq("user_id", currentUserId)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        console.log("Server action: No image found with hash", hash, "for user", currentUserId);
        return null;
      }
      console.error("Server action: Error finding image by hash", error);
      throw new Error(`Failed to find image by hash: ${error.message}`);
    }
    
    // If we found an image, get the user's email
    let ownerEmail: string | undefined;
    if (data.user_id) {
      const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(
        data.user_id
      );
      
      if (userError) {
        console.error("Server action: Error getting user data", userError);
      } else if (userData.user) {
        ownerEmail = userData.user.email;
      }
    }
    
    console.log("Server action: Image found", { id: data.id, fileName: data.file_name });
    
    return {
      id: data.id,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      publicUrl: data.public_url,
      signature: data.signature,
      hash: data.hash,
      createdAt: data.created_at,
      userId: data.user_id,
      ownerEmail,
    };
  } catch (error: any) {
    console.error("Server action: Error in findImageByHashAction", error);
    throw new Error(`Failed to find image: ${error.message || JSON.stringify(error)}`);
  }
}

/**
 * Server action to find an image by its filename
 * Strictly enforces user boundaries - only finds images belonging to the specified user
 */
export async function findImageByFileNameAction(fileName: string, currentUserId: string): Promise<ImageMetadata | null> {
  try {
    console.log("Server action: findImageByFileNameAction started", { fileName, currentUserId });
    
    // Require currentUserId - reject if not provided
    if (!currentUserId) {
      console.error("Server action: No user ID provided");
      return null;
    }
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Always filter by user_id to enforce security boundaries
    const { data, error } = await serviceClient
      .from("images")
      .select("*")
      .eq("file_name", fileName)
      .eq("user_id", currentUserId)
      .single();
    
    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        console.log("Server action: No image found with filename", fileName, "for user", currentUserId);
        return null;
      }
      console.error("Server action: Error finding image by filename", error);
      throw new Error(`Failed to find image by filename: ${error.message}`);
    }
    
    // If we found an image, get the user's email
    let ownerEmail: string | undefined;
    if (data.user_id) {
      const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(
        data.user_id
      );
      
      if (userError) {
        console.error("Server action: Error getting user data", userError);
      } else if (userData.user) {
        ownerEmail = userData.user.email;
      }
    }
    
    console.log("Server action: Image found", { id: data.id, fileName: data.file_name });
    
    return {
      id: data.id,
      fileName: data.file_name,
      fileSize: data.file_size,
      fileType: data.file_type,
      publicUrl: data.public_url,
      signature: data.signature,
      hash: data.hash,
      createdAt: data.created_at,
      userId: data.user_id,
      ownerEmail,
    };
  } catch (error: any) {
    console.error("Server action: Error in findImageByFileNameAction", error);
    throw new Error(`Failed to find image: ${error.message || JSON.stringify(error)}`);
  }
}

/**
 * Server action to get a user's public key
 * Uses service role client to bypass RLS policies
 */
export async function getUserPublicKeyAction(userId: string): Promise<string | null> {
  try {
    console.log("Server action: getUserPublicKeyAction started", { userId });
    
    if (!userId) {
      console.error("Server action: Invalid userId provided", { userId });
      throw new Error("Invalid user ID: empty or undefined");
    }
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // First check if the user profile exists
    const { data: profileData, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("*")  // Select all fields for debugging
      .eq("user_id", userId)
      .maybeSingle();
    
    console.log("Server action: User profile query result", { 
      profileFound: !!profileData,
      profileError,
      publicKeyExists: !!profileData?.public_key,
      profileData
    });
    
    if (profileError && profileError.code !== "PGRST116") {
      console.error("Server action: Error checking user profile", profileError);
      throw new Error(`Failed to check user profile: ${profileError.message}`);
    }
    
    // If we found a public key in the profile, return it
    if (profileData?.public_key) {
      console.log("Server action: Public key found in user profile");
      return profileData.public_key;
    }
    
    console.log("Server action: No public key found in user profile, checking user metadata");
    
    // As a fallback, try to get the public key from the user's metadata
    const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(userId);
    
    console.log("Server action: User data from auth", { 
      userFound: !!userData?.user,
      userError,
      metadataExists: !!userData?.user?.user_metadata,
      metadata: userData?.user?.user_metadata
    });
    
    if (userError) {
      console.error("Server action: Error getting user data", userError);
      throw new Error(`Failed to get user data: ${userError.message}`);
    }
    
    if (!userData.user) {
      console.error("Server action: User not found", userId);
      throw new Error("User not found");
    }
    
    // Check if the public key is in the user's metadata
    const publicKey = userData.user.user_metadata?.public_key;
    
    if (!publicKey) {
      // As a last resort, try to generate a new key pair for the user
      console.log("Server action: No public key found, attempting to ensure a public key exists");
      
      // Import the ensure-public-key action
      const { ensurePublicKeyAction } = await import("@/app/actions/ensure-public-key");
      
      // Try to ensure a public key exists
      const ensureResult = await ensurePublicKeyAction();
      
      if (ensureResult.success && ensureResult.publicKeyExists) {
        console.log("Server action: Successfully ensured public key exists");
        
        // Fetch the newly created public key
        const { data: newProfileData, error: newProfileError } = await serviceClient
          .from("user_profiles")
          .select("public_key")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (newProfileData?.public_key) {
          console.log("Server action: Retrieved newly created public key");
          return newProfileData.public_key;
        }
      }
      
      console.error("Server action: No public key found in user metadata", {
        userId,
        metadata: userData.user.user_metadata,
        ensureResult: ensureResult || "Failed to ensure public key"
      });
      throw new Error("Public key not found in user profile or metadata");
    }
    
    console.log("Server action: Public key found in user metadata");
    
    // Save the public key to the user profile for future use
    try {
      console.log("Server action: Saving public key from metadata to profile");
      const { error: saveError } = await serviceClient
        .from("user_profiles")
        .upsert({ 
          user_id: userId, 
          public_key: publicKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: "user_id" 
        });
      
      if (saveError) {
        console.error("Server action: Error saving public key to profile", saveError);
        // Continue even if save fails, we can still return the key from metadata
      } else {
        console.log("Server action: Public key saved to profile successfully");
      }
    } catch (saveError) {
      console.error("Server action: Exception saving public key to profile", saveError);
      // Continue even if save fails, we can still return the key from metadata
    }
    
    return publicKey;
  } catch (error: any) {
    console.error("Server action: Error in getUserPublicKeyAction", error);
    throw new Error(`Could not retrieve public key: ${error.message || JSON.stringify(error)}`);
  }
}
