import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

interface ImageUploadParams {
  userId: string;
  file: File;
  signature: string;
  hash: string;
}

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
  filePath?: string;
}

/**
 * Validates a storage URL to ensure it's properly formed
 * @param url - The URL to validate
 * @returns True if the URL is valid, false otherwise
 */
function isValidStorageUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    // Check if it's a valid URL
    new URL(url);
    
    // Check if it has the expected Supabase storage path structure
    return url.includes('/storage/v1/object/public/');
  } catch (e) {
    return false;
  }
}

/**
 * Attempts to get a public URL for a file with retries
 * @param bucket - The storage bucket name
 * @param filePath - The path to the file in storage
 * @param maxRetries - Maximum number of retry attempts
 * @returns The public URL or null if unsuccessful
 */
async function getPublicUrlWithRetry(bucket: string, filePath: string, maxRetries = 3): Promise<string | null> {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries < maxRetries) {
    try {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      if (data && isValidStorageUrl(data.publicUrl)) {
        return data.publicUrl;
      }
      
      // If we got here, we have an invalid URL
      console.warn(`Invalid storage URL generated for ${bucket}/${filePath}:`, data?.publicUrl);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 500 * retries)); // Exponential backoff
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Error getting public URL (attempt ${retries + 1}/${maxRetries}):`, error);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 500 * retries)); // Exponential backoff
    }
  }
  
  if (lastError) {
    throw lastError;
  }
  
  return null;
}

/**
 * Saves a user's public key to their profile
 * @param userId - The user's ID
 * @param publicKey - The user's public key as a base64 string
 * @returns Promise with the result of the operation
 */
export async function saveUserPublicKey(userId: string, publicKey: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ public_key: publicKey })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to save public key: ${error.message}`);
  }

  return data;
}

/**
 * Gets a user's public key from their profile
 * @param userId - The user's ID
 * @returns Promise with the user's public key
 */
export async function getUserPublicKey(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("public_key")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error(`Failed to get public key: ${error.message}`);
  }

  return data?.public_key || null;
}

/**
 * Uploads an image to Supabase storage and saves its metadata
 * @param params - Parameters for the image upload
 * @returns Promise with the uploaded image metadata
 */
export async function uploadImage({
  userId,
  file,
  signature,
  hash,
}: ImageUploadParams): Promise<ImageMetadata> {
  // Create a unique file path
  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/${timestamp}-${file.name}`;
  
  let uploadAttempts = 0;
  const maxUploadAttempts = 3;
  let uploadData;
  let uploadError;
  
  // Try uploading with retries
  while (uploadAttempts < maxUploadAttempts) {
    try {
      const result = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });
      
      uploadData = result.data;
      uploadError = result.error;
      
      if (!uploadError) break;
      
      console.error(`Upload attempt ${uploadAttempts + 1} failed:`, uploadError.message);
      uploadAttempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
    } catch (error) {
      console.error(`Unexpected error during upload attempt ${uploadAttempts + 1}:`, error);
      uploadAttempts++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
    }
  }

  if (uploadError) {
    throw new Error(`Failed to upload image after ${maxUploadAttempts} attempts: ${uploadError.message}`);
  }

  // Get the public URL for the uploaded file with retries
  const publicUrl = await getPublicUrlWithRetry("images", filePath);
  
  if (!publicUrl) {
    throw new Error(`Failed to generate public URL for uploaded image: ${filePath}`);
  }

  // Save the image metadata to the database
  const { data: imageData, error: imageError } = await supabase
    .from("images")
    .insert({
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      public_url: publicUrl,
      signature,
      hash,
    })
    .select()
    .single();

  if (imageError) {
    // If metadata save fails, try to clean up the uploaded file
    try {
      await supabase.storage.from("images").remove([filePath]);
    } catch (cleanupError) {
      console.error("Failed to clean up uploaded file after metadata save error:", cleanupError);
    }
    
    throw new Error(`Failed to save image metadata: ${imageError.message}`);
  }

  return {
    id: imageData.id,
    fileName: imageData.file_name,
    fileSize: imageData.file_size,
    fileType: imageData.file_type,
    publicUrl: imageData.public_url,
    signature: imageData.signature,
    hash: imageData.hash,
    createdAt: imageData.created_at,
    userId: imageData.user_id,
  };
}

/**
 * Gets all images uploaded by a user
 * @param userId - The user's ID
 * @returns Promise with an array of image metadata
 */
export async function getUserImages(userId: string): Promise<ImageMetadata[]> {
  // Get image records from the database
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user images:", error);
    throw new Error(`Failed to get user images: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get the actual list of files from storage to validate paths
  const { data: storageFiles, error: storageError } = await supabase.storage
    .from("images")
    .list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'desc' }
    });

  if (storageError) {
    console.error(`Error listing storage files for user ${userId}:`, storageError);
  }

  // Create a map of filenames in storage for validation
  const fileMap = new Map<string, boolean>();
  if (storageFiles && storageFiles.length > 0) {
    storageFiles.forEach(file => {
      fileMap.set(file.name, true);
    });
  }

  // Process each image to ensure valid file paths
  const images = data.map((image) => {
    // Validate and potentially correct the file path
    let correctFilePath = image.file_path || "";
    
    // If file_path doesn't exist or is invalid, construct it from userId and fileName
    if (!correctFilePath || !correctFilePath.includes(userId)) {
      correctFilePath = `${userId}/${image.file_name}`;
    }
    
    // Log for debugging
    console.log(`Image ${image.id}: Using path ${correctFilePath}`);
    
    return {
      id: image.id,
      fileName: image.file_name,
      fileSize: image.file_size,
      fileType: image.file_type,
      publicUrl: "", // We're not using this anymore since we're using the server-side proxy
      signature: image.signature,
      hash: image.hash,
      createdAt: image.created_at,
      userId: image.user_id,
      filePath: correctFilePath
    };
  });

  return images;
}

/**
 * Finds an image by its hash
 * @param hash - The image hash to search for
 * @returns Promise with the image metadata if found
 */
export async function findImageByHash(hash: string): Promise<ImageMetadata | null> {
  // First, get the image data
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("hash", hash)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to find image by hash: ${error.message}`);
  }

  // If we found an image, get the user's email in a separate query
  let ownerEmail: string | undefined;
  if (data.user_id) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id);
    
    if (!userError && userData.user) {
      ownerEmail = userData.user.email;
    }
  }

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
}

/**
 * Finds an image by its filename
 * @param fileName - The filename to search for
 * @returns Promise with the image metadata if found
 */
export async function findImageByFileName(fileName: string): Promise<ImageMetadata | null> {
  // First, get the image data
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("file_name", fileName)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to find image by filename: ${error.message}`);
  }

  // If we found an image, get the user's email in a separate query
  let ownerEmail: string | undefined;
  if (data.user_id) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.user_id);
    
    if (!userError && userData.user) {
      ownerEmail = userData.user.email;
    }
  }

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
}

/**
 * Gets the current authenticated user
 * @returns Promise with the current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

/**
 * Deletes an image from storage and database
 * @param imageId - The ID of the image to delete
 * @param userId - The ID of the user who owns the image
 * @returns Promise with the result of the operation
 */
export async function deleteImage(imageId: string, userId: string) {
  // First get the image to get the file path
  const { data: image, error: getError } = await supabase
    .from("images")
    .select("file_path")
    .eq("id", imageId)
    .eq("user_id", userId)
    .single();

  if (getError) {
    throw new Error(`Failed to get image for deletion: ${getError.message}`);
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("images")
    .remove([image.file_path]);

  if (storageError) {
    throw new Error(`Failed to delete image from storage: ${storageError.message}`);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("images")
    .delete()
    .eq("id", imageId)
    .eq("user_id", userId);

  if (dbError) {
    throw new Error(`Failed to delete image from database: ${dbError.message}`);
  }

  return true;
}

/**
 * Checks if an image exists in storage and returns a valid URL
 * @param imageId - The ID of the image to check
 * @returns Promise with the validated URL or null if not found
 */
export async function validateImageUrl(imageId: string): Promise<string | null> {
  try {
    // First, get the image data from the database
    const { data: imageData, error: imageError } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .single();
    
    if (imageError || !imageData) {
      console.error(`Image with ID ${imageId} not found in database:`, imageError?.message);
      return null;
    }
    
    // Check if the file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("images")
      .list(imageData.file_path.split('/')[0], {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });
      
    if (fileError) {
      console.error(`Error checking storage for image ${imageId}:`, fileError.message);
    }
    
    const fileName = imageData.file_path.split('/').pop();
    const fileExists = fileData?.some(file => file.name === fileName);
    
    if (!fileExists) {
      console.error(`File for image ${imageId} not found in storage bucket`);
      return null;
    }
    
    // Generate a fresh URL
    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(imageData.file_path);
    
    if (!urlData?.publicUrl) {
      console.error(`Failed to generate public URL for image ${imageId}`);
      return null;
    }
    
    // Update the URL in the database if it has changed
    if (urlData.publicUrl !== imageData.public_url) {
      const { error: updateError } = await supabase
        .from("images")
        .update({ public_url: urlData.publicUrl })
        .eq("id", imageId);
      
      if (updateError) {
        console.error(`Failed to update URL for image ${imageId}:`, updateError.message);
      }
    }
    
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Unexpected error validating image ${imageId}:`, error);
    return null;
  }
}
