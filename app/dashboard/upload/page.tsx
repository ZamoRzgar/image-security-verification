"use client"

import { useState, useRef, ChangeEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Upload, FileKey, CheckCircle } from "lucide-react"
import { 
  importPrivateKey, 
  calculateFileHash, 
  signFile,
  generateRSAKeyPair,
  exportPublicKey,
  exportPrivateKey
} from "@/lib/crypto-utils"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { uploadImageMetadata } from "@/app/actions/images"
import { uploadFileToStorage } from "@/app/actions/storage"
import { ensurePublicKeyAction } from "@/app/actions/ensure-public-key"

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [privateKeyError, setPrivateKeyError] = useState("")
  const [isCheckingPublicKey, setIsCheckingPublicKey] = useState(true)
  const [publicKeyExists, setPublicKeyExists] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const keyInputRef = useRef<HTMLInputElement>(null)

  // Check if the user has a public key when the component mounts
  useEffect(() => {
    const checkPublicKey = async () => {
      try {
        setIsCheckingPublicKey(true)
        const result = await ensurePublicKeyAction()
        
        if (result.success) {
          setPublicKeyExists(result.publicKeyExists)
          
          // If a new key pair was generated, save the private key
          if (result.privateKey) {
            const privateKeyObj = { privateKey: result.privateKey }
            const privateKeyBlob = new Blob([JSON.stringify(privateKeyObj, null, 2)], { type: 'application/json' })
            const privateKeyUrl = URL.createObjectURL(privateKeyBlob)
            
            // Create a link to download the private key
            const downloadLink = document.createElement('a')
            downloadLink.href = privateKeyUrl
            downloadLink.download = 'private_key.json'
            
            // Trigger the download
            document.body.appendChild(downloadLink)
            downloadLink.click()
            document.body.removeChild(downloadLink)
            
            // Clean up the URL object
            URL.revokeObjectURL(privateKeyUrl)
            
            toast({
              title: "New Key Pair Generated",
              description: "A new key pair has been generated for you. Your private key has been downloaded. Please keep it safe.",
            })
          }
        } else {
          console.error("Failed to check/ensure public key:", result.message)
          toast({
            title: "Key Check Failed",
            description: result.message || "Failed to check if you have a public key.",
            variant: "destructive",
          })
        }
      } catch (error: any) {
        console.error("Error checking public key:", error)
        toast({
          title: "Key Check Error",
          description: error.message || "An error occurred while checking your public key.",
          variant: "destructive",
        })
      } finally {
        setIsCheckingPublicKey(false)
      }
    }
    
    checkPublicKey()
  }, [toast])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleKeyFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const keyFile = e.target.files[0]
        const keyData = await keyFile.text()
        
        // First try parsing the JSON
        let jsonKey
        try {
          jsonKey = JSON.parse(keyData)
        } catch (parseError) {
          console.error("JSON parse error:", parseError)
          throw new Error("Invalid key file: Not a valid JSON file")
        }
        
        // Check if the expected structure exists
        if (!jsonKey.privateKey) {
          throw new Error("Invalid key file format: Missing privateKey property")
        }
        
        // Import the private key using our utility function
        try {
          const importedKey = await importPrivateKey(jsonKey.privateKey)
          setPrivateKey(importedKey)
          setPrivateKeyError("")
          
          toast({
            title: "Private Key Loaded",
            description: "Your private key has been loaded successfully.",
          })
        } catch (importError) {
          console.error("Key import error:", importError)
          throw new Error("Invalid key format: The key could not be imported")
        }
      } catch (error: any) {
        console.error("Error importing private key:", error)
        setPrivateKeyError(error.message || "Failed to load private key")
        toast({
          title: "Error Loading Key",
          description: error.message || "Failed to load your private key. Please check the file format.",
          variant: "destructive",
        })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    if (!privateKey) {
      toast({
        title: "No private key",
        description: "Please upload your private key file to sign the image",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)

      // Check if user already has a public key
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("Not authenticated")
      }
      
      // Ensure the user has a public key before proceeding
      const keyResult = await ensurePublicKeyAction()
      if (!keyResult.success || !keyResult.publicKeyExists) {
        throw new Error("Failed to verify your public key. Please try again or contact support.")
      }
      
      // Log file details before hash calculation
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      })
      
      // Calculate hash for the file
      const hash = await calculateFileHash(file)
      console.log("File hash calculated:", hash)
      
      // Create a signature for the file using RSA-PSS
      const signature = await signFile(file, privateKey)
      console.log("Signature created")
      
      // Store the original file details for reference
      const originalFileDetails = {
        name: file.name,
        size: file.size,
        type: file.type,
        hash: hash
      }
      console.log("Original file details:", originalFileDetails)
      
      // Upload file to storage using server action (bypasses RLS)
      console.log("Uploading file to storage:", file.name)
      const { success: storageSuccess, path, error: storageError } = await uploadFileToStorage(file)
      
      if (!storageSuccess || !path) {
        throw new Error(storageError || "Failed to upload file to storage")
      }
      
      console.log("File uploaded successfully:", path)
      
      // Use server action to upload image metadata (bypasses RLS)
      console.log("Uploading metadata to database")
      const { success, error } = await uploadImageMetadata({
        fileName: file.name,
        filePath: path,
        fileHash: hash,
        signature: signature,
        fileSize: file.size,
        fileType: file.type,
      })
      
      if (!success) {
        throw new Error(error || "Failed to save image metadata")
      }
      
      // Store upload details in localStorage for verification debugging
      try {
        localStorage.setItem(`image_${file.name}_details`, JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          hash: hash,
          uploadDate: new Date().toISOString()
        }))
      } catch (storageError) {
        console.warn("Could not store image details in localStorage:", storageError)
      }
      
      toast({
        title: "Upload Successful",
        description: "Your image has been uploaded and signed successfully.",
      })
      
      // Redirect to dashboard
      router.push("/dashboard")
      
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Upload Failed",
        description: error.message || `Error: ${JSON.stringify(error)}`,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="mr-4 text-blue-100 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">Upload Image</h1>
        </div>
        
        {isCheckingPublicKey ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
            <p className="text-blue-100">Checking your public key...</p>
          </div>
        ) : (
          <>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 mb-6 relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <h2 className="text-xl font-medium mb-4 text-white">Select Image to Upload</h2>
                <div 
                  className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-white/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <div className="flex flex-col items-center">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="Preview" 
                        className="max-h-48 max-w-full mb-4 rounded shadow-lg"
                      />
                      <p className="text-sm text-blue-100">{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-12 w-12 text-blue-200/50 mb-2" />
                      <p className="text-blue-100 mb-1">Click to select an image or drag and drop</p>
                      <p className="text-sm text-blue-200/50">PNG, JPG, WEBP up to 10MB</p>
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
            </div>
            
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 mb-6 relative overflow-hidden">
              <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <h2 className="text-xl font-medium mb-4 text-white">Upload Private Key</h2>
                <div 
                  className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-white/40 transition-colors"
                  onClick={() => keyInputRef.current?.click()}
                >
                  {privateKey ? (
                    <div className="flex flex-col items-center text-green-300">
                      <CheckCircle className="h-12 w-12 mb-2" />
                      <p className="mb-1">Private Key Loaded</p>
                      <p className="text-sm text-blue-100">Ready to sign your image</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FileKey className="h-12 w-12 text-blue-200/50 mb-2" />
                      <p className="text-blue-100 mb-1">Click to upload your private key file</p>
                      <p className="text-sm text-blue-200/50">JSON format</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={keyInputRef} 
                    onChange={handleKeyFileChange} 
                    accept=".json" 
                    className="hidden" 
                  />
                </div>
                {privateKeyError && (
                  <p className="text-red-300 mt-2 text-sm">{privateKeyError}</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button
                onClick={handleUpload}
                disabled={!file || !privateKey || isUploading}
                className="w-full max-w-md bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/30 border-0"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    Upload and Sign
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
