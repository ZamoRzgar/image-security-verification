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
      // Calculate the hash of the uploaded image
      const fileHash = await calculateFileHash(file)
      console.log("File hash calculated:", fileHash)
      
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
        setVerificationResult({
          isVerified: false,
          message: "Image Has Been Modified",
          details: "An image with this filename exists in our system, but its content has been modified.",
          ownerEmail: imageByName.ownerEmail,
          uploadDate: new Date(imageByName.createdAt).toLocaleString(),
        })
        return
      }
      
      // Image found with matching hash
      console.log("Image found with matching hash:", imageByHash.id)
      
      // Get the public key of the user who uploaded the image using server action
      const publicKeyString = await getUserPublicKeyAction(imageByHash.userId)
      
      if (!publicKeyString) {
        console.error("Could not retrieve public key")
        throw new Error("Could not retrieve public key for verification")
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
              verificationResult.isVerified ? "bg-green-500/20" : "bg-red-500/20"
            }`}>
              {verificationResult.isVerified ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldX className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div>
              <h2 className={`text-xl font-medium mb-2 ${
                verificationResult.isVerified ? "text-green-500" : "text-red-500"
              }`}>
                {verificationResult.message}
              </h2>
              <p className="text-gray-400 mb-4">{verificationResult.details}</p>
              
              {verificationResult.ownerEmail && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Owner</p>
                    <p className="text-white">{verificationResult.ownerEmail}</p>
                  </div>
                  {verificationResult.uploadDate && (
                    <div>
                      <p className="text-gray-500">Upload Date</p>
                      <p className="text-white">{verificationResult.uploadDate}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
