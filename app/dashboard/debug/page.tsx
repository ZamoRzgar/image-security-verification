"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { debugUserProfile } from "@/app/actions/debug"
import { regenerateKeysAction } from "@/app/actions/regenerate-keys"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DebugPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [debugResult, setDebugResult] = useState<any>(null)
  const [privateKey, setPrivateKey] = useState<string | null>(null)

  const handleDebug = async () => {
    setIsLoading(true)
    
    try {
      const result = await debugUserProfile()
      setDebugResult(result)
      
      if (result.success) {
        if (result.fixed) {
          toast({
            title: "Profile Fixed",
            description: "Your user profile has been fixed. You can now try verifying images again.",
          })
        } else {
          toast({
            title: "Profile Valid",
            description: "Your user profile is valid. If you're still having issues, please check the logs.",
          })
        }
      } else {
        toast({
          title: "Debug Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Debug error:", error)
      toast({
        title: "Debug Failed",
        description: error.message || "An error occurred during debugging",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerateKeys = async () => {
    setIsRegenerating(true)
    
    try {
      const result = await regenerateKeysAction()
      
      if (result.success && result.privateKey) {
        setPrivateKey(result.privateKey)
        
        toast({
          title: "Keys Regenerated",
          description: "Your keys have been regenerated. Please download your new private key.",
        })
      } else {
        toast({
          title: "Regeneration Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Regeneration error:", error)
      toast({
        title: "Regeneration Failed",
        description: error.message || "An error occurred during key regeneration",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const downloadPrivateKey = () => {
    if (!privateKey) return
    
    try {
      // Get the user ID from the debug result
      const userId = debugResult?.userId || "user"
      
      // Format the private key for download
      const privateKeyData = { privateKey }
      const blob = new Blob([JSON.stringify(privateKeyData)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `private-key-${userId}.json`
      document.body.appendChild(a)
      a.click()
      
      // Small delay to ensure download starts before cleanup
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      
      toast({
        title: "Download Started",
        description: "Your private key is being downloaded. Please keep it safe!",
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download your private key. Please try again.",
        variant: "destructive",
      })
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
        <h1 className="text-2xl font-bold">Debug Profile</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Diagnostics</CardTitle>
          <CardDescription>
            This tool will check your user profile and fix any issues with your public key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            If you're having issues with image verification, this tool can help diagnose and fix problems with your user profile.
            It will check if your public key is properly stored in the database and fix it if necessary.
          </p>
          
          {debugResult && (
            <div className="bg-[#0f1218] p-4 rounded-md mt-4 overflow-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            </div>
          )}
          
          {debugResult && !debugResult.success && !debugResult.publicKeyExists && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Missing Public Key</AlertTitle>
              <AlertDescription>
                Your public key is missing. You need to regenerate your keys to fix this issue.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleDebug} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Debugging..." : "Run Diagnostics"}
          </Button>
          
          {debugResult && !debugResult.success && !debugResult.publicKeyExists && (
            <Button 
              onClick={handleRegenerateKeys} 
              disabled={isRegenerating}
              variant="destructive"
              className="w-full"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate Keys"}
            </Button>
          )}
          
          {privateKey && (
            <Button 
              onClick={downloadPrivateKey} 
              variant="outline"
              className="w-full"
            >
              Download Private Key
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
