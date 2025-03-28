"use client"

import { useState, useRef, ChangeEvent, useEffect } from "react"
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
import { getCurrentUser } from "@/lib/supabase-utils"

interface VerificationResult {
  isVerified: boolean
  message: string
  details?: string
  uploadDate?: string
}

export default function VerifyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get the current user ID when the component mounts
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          setCurrentUserId(user.id)
          console.log("Current user ID:", user.id)
        }
      } catch (error) {
        console.error("Error fetching current user:", error)
      }
    }
    
    fetchCurrentUser()
  }, [])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      // Reset verification result when a new file is selected
      setVerificationResult(null)
    }
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
    
    // Ensure user is logged in
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to verify images.",
        variant: "destructive",
      })
      router.push("/login")
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
      
      // Search for images with matching filename first to find the original image
      // This approach allows us to detect if the hash has changed (indicating tampering)
      const imageByName = await findImageByFileNameAction(file.name, currentUserId)
      
      if (!imageByName) {
        // If no image found by filename, try hash as a fallback
        const imageByHash = await findImageByHashAction(fileHash, currentUserId)
        
        if (!imageByHash) {
          console.log("No image found by filename or hash")
          setVerificationResult({
            isVerified: false,
            message: "Verification Failed",
            details: "This image could not be verified. It may not be registered in your account.",
          })
          return
        }
        
        // Found by hash but not by name (unusual case - possibly renamed)
        console.log("Image found by hash but not by filename")
        
        // Get the public key and verify the signature
        const publicKeyString = await getUserPublicKeyAction(imageByHash.userId)
        
        if (!publicKeyString) {
          console.error("Could not retrieve public key")
          throw new Error("Could not retrieve public key for verification")
        }
        
        // Import the public key
        const publicKey = await importPublicKey(publicKeyString)
        
        // Verify the signature
        const isValid = await verifyFileSignature(file, imageByHash.signature, publicKey)
        
        if (isValid) {
          setVerificationResult({
            isVerified: true,
            message: "Image Verified Successfully",
            details: "This image is authentic and has not been modified since it was signed, but it may have been renamed.",
            uploadDate: new Date(imageByHash.createdAt).toLocaleString(),
          })
        } else {
          setVerificationResult({
            isVerified: false,
            message: "Signature Verification Failed",
            details: "The image hash matches a registered image, but the cryptographic signature is invalid.",
            uploadDate: new Date(imageByHash.createdAt).toLocaleString(),
          })
        }
        return
      }
      
      // Image found by filename - now check if hash matches
      if (imageByName.hash !== fileHash) {
        console.log("Image found by filename but hash doesn't match")
        console.log("Calculated hash:", fileHash)
        console.log("Stored hash:", imageByName.hash)
        
        setVerificationResult({
          isVerified: false,
          message: "Image Has Been Modified",
          details: "An image with this filename exists in your account, but its content has been modified since it was originally signed.",
          uploadDate: new Date(imageByName.createdAt).toLocaleString(),
        })
        return
      }
      
      // Hash matches - now verify the cryptographic signature
      console.log("Hash matches, verifying signature")
      
      // Get the public key
      const publicKeyString = await getUserPublicKeyAction(imageByName.userId)
      
      if (!publicKeyString) {
        console.error("Could not retrieve public key")
        throw new Error("Could not retrieve public key for verification")
      }
      
      // Import the public key
      const publicKey = await importPublicKey(publicKeyString)
      
      // Verify the signature
      const isValid = await verifyFileSignature(file, imageByName.signature, publicKey)
      
      if (isValid) {
        console.log("Signature verified successfully")
        setVerificationResult({
          isVerified: true,
          message: "Image Verified Successfully",
          details: "This image is authentic and has not been modified since it was signed.",
          uploadDate: new Date(imageByName.createdAt).toLocaleString(),
        })
      } else {
        console.log("Signature verification failed")
        setVerificationResult({
          isVerified: false,
          message: "Signature Verification Failed",
          details: "The image appears unmodified based on its hash, but the cryptographic signature is invalid. This could indicate sophisticated tampering.",
          uploadDate: new Date(imageByName.createdAt).toLocaleString(),
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
        <div className="bg-slate-800/70 p-6 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center mb-4">
            {verificationResult.isVerified ? (
              <div className="bg-green-500/20 p-3 rounded-full mr-4">
                <ShieldCheck className="h-8 w-8 text-green-400" />
              </div>
            ) : (
              <div className="bg-red-500/20 p-3 rounded-full mr-4">
                <ShieldX className="h-8 w-8 text-red-400" />
              </div>
            )}
            <h2 className={`text-xl font-semibold ${
              verificationResult.isVerified ? 'text-green-400' : 'text-red-400'
            }`}>
              {verificationResult.message}
            </h2>
          </div>
          <p className="text-gray-400 mb-4">{verificationResult.details}</p>
          
          {verificationResult.uploadDate && (
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Upload Date</p>
                <p className="text-white">{verificationResult.uploadDate}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-[#0f1218] p-6 rounded-lg mb-6">
        <h2 className="text-xl font-medium mb-4">How Verification Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[#1a202c]">
            <h3 className="font-medium mb-2">1. Hash Calculation</h3>
            <p className="text-sm text-gray-400">
              We calculate a SHA-256 hash of the uploaded image to create a unique digital fingerprint.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#1a202c]">
            <h3 className="font-medium mb-2">2. Database Search</h3>
            <p className="text-sm text-gray-400">
              We search our database for matching images by comparing hash values.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#1a202c]">
            <h3 className="font-medium mb-2">3. Signature Verification</h3>
            <p className="text-sm text-gray-400">
              We verify the digital signature using the owner's public key to confirm authenticity.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#1a202c]">
            <h3 className="font-medium mb-2">4. Integrity Check</h3>
            <p className="text-sm text-gray-400">
              We confirm the image hasn't been modified since it was signed by the original uploader.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={verifyImage}
          disabled={!file || isVerifying}
          className="bg-white text-black hover:bg-gray-200"
        >
          {isVerifying ? "Verifying..." : "Verify Image"}
        </Button>
      </div>
    </div>
  )
}
