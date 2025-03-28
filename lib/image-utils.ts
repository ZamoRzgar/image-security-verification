/**
 * Utility functions for image handling and error logging
 * Provides consistent error handling for image loading across the application
 */

import { toast as showToast } from "@/hooks/use-toast"

// Types
export interface ImageErrorContext {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  imageUrl?: string;
  imageId?: string;
  timestamp: string;
  errorType: 'load' | 'fetch' | 'decode' | 'unknown';
  component: string;
}

/**
 * Logs detailed image error information
 * @param error - The error object
 * @param context - Additional context about the error
 */
export function logImageError(error: unknown, context: ImageErrorContext): void {
  // Create a detailed error log
  const errorLog = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  };

  // Log to console with detailed context
  console.error(`[Image Error] ${context.errorType} in ${context.component}:`, errorLog);

  // You could also send this to a monitoring service in production
}

/**
 * Handles image loading errors with appropriate user feedback
 * @param error - The error that occurred
 * @param context - Additional context about the error
 * @param notifyUser - Whether to show a toast notification to the user
 */
export function handleImageError(error: unknown, context: ImageErrorContext, notifyUser = true): void {
  // Log the error with detailed context
  logImageError(error, context);

  // Provide user feedback if requested
  if (notifyUser) {
    let title = "Image Error";
    let description = "Failed to load image. Please try again.";

    // Customize message based on error type
    switch (context.errorType) {
      case 'load':
        title = "Image Load Failed";
        description = "Failed to load the image. It may be corrupted or inaccessible.";
        break;
      case 'fetch':
        title = "Image Fetch Failed";
        description = "Failed to fetch the image from storage. Please check your connection.";
        break;
      case 'decode':
        title = "Image Format Error";
        description = "The image format is not supported or the file is corrupted.";
        break;
    }

    // Show toast notification to user
    showToast({
      title,
      description,
      variant: "destructive",
    });
  }
}

/**
 * Validates an image file
 * @param file - The file to validate
 * @returns Object with validation result and error message if any
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: "Please select a valid image file (JPEG, PNG, etc.)."
    };
  }
  
  // Check file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: "Image is too large. Please select an image smaller than 10MB."
    };
  }
  
  return { isValid: true };
}

/**
 * Creates a fallback image element for failed images
 * @param message - Custom message to display
 * @returns HTML string for the fallback element
 */
export function createImageFallbackHTML(message = "Image failed to load"): string {
  return `
    <div class="flex flex-col items-center justify-center bg-slate-800/50 p-4 rounded w-full h-full">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
           class="text-blue-400/50 mb-2">
        <rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <path d="m21 15-5-5L5 21"></path>
      </svg>
      <p class="text-sm text-center text-blue-200/70">${message}</p>
    </div>
  `;
}

/**
 * Preloads an image to check if it can be loaded successfully
 * @param src - The image source URL
 * @returns Promise that resolves to true if image loaded successfully, false otherwise
 */
export function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}
