/**
 * Utility functions for cryptographic operations related to image signing and verification
 */

/**
 * Generates an RSA key pair for signing and verification
 * @param userEntropy - Optional additional entropy to ensure uniqueness (e.g., user ID)
 * @returns Promise with the generated key pair
 */
export async function generateRSAKeyPair(userEntropy?: string): Promise<CryptoKeyPair> {
  // Check if we're in a browser environment
  const isServer = typeof window === 'undefined';
  const crypto = isServer ? require('crypto').webcrypto : window.crypto;
  
  // Add additional entropy if provided
  if (userEntropy) {
    // Create a buffer from the user entropy with timestamp for additional randomness
    const timestamp = Date.now();
    const randomValue = isServer 
      ? require('crypto').randomBytes(16).toString('hex') 
      : Math.random().toString(36).substring(2, 15);
    
    const entropyString = `${userEntropy}-${timestamp}-${randomValue}`;
    console.log(`Using entropy string: ${entropyString}`);
    
    const entropyBuffer = new TextEncoder().encode(entropyString);
    
    // In a real production environment, you would use this entropy to seed the PRNG
    // However, Web Crypto API doesn't allow direct seeding of the PRNG
    // This is a workaround to add some entropy to the key generation process
    
    // We'll use the entropy to modify the key generation parameters
    const hashBuffer = await crypto.subtle.digest('SHA-256', entropyBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Use multiple bytes from the hash to modify key parameters
    const modulusAdjustment = (hashArray[0] % 8) + 1; // Adjustment (1-8)
    
    // Create a unique public exponent based on user entropy
    // Standard is 65537 (0x10001) represented as [1,0,1]
    // We'll use a value close to this but unique per user
    // The exponent must be odd and > 1 for security
    let publicExponent;
    
    if (isServer) {
      // In Node.js, we can use a more direct approach
      const hash = require('crypto').createHash('sha256').update(entropyString).digest();
      // Ensure the exponent is odd by setting the last bit to 1
      const exponentValue = (65536 + (hash[0] % 64) * 2 + 1);
      publicExponent = new Uint8Array([
        (exponentValue >> 16) & 0xFF, 
        (exponentValue >> 8) & 0xFF, 
        exponentValue & 0xFF
      ]);
    } else {
      // In browser, keep it simpler
      publicExponent = new Uint8Array([1, 0, 1]);
    }
    
    console.log(`Generating key with entropy: ${userEntropy} (modulus: ${2048 + modulusAdjustment}, exponent: ${Array.from(publicExponent).join(',')})`);
    
    return crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048 + modulusAdjustment, // Variation in modulus length
        publicExponent: publicExponent,
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );
  }
  
  // Default key generation without additional entropy
  // This should never be used in production - always provide user entropy
  console.warn("Generating key WITHOUT user entropy - this should not happen in production!");
  return crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
}

/**
 * Exports a public key to base64 string format
 * @param publicKey - The public key to export
 * @returns Promise with the base64 encoded public key
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const crypto = typeof window !== 'undefined' 
    ? window.crypto 
    : require('crypto').webcrypto;
    
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  
  // Use Buffer in Node.js environment or Uint8Array in browser
  if (typeof window === 'undefined') {
    return Buffer.from(exported).toString('base64');
  } else {
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }
}

/**
 * Exports a private key to base64 string format
 * @param privateKey - The private key to export
 * @returns Promise with the base64 encoded private key
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const crypto = typeof window !== 'undefined' 
    ? window.crypto 
    : require('crypto').webcrypto;
    
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  
  if (typeof window === 'undefined') {
    return Buffer.from(exported).toString('base64');
  } else {
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }
}

/**
 * Imports a public key from a base64 string
 * @param publicKeyString - Base64 encoded public key
 * @returns Promise with the imported CryptoKey
 */
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  const crypto = typeof window !== 'undefined' 
    ? window.crypto 
    : require('crypto').webcrypto;
    
  let bytes;
  
  if (typeof window === 'undefined') {
    // Node.js environment
    bytes = Buffer.from(publicKeyString, 'base64');
  } else {
    // Browser environment
    const binaryString = atob(publicKeyString);
    bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
  }
  
  return crypto.subtle.importKey(
    "spki",
    bytes,
    {
      name: "RSA-PSS",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
}

/**
 * Imports a private key from a JSON Web Key (JWK) string
 * @param privateKeyString - JSON string containing the JWK private key
 * @returns Promise with the imported CryptoKey
 */
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  try {
    const crypto = typeof window !== 'undefined' 
      ? window.crypto 
      : require('crypto').webcrypto;
      
    // Parse the JWK from the string
    const jwk = JSON.parse(privateKeyString);
    
    // Import the JWK as a CryptoKey
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "RSA-PSS",
        hash: "SHA-256",
      },
      true,
      ["sign"]
    );
  } catch (error) {
    console.error("Error importing private key:", error);
    throw new Error("Failed to import private key: Invalid format");
  }
}

/**
 * Calculates the SHA-256 hash of a file
 * @param file - The file to hash
 * @returns Promise with the hex string representation of the hash
 */
export async function calculateFileHash(file: File): Promise<string> {
  const crypto = typeof window !== 'undefined' 
    ? window.crypto 
    : require('crypto').webcrypto;
    
  try {
    // Normalize the file reading process to ensure consistency
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a normalized view of the file data
    const dataView = new Uint8Array(arrayBuffer);
    
    // Log file information for debugging
    console.log(`Hashing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    
    // Calculate hash from the normalized data
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataView);
    
    // Convert hash to hex string in a consistent way
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log(`Generated hash: ${hashHex}`);
    
    return hashHex;
  } catch (error) {
    console.error("Error calculating file hash:", error);
    throw new Error(`Failed to calculate file hash: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Signs a file using a private key
 * @param file - The file to sign
 * @param privateKey - The private key to use for signing
 * @returns Promise with the base64 encoded signature
 */
export async function signFile(file: File, privateKey: CryptoKey): Promise<string> {
  const crypto = typeof window !== 'undefined' 
    ? window.crypto 
    : require('crypto').webcrypto;
    
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  
  const signature = await crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privateKey,
    hashBuffer
  );
  
  if (typeof window === 'undefined') {
    return Buffer.from(signature).toString('base64');
  } else {
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
}

/**
 * Verifies a file signature
 * @param file - The file to verify
 * @param signature - The base64 encoded signature
 * @param publicKey - The public key to use for verification
 * @returns Promise with a boolean indicating if the signature is valid
 */
export async function verifyFileSignature(
  file: File,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const crypto = typeof window !== 'undefined' 
    ? window.crypto 
    : require('crypto').webcrypto;
    
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  
  let signatureBuffer;
  
  if (typeof window === 'undefined') {
    // Node.js environment
    signatureBuffer = Buffer.from(signature, 'base64');
  } else {
    // Browser environment
    signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  }
  
  return crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    publicKey,
    signatureBuffer,
    hashBuffer
  );
}

/**
 * Downloads a string as a file
 * @param content - The string content to download
 * @param filename - The name of the file to download
 * @param contentType - The content type of the file
 */
export function downloadStringAsFile(
  content: string,
  filename: string,
  contentType = "application/octet-stream"
): void {
  // This function can only be used in browser environment
  if (typeof window === 'undefined') {
    throw new Error('downloadStringAsFile can only be used in browser environment');
  }
  
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Formats a date string to a readable format
 * @param dateString - The date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}
