"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

interface UploadImageParams {
  fileName: string;
  filePath: string;
  fileHash: string;
  signature: string;
  fileSize: number;
  fileType: string;
}

interface UploadResult {
  success: boolean;
  error?: string;
}

/**
 * Server action to upload image metadata to the database
 * Uses service role client to bypass RLS policies
 */
export async function uploadImageMetadata(params: UploadImageParams): Promise<UploadResult> {
  try {
    // Get the current user from the session
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      return {
        success: false,
        error: `Authentication error: ${userError.message}`
      };
    }
    
    if (!userData.user) {
      console.error("No user found");
      return {
        success: false,
        error: "User not authenticated"
      };
    }
    
    const userId = userData.user.id;
    
    // Use service role client to bypass RLS policies
    const serviceClient = createServiceRoleClient();
    
    // Insert image metadata into the database
    const { error: insertError } = await serviceClient
      .from("images")
      .insert({
        user_id: userId,
        file_name: params.fileName,
        file_path: params.filePath,
        hash: params.fileHash,
        signature: params.signature,
        file_size: params.fileSize,
        file_type: params.fileType,
        public_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${params.filePath}`,
        created_at: new Date().toISOString(),
      });
    
    if (insertError) {
      console.error("Database insert error:", insertError);
      return {
        success: false,
        error: `Failed to save image metadata: ${insertError.message}`
      };
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error("Error in uploadImageMetadata:", error);
    return {
      success: false,
      error: `Error: ${error.message || JSON.stringify(error)}`
    };
  }
}
