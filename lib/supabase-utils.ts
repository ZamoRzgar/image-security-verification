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

  // Upload the file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get the public URL for the uploaded file
  const { data: publicUrlData } = supabase.storage
    .from("images")
    .getPublicUrl(filePath);

  // Save the image metadata to the database
  const { data: imageData, error: imageError } = await supabase
    .from("images")
    .insert({
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      public_url: publicUrlData.publicUrl,
      signature,
      hash,
    })
    .select()
    .single();

  if (imageError) {
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
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get user images: ${error.message}`);
  }

  return (
    data?.map((image) => ({
      id: image.id,
      fileName: image.file_name,
      fileSize: image.file_size,
      fileType: image.file_type,
      publicUrl: image.public_url,
      signature: image.signature,
      hash: image.hash,
      createdAt: image.created_at,
      userId: image.user_id,
    })) || []
  );
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
