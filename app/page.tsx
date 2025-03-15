import Link from "next/link"
import { ArrowRight, Shield, Lock, FileCheck, Cloud } from "lucide-react"
import Image from "next/image"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-300">
              <Cloud className="h-6 w-6 text-blue-300" />
              SecureImage
            </Link>
            <nav className="hidden md:flex ml-10 space-x-8">
              <Link href="#features" className="text-sm text-blue-100/80 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#security" className="text-sm text-blue-100/80 hover:text-white transition-colors">
                Security
              </Link>
              <Link href="#how-it-works" className="text-sm text-blue-100/80 hover:text-white transition-colors">
                How It Works
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm text-blue-100/80 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center px-4 py-2 text-sm bg-white/10 backdrop-blur-md text-white rounded-md border border-white/20 hover:bg-white/20 transition-all shadow-lg"
            >
              <span>Register</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="grid md:grid-cols-2 gap-12 py-20">
          <div className="flex flex-col justify-center">
            <div className="relative">
              <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-500/30 rounded-full blur-xl" />
              <h1 className="relative text-5xl sm:text-6xl lg:text-7xl font-medium leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">
                Secure Image
                <br />
                Verification
              </h1>
            </div>
            <p className="mt-4 text-xl text-blue-100/80">
              Authenticate and verify the integrity of your images using RSA digital signatures
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/30"
              >
                Get Started
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-md hover:bg-white/20 transition-all"
              >
                <span>Learn More</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all" />
              <div className="relative">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-500/30 backdrop-blur-md rounded-lg flex items-center justify-center mr-3">
                    <Shield className="h-4 w-4 text-blue-100" />
                  </div>
                  <span className="text-sm text-blue-100/80">Cryptographic Security</span>
                </div>
                <h2 className="text-xl font-medium mb-4 text-white">Protect your images with RSA encryption</h2>
                <p className="text-blue-100/80">
                  Ensure your images remain authentic and unaltered with our advanced cryptographic verification system.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">Key Features</h2>
            <p className="text-blue-100/80 max-w-2xl mx-auto">
              Our secure image verification system provides powerful tools to protect and verify your digital content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -right-10 -bottom-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all" />
              <div className="relative">
                <div className="w-12 h-12 bg-blue-500/30 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-blue-100" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-white">RSA Key Generation</h3>
                <p className="text-blue-100/80">
                  Generate unique RSA key pairs for secure signing and verification of your images.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -left-10 -bottom-10 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all" />
              <div className="relative">
                <div className="w-12 h-12 bg-indigo-500/30 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
                  <FileCheck className="h-6 w-6 text-blue-100" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-white">Image Verification</h3>
                <p className="text-blue-100/80">
                  Verify the authenticity and integrity of images with cryptographic signatures.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -right-10 -top-10 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all" />
              <div className="relative">
                <div className="w-12 h-12 bg-purple-500/30 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-100" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-white">Tamper Protection</h3>
                <p className="text-blue-100/80">
                  Detect any unauthorized modifications to your images with hash-based integrity checks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">How It Works</h2>
            <p className="text-blue-100/80 max-w-2xl mx-auto">
              Our system uses RSA digital signatures and hash functions to ensure image authenticity and integrity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -left-10 -top-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all" />
              <div className="relative">
                <div className="text-4xl font-bold text-white/10 mb-4">01</div>
                <h3 className="text-xl font-medium mb-2 text-white">Register & Generate Keys</h3>
                <p className="text-blue-100/80">
                  Create an account and receive your unique RSA key pair. Your private key stays with you while the public key is stored securely.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -right-10 -bottom-10 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all" />
              <div className="relative">
                <div className="text-4xl font-bold text-white/10 mb-4">02</div>
                <h3 className="text-xl font-medium mb-2 text-white">Upload & Sign Images</h3>
                <p className="text-blue-100/80">
                  Upload your images and sign them with your private key. This creates a unique digital signature that proves authenticity.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden group hover:bg-white/15 transition-all">
              <div className="absolute -left-10 -bottom-10 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-all" />
              <div className="relative">
                <div className="text-4xl font-bold text-white/10 mb-4">03</div>
                <h3 className="text-xl font-medium mb-2 text-white">Verify Anytime</h3>
                <p className="text-blue-100/80">
                  Verify images using the public key to ensure they haven't been tampered with and were uploaded by the authorized user.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-lg p-10 rounded-2xl border border-white/20 shadow-xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="relative text-center">
              <h2 className="text-2xl font-bold mb-4 text-white">Ready to secure your images?</h2>
              <p className="text-blue-100/80 max-w-2xl mx-auto mb-6">
                Join our secure image verification platform today and protect your digital content with advanced cryptographic technology.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/30"
              >
                Get Started Now
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="flex items-center gap-2 text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-300">
                <Cloud className="h-5 w-5 text-blue-300" />
                SecureImage
              </span>
              <p className="text-sm text-blue-100/60 mt-1">Secure Image Verification System</p>
            </div>
            <div className="flex space-x-6">
              <Link href="#features" className="text-sm text-blue-100/60 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#security" className="text-sm text-blue-100/60 hover:text-white transition-colors">
                Security
              </Link>
              <Link href="#how-it-works" className="text-sm text-blue-100/60 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="/login" className="text-sm text-blue-100/60 hover:text-white transition-colors">
                Login
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-blue-100/60 mt-8">
            &copy; {new Date().getFullYear()} SecureImage. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}
