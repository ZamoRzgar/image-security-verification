"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ImageIcon, ShieldCheck, Upload, FileKey } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateInitialKeysAction } from "@/app/actions/generate-initial-keys"
import { downloadStringAsFile } from "@/lib/crypto-utils"

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingKeys, setIsCheckingKeys] = useState(true)
  const [privateKey, setPrivateKey] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          // Let middleware handle the redirect
          return
        }
        
        setUser(session.user)
      } catch (error) {
        console.error("Error checking auth session:", error)
        toast({
          title: "Authentication error",
          description: "Please try logging in again",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    checkSession()
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          router.replace("/login")
        } else if (session) {
          setUser(session.user)
          setIsLoading(false)
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [router, toast])

  useEffect(() => {
    // Check if the user needs to generate keys
    const checkKeys = async () => {
      try {
        setIsCheckingKeys(true)
        const result = await generateInitialKeysAction()
        
        if (result.success && result.needsKeys && result.privateKey) {
          setPrivateKey(result.privateKey)
          toast({
            title: "New Keys Generated",
            description: "We've generated a new key pair for you. Please download your private key.",
            variant: "default",
          })
        }
      } catch (error) {
        console.error("Error checking keys:", error)
      } finally {
        setIsCheckingKeys(false)
      }
    }
    
    checkKeys()
  }, [toast])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      })
      router.replace("/")
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "There was a problem signing out",
        variant: "destructive",
      })
    }
  }

  const handleDownloadKey = () => {
    if (privateKey) {
      downloadStringAsFile(privateKey, "private-key.jwk", "application/json")
      setPrivateKey(null)
      toast({
        title: "Private Key Downloaded",
        description: "Keep this file secure. You'll need it to sign images.",
        variant: "default",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Secure Image Dashboard</h1>
          <p className="text-gray-400 mt-2">Welcome, {user?.email}</p>
        </div>
        <Button 
          onClick={handleSignOut}
          variant="outline"
          className="border-gray-700 hover:bg-gray-800"
        >
          Sign out
        </Button>
      </div>
      
      {isCheckingKeys ? (
        <div className="bg-[#0f1218] p-6 rounded-lg mb-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white mr-3"></div>
          <p>Checking your encryption keys...</p>
        </div>
      ) : privateKey ? (
        <div className="bg-[#0f1218] p-6 rounded-lg mb-6 border-l-4 border-blue-500">
          <div className="flex items-start">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-4">
              <FileKey className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-1 text-blue-400">
                New Private Key Generated
              </h3>
              <p className="text-gray-400 mb-4">
                We've generated a new key pair for you. You must download your private key to sign images.
                Keep this file secure - you'll need it for future uploads.
              </p>
              <Button
                onClick={handleDownloadKey}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileKey className="h-4 w-4 mr-2" />
                Download Private Key
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-[#0f1218] p-6 rounded-lg hover:bg-[#161b24] transition-colors">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-4">
              <Upload className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-medium">Upload Image</h2>
          </div>
          <p className="text-gray-400 mb-4">
            Upload and sign an image with your private key to verify its authenticity.
          </p>
          <Button
            className="w-full bg-white text-black hover:bg-gray-200"
            onClick={() => router.push("/dashboard/upload")}
          >
            Upload Image
          </Button>
        </div>
        
        <div className="bg-[#0f1218] p-6 rounded-lg hover:bg-[#161b24] transition-colors">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mr-4">
              <ShieldCheck className="h-5 w-5 text-green-400" />
            </div>
            <h2 className="text-xl font-medium">Verify Image</h2>
          </div>
          <p className="text-gray-400 mb-4">
            Verify the authenticity and integrity of an image using its digital signature.
          </p>
          <Button
            className="w-full bg-white text-black hover:bg-gray-200"
            onClick={() => router.push("/verify")}
          >
            Verify Image
          </Button>
        </div>
        
        <div className="bg-[#0f1218] p-6 rounded-lg hover:bg-[#161b24] transition-colors">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-4">
              <ImageIcon className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-medium">My Images</h2>
          </div>
          <p className="text-gray-400 mb-4">
            View and manage all your uploaded and verified secure images.
          </p>
          <Button
            className="w-full bg-white text-black hover:bg-gray-200"
            onClick={() => router.push("/dashboard/images")}
          >
            View Images
          </Button>
        </div>
      </div>
      
      <div className="mt-8 bg-[#0f1218] p-6 rounded-lg">
        <h2 className="text-xl font-medium mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <span className="text-blue-400 font-medium">1</span>
            </div>
            <h3 className="font-medium mb-2">Upload</h3>
            <p className="text-gray-400 text-sm">
              Upload your image and sign it with your private key to create a unique digital signature.
            </p>
          </div>
          
          <div className="p-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <span className="text-blue-400 font-medium">2</span>
            </div>
            <h3 className="font-medium mb-2">Store</h3>
            <p className="text-gray-400 text-sm">
              Your image is securely stored along with its digital signature and hash for future verification.
            </p>
          </div>
          
          <div className="p-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
              <span className="text-blue-400 font-medium">3</span>
            </div>
            <h3 className="font-medium mb-2">Verify</h3>
            <p className="text-gray-400 text-sm">
              Anyone can verify the authenticity of your image using your public key and the stored signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
