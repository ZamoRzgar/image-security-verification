"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectedFrom") || "/dashboard"
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace("/dashboard")
      }
    }
    
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      toast({
        title: "Login successful",
        description: "You have been logged in successfully",
      })
      
      // Navigate to the intended destination
      router.replace(redirectTo)
    } catch (error: any) {
      setError(error.message || "An error occurred during login")
      toast({
        title: "Login failed",
        description: error.message || "An error occurred during login",
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
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">Sign in to your account</h1>
            <p className="mt-2 text-sm text-blue-100/80">
              Enter your email and password to access your secure image verification account
            </p>
          </div>

          {error && (
            <div className="p-3 mt-4 bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6 mt-6" onSubmit={handleLogin}>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-blue-100">Password</Label>
                <Link 
                  href="/reset-password" 
                  className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
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

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/30 border-0"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-blue-100/80">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-300 hover:text-blue-200 transition-colors">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
