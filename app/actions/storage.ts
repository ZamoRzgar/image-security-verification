"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

interface UploadResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * Server action to upload a file to Supabase Storage
 * Uses service role client to bypass RLS policies
 */
export async function uploadFileToStorage(file: File): Promise<UploadResult> {
  try {
    // Get the current user from the session
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      return {
        success: false,
        path: "",
        error: `Authentication error: ${userError.message}`
      };
    }
    
    if (!userData.user) {
      console.error("No user found");
      return {
        success: false,
        path: "",
        error: "User not authenticated"
      };
    }
    
    const userId = userData.user.id;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Generate a unique file path
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${timestamp}-${file.name}`;
    
    // Upload the file to storage
    const { error: uploadError } = await serviceClient
      .storage
      .from("images")
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      return {
        success: false,
        path: "",
        error: `Upload error: ${uploadError.message}`
      };
    }
    
    return {
      success: true,
      path: filePath
    };
  } catch (error: any) {
    console.error("Error in uploadFileToStorage:", error);
    return {
      success: false,
      path: "",
      error: `Error: ${error.message || JSON.stringify(error)}`
    };
  }
}
