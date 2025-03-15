"use client"

import { useState, useRef, ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Upload, ShieldCheck, ShieldX } from "lucide-react"
import { 
  calculateFileHash, 
  importPublicKey, 
  verifyFileSignature 
} from "@/lib/crypto-utils"
import { 
  findImageByHashAction,
  findImageByFileNameAction,
  getUserPublicKeyAction
} from "@/app/actions/verify"

interface VerificationResult {
  isVerified: boolean
  message: string
  details?: string
  ownerEmail?: string
  uploadDate?: string
  debugInfo?: string
}

export default function VerifyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      // Reset verification result when a new file is selected
      setVerificationResult(null)
    }
  }

  // Function to check if two hashes are similar (allowing for minor differences)
  const areHashesSimilar = (hash1: string, hash2: string, tolerance = 5): boolean => {
    // Count the number of different characters between hashes
    let differences = 0
    const minLength = Math.min(hash1.length, hash2.length)
    
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] !== hash2[i]) {
        differences++
      }
    }
    
    // Add differences for length mismatch
    differences += Math.abs(hash1.length - hash2.length)
    
    // Return true if the differences are within tolerance
    return differences <= tolerance
  }

  const verifyImage = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select an image to verify.",
        variant: "destructive",
      })
      return
    }
    
    setIsVerifying(true)
    
    try {
      // Log file details before hash calculation
      console.log("Verifying file details:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      })
      
      // Calculate the hash of the uploaded image
      const fileHash = await calculateFileHash(file)
      console.log("File hash calculated:", fileHash)
      
      // Check if we have stored details for this file in localStorage
      let storedDetails = null
      try {
        const storedData = localStorage.getItem(`image_${file.name}_details`)
        if (storedData) {
          storedDetails = JSON.parse(storedData)
          console.log("Found stored details for this file:", storedDetails)
        }
      } catch (error) {
        console.warn("Error retrieving stored details:", error)
      }
      
      // Search for images with matching hash in the database using server action
      const imageByHash = await findImageByHashAction(fileHash)
      
      if (!imageByHash) {
        console.log("No exact hash match found, trying filename")
        // If no exact hash match, try to find by filename as a fallback
        const imageByName = await findImageByFileNameAction(file.name)
        
        if (!imageByName) {
          console.log("No image found by filename either")
          setVerificationResult({
            isVerified: false,
            message: "Image Not Found",
            details: "This image has not been registered in our system.",
          })
          return
        }
        
        // Image found by filename but hash doesn't match
        console.log("Image found by filename but hash doesn't match")
        console.log("Calculated hash:", fileHash)
        console.log("Stored hash:", imageByName.hash)
        
        // Check if the hashes are similar (allowing for minor differences)
        const hashesAreSimilar = areHashesSimilar(fileHash, imageByName.hash)
        console.log("Hashes are similar:", hashesAreSimilar)
        
        // Add debugging info to help diagnose the issue
        const debugInfo = `
          Calculated hash: ${fileHash}
          Stored hash: ${imageByName.hash}
          Hashes similar: ${hashesAreSimilar}
          File size: ${file.size} bytes
          File type: ${file.type}
          Original size: ${imageByName.fileSize} bytes
          Original type: ${imageByName.fileType}
        `
        console.log(debugInfo)
        
        // If hashes are similar, proceed with signature verification
        if (hashesAreSimilar) {
          console.log("Hashes are similar enough, proceeding with signature verification")
          
          try {
            // Get the public key of the user who uploaded the image
            const publicKeyString = await getUserPublicKeyAction(imageByName.userId)
            
            if (!publicKeyString) {
              console.error("Could not retrieve public key")
              setVerificationResult({
                isVerified: false,
                message: "Verification Error",
                details: "Could not retrieve the public key for verification. The image exists but cannot be verified.",
                ownerEmail: imageByName.ownerEmail,
                uploadDate: new Date(imageByName.createdAt).toLocaleString(),
                debugInfo: `${debugInfo}\nError: Public key not found for user ${imageByName.userId}`
              })
              return
            }
            
            // Import the public key
            console.log("Importing public key")
            const publicKey = await importPublicKey(publicKeyString)
            
            // Verify the signature
            console.log("Verifying signature")
            const isValid = await verifyFileSignature(
              file,
              imageByName.signature,
              publicKey
            )
            
            if (isValid) {
              console.log("Signature verified successfully despite hash difference")
              setVerificationResult({
                isVerified: true,
                message: "Image Verified Successfully",
                details: "This image is authentic and has not been significantly modified since it was signed.",
                ownerEmail: imageByName.ownerEmail,
                uploadDate: new Date(imageByName.createdAt).toLocaleString(),
                debugInfo: hashesAreSimilar ? "Note: Minor differences detected but signature verified." : undefined
              })
              return
            } else {
              console.log("Signature verification failed")
              setVerificationResult({
                isVerified: false,
                message: "Signature Verification Failed",
                details: "The image was found but its signature verification failed. This could indicate tampering.",
                ownerEmail: imageByName.ownerEmail,
                uploadDate: new Date(imageByName.createdAt).toLocaleString(),
                debugInfo
              })
              return
            }
          } catch (keyError: any) {
            console.error("Error retrieving or using public key:", keyError)
            setVerificationResult({
              isVerified: false,
              message: "Key Verification Error",
              details: `Error retrieving or using public key: ${keyError.message}`,
              ownerEmail: imageByName.ownerEmail,
              uploadDate: new Date(imageByName.createdAt).toLocaleString(),
              debugInfo: `${debugInfo}\nKey Error: ${keyError.message}`
            })
            return
          }
        }
        
        setVerificationResult({
          isVerified: false,
          message: "Image Has Been Modified",
          details: "An image with this filename exists in our system, but its content has been modified.",
          ownerEmail: imageByName.ownerEmail,
          uploadDate: new Date(imageByName.createdAt).toLocaleString(),
          debugInfo
        })
        return
      }
      
      // Image found with matching hash
      console.log("Image found with matching hash:", imageByHash.id)
      
      try {
        // Get the public key of the user who uploaded the image using server action
        const publicKeyString = await getUserPublicKeyAction(imageByHash.userId)
        
        if (!publicKeyString) {
          console.error("Could not retrieve public key")
          setVerificationResult({
            isVerified: false,
            message: "Verification Error",
            details: "Could not retrieve the public key for verification. The image exists but cannot be verified.",
            ownerEmail: imageByHash.ownerEmail,
            uploadDate: new Date(imageByHash.createdAt).toLocaleString(),
            debugInfo: `Error: Public key not found for user ${imageByHash.userId}`
          })
          return
        }
        
        // Import the public key
        console.log("Importing public key")
        const publicKey = await importPublicKey(publicKeyString)
        
        // Verify the signature
        console.log("Verifying signature")
        const isValid = await verifyFileSignature(
          file,
          imageByHash.signature,
          publicKey
        )
        
        if (isValid) {
          console.log("Signature verified successfully")
          setVerificationResult({
            isVerified: true,
            message: "Image Verified Successfully",
            details: "This image is authentic and has not been modified since it was signed.",
            ownerEmail: imageByHash.ownerEmail,
            uploadDate: new Date(imageByHash.createdAt).toLocaleString(),
          })
        } else {
          console.log("Signature verification failed")
          setVerificationResult({
            isVerified: false,
            message: "Signature Verification Failed",
            details: "The image hash matches but the signature verification failed. This could indicate tampering.",
            ownerEmail: imageByHash.ownerEmail,
            uploadDate: new Date(imageByHash.createdAt).toLocaleString(),
          })
        }
      } catch (keyError: any) {
        console.error("Error retrieving or using public key:", keyError)
        setVerificationResult({
          isVerified: false,
          message: "Key Verification Error",
          details: `Error retrieving or using public key: ${keyError.message}`,
          ownerEmail: imageByHash.ownerEmail,
          uploadDate: new Date(imageByHash.createdAt).toLocaleString(),
          debugInfo: `Key Error: ${keyError.message}`
        })
      }
    } catch (error: any) {
      console.error("Verification error:", error)
      toast({
        title: "Verification Failed",
        description: error.message || "There was an error verifying the image. Please try again.",
        variant: "destructive",
      })
      setVerificationResult({
        isVerified: false,
        message: "Verification Error",
        details: error.message || "An error occurred during verification. Please try again.",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Verify Image</h1>
      </div>
      
      <div className="bg-[#0f1218] p-6 rounded-lg mb-6">
        <h2 className="text-xl font-medium mb-4">Select Image to Verify</h2>
        <div 
          className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <div className="flex flex-col items-center">
              <img 
                src={URL.createObjectURL(file)} 
                alt="Preview" 
                className="max-h-48 max-w-full mb-4 rounded"
              />
              <p className="text-sm text-gray-400">{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-500 mb-2" />
              <p className="text-gray-400 mb-1">Click to select an image or drag and drop</p>
              <p className="text-sm text-gray-500">PNG, JPG, WEBP up to 10MB</p>
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </div>
      
      {verificationResult && (
        <div className={`bg-[#0f1218] p-6 rounded-lg mb-6 border-l-4 ${
          verificationResult.isVerified ? "border-green-500" : "border-red-500"
        }`}>
          <div className="flex items-start">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
              verificationResult.isVerified 
                ? "bg-green-500/20" 
                : "bg-red-500/20"
            }`}>
              {verificationResult.isVerified 
                ? <ShieldCheck className="h-5 w-5 text-green-400" /> 
                : <ShieldX className="h-5 w-5 text-red-400" />
              }
            </div>
            <div>
              <h3 className={`text-lg font-medium mb-1 ${
                verificationResult.isVerified 
                  ? "text-green-400" 
                  : "text-red-400"
              }`}>
                {verificationResult.message}
              </h3>
              <p className="text-gray-400 mb-3">{verificationResult.details}</p>
              
              {verificationResult.ownerEmail && (
                <div className="text-sm text-gray-400 mb-1">
                  <span className="font-medium">Owner:</span> {verificationResult.ownerEmail}
                </div>
              )}
              
              {verificationResult.uploadDate && (
                <div className="text-sm text-gray-400">
                  <span className="font-medium">Uploaded:</span> {verificationResult.uploadDate}
                </div>
              )}
              
              {verificationResult.debugInfo && (
                <div className="mt-4 p-3 bg-gray-800 rounded text-xs font-mono text-gray-300 whitespace-pre-wrap">
                  {verificationResult.debugInfo}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-center">
        <Button
          onClick={verifyImage}
          disabled={!file || isVerifying}
          className="w-full max-w-md bg-white text-black hover:bg-gray-200"
        >
          {isVerifying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 mr-2" />
              Verify Image
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
