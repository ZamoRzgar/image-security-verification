"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

type UserRole = "user" | "admin";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: UserRole;
  verified_images_count?: number;
  total_images_count?: number;
}

/**
 * Server action to check if the current user has admin privileges
 * @returns Promise with a boolean indicating if the user is an admin
 */
export async function checkAdminStatusAction(): Promise<boolean> {
  try {
    // Get the current user from the session
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.error("Auth error or no user:", userError);
      return false;
    }
    
    const userId = userData.user.id;
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await serviceClient
      .from("user_profiles")
      .select("role")
      .eq("user_id", userId)
      .single();
    
    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      return false;
    }
    
    return profile.role === "admin";
  } catch (error) {
    console.error("Error in checkAdminStatusAction:", error);
    return false;
  }
}

/**
 * Server action to get all users with their roles and stats
 * Only accessible by admin users
 * @returns Promise with an array of user data
 */
export async function getAllUsersAction(): Promise<UserData[]> {
  try {
    // Verify the current user is an admin
    const isAdmin = await checkAdminStatusAction();
    if (!isAdmin) {
      console.error("Unauthorized access attempt to getAllUsersAction");
      throw new Error("Unauthorized: Admin privileges required");
    }
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Get all users from auth.users
    const { data: users, error: usersError } = await serviceClient.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }
    
    // Get user profiles with roles
    const { data: profiles, error: profilesError } = await serviceClient
      .from("user_profiles")
      .select("user_id, role");
    
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
      throw new Error(`Failed to fetch user profiles: ${profilesError.message}`);
    }
    
    // Get image counts for each user
    const { data: imageCounts, error: imageCountsError } = await serviceClient
      .from("images")
      .select("user_id, verified")
      .eq("verified", true);
    
    if (imageCountsError) {
      console.error("Error fetching image counts:", imageCountsError);
    }
    
    // Get total image counts
    const { data: totalImages, error: totalImagesError } = await serviceClient
      .from("images")
      .select("user_id");
    
    if (totalImagesError) {
      console.error("Error fetching total images:", totalImagesError);
    }
    
    // Create a map of user_id to role
    const roleMap = new Map();
    profiles?.forEach(profile => {
      roleMap.set(profile.user_id, profile.role || "user");
    });
    
    // Count verified images per user
    const verifiedCountMap = new Map();
    imageCounts?.forEach(image => {
      const count = verifiedCountMap.get(image.user_id) || 0;
      verifiedCountMap.set(image.user_id, count + 1);
    });
    
    // Count total images per user
    const totalCountMap = new Map();
    totalImages?.forEach(image => {
      const count = totalCountMap.get(image.user_id) || 0;
      totalCountMap.set(image.user_id, count + 1);
    });
    
    // Combine all data
    const userData: UserData[] = users.users.map(user => ({
      id: user.id,
      email: user.email || "",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      role: roleMap.get(user.id) || "user",
      verified_images_count: verifiedCountMap.get(user.id) || 0,
      total_images_count: totalCountMap.get(user.id) || 0
    }));
    
    return userData;
  } catch (error: any) {
    console.error("Error in getAllUsersAction:", error);
    throw new Error(`Error: ${error.message || "Failed to get users"}`);
  }
}

/**
 * Server action to update a user's role
 * Only accessible by admin users
 * @param userId - The ID of the user to update
 * @param newRole - The new role to assign
 * @returns Promise with a boolean indicating success
 */
export async function updateUserRoleAction(userId: string, newRole: UserRole): Promise<boolean> {
  try {
    // Verify the current user is an admin
    const isAdmin = await checkAdminStatusAction();
    if (!isAdmin) {
      console.error("Unauthorized access attempt to updateUserRoleAction");
      throw new Error("Unauthorized: Admin privileges required");
    }
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Check if user profile exists
    const { data: existingProfile, error: checkError } = await serviceClient
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking user profile:", checkError);
      throw new Error(`Failed to check user profile: ${checkError.message}`);
    }
    
    let result;
    
    if (existingProfile) {
      // Update existing profile
      result = await serviceClient
        .from("user_profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      // Insert new profile with role
      result = await serviceClient
        .from("user_profiles")
        .insert({ 
          user_id: userId, 
          role: newRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    if (result.error) {
      console.error("Error updating user role:", result.error);
      throw new Error(`Failed to update user role: ${result.error.message}`);
    }
    
    return true;
  } catch (error: any) {
    console.error("Error in updateUserRoleAction:", error);
    throw new Error(`Error: ${error.message || "Failed to update user role"}`);
  }
}
