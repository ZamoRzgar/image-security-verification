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
          
          toast({
            title: "Registration successful",
            description: "You can now log in to your account.",
          })
          
          // Redirect to login page
          router.push("/login")
        } catch (error) {
          console.error("Error saving public key:", error)
          toast({
            title: "Registration error",
            description: "There was a problem completing your registration.",
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="w-full max-w-md p-8 space-y-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl relative overflow-hidden z-10">
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">Create an account</h1>
            <p className="mt-2 text-sm text-blue-100/80">
              Register to use our secure image verification system
            </p>
          </div>

          {error && (
            <div className="p-3 mt-4 bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6 mt-6" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-100">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="bg-white/5 border-white/20 focus:border-blue-400/50 focus:ring-blue-400/20 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-100">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/5 border-white/20 focus:border-blue-400/50 focus:ring-blue-400/20 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-blue-100">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-white/5 border-white/20 focus:border-blue-400/50 focus:ring-blue-400/20 transition-colors"
              />
            </div>

            <div className="text-xs text-blue-100/80 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
              <p>By registering:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>A unique RSA key pair will be generated for your account</li>
                <li>Keep your account credentials secure</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/30 border-0"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-blue-100/80">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-300 hover:text-blue-200 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
