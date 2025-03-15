"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { generateRSAKeyPair, exportPublicKey } from "@/lib/crypto-utils"
import { saveUserPublicKeyAction } from "@/app/actions/profile"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to generate RSA key pair
  const generateKeyPair = async (): Promise<{ publicKey: string; privateKey: string }> => {
    try {
      // Use the updated generateRSAKeyPair function
      const keyPair = await generateRSAKeyPair();

      // Export the keys - public key as base64 string
      const publicKeyString = await exportPublicKey(keyPair.publicKey);
      
      // Export private key as JWK for better compatibility
      const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

      return {
        publicKey: publicKeyString,
        privateKey: JSON.stringify(privateKeyJwk),
      };
    } catch (error) {
      console.error("Error generating key pair:", error);
      throw new Error("Failed to generate encryption keys");
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validate password match
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match")
      }

      // Generate RSA key pair
      const { publicKey, privateKey } = await generateKeyPair()
      
      toast({
        title: "Keys generated",
        description: "Your encryption keys have been successfully generated",
      })

      // Register user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        throw authError
      }

      if (authData.user) {
        try {
          // Save the public key to the user profile using server action
          await saveUserPublicKeyAction(authData.user.id, publicKey)
          
          // Download private key as file - format it correctly for later use
          const privateKeyData = { privateKey }
          const blob = new Blob([JSON.stringify(privateKeyData)], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `private-key-${authData.user.id}.json`
          document.body.appendChild(a)
          a.click()
          
          // Small delay to ensure download starts before cleanup
          setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }, 100)
          
          toast({
            title: "Registration successful",
            description: "Your private key is being downloaded. Please keep it safe!",
          })
          
          // Redirect to login page after a short delay to ensure download completes
          setTimeout(() => {
            router.push("/login")
          }, 2000)
        } catch (downloadError) {
          console.error("Error downloading private key:", downloadError)
          toast({
            title: "Registration successful but key download failed",
            description: "Please contact support to reset your account.",
            variant: "destructive",
          })
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      setError(error.message || "An error occurred during registration")
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] text-white">
      <div className="w-full max-w-md p-8 space-y-8 bg-[#0f1218] rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="mt-2 text-sm text-gray-400">
            Register to use our secure image verification system
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleRegister}>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="bg-[#171b21] border-[#30363d]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-[#171b21] border-[#30363d]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-[#171b21] border-[#30363d]"
            />
          </div>

          <div className="text-xs text-gray-400">
            <p>By registering:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>A unique RSA key pair will be generated for your account</li>
              <li>Your private key will be downloaded to your device</li>
              <li>Keep your private key secure - it cannot be recovered if lost</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-gray-200"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
