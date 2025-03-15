import Link from "next/link"
import { ArrowRight, Shield, Lock, FileCheck } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-medium">
              SecureImage
            </Link>
            <nav className="hidden md:flex ml-10 space-x-8">
              <Link href="#features" className="text-sm text-gray-300 hover:text-white">
                Features
              </Link>
              <Link href="#security" className="text-sm text-gray-300 hover:text-white">
                Security
              </Link>
              <Link href="#how-it-works" className="text-sm text-gray-300 hover:text-white">
                How It Works
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white">
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center px-4 py-2 text-sm bg-white text-black rounded-md hover:bg-gray-200"
            >
              <span>Register</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="grid md:grid-cols-2 gap-12 py-20">
          <div className="flex flex-col justify-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-medium leading-tight">
              Secure Image
              <br />
              Verification
            </h1>
            <p className="mt-4 text-xl text-gray-400">
              Authenticate and verify the integrity of your images using RSA digital signatures
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center px-6 py-3 bg-white text-black rounded-md hover:bg-gray-200"
              >
                Get Started
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center px-6 py-3 border border-gray-700 rounded-md hover:bg-gray-800"
              >
                <span>Learn More</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="bg-[#0f1218] p-8 rounded-lg">
              <div className="flex items-center mb-4">
                <div className="w-5 h-5 bg-white/10 rounded-sm flex items-center justify-center mr-3">
                  <Shield className="h-3 w-3" />
                </div>
                <span className="text-sm text-gray-400">Cryptographic Security</span>
              </div>
              <h2 className="text-xl font-medium mb-4">Protect your images with RSA encryption</h2>
              <p className="text-gray-400">
                Ensure your images remain authentic and unaltered with our advanced cryptographic verification system.
              </p>
            </div>
          </div>
        </main>

        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Key Features</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our secure image verification system provides powerful tools to protect and verify your digital content.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#0f1218] p-6 rounded-lg">
              <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium mb-2">RSA Key Generation</h3>
              <p className="text-gray-400">
                Generate unique RSA key pairs for secure signing and verification of your images.
              </p>
            </div>

            <div className="bg-[#0f1218] p-6 rounded-lg">
              <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium mb-2">Image Verification</h3>
              <p className="text-gray-400">
                Verify the authenticity and integrity of images with cryptographic signatures.
              </p>
            </div>

            <div className="bg-[#0f1218] p-6 rounded-lg">
              <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-medium mb-2">Tamper Protection</h3>
              <p className="text-gray-400">
                Detect any unauthorized modifications to your images with hash-based integrity checks.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our system uses RSA digital signatures and hash functions to ensure image authenticity and integrity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#0f1218] p-6 rounded-lg">
              <div className="text-2xl font-bold text-white/20 mb-4">01</div>
              <h3 className="text-xl font-medium mb-2">Register & Generate Keys</h3>
              <p className="text-gray-400">
                Create an account and receive your unique RSA key pair. Your private key stays with you while the public key is stored securely.
              </p>
            </div>

            <div className="bg-[#0f1218] p-6 rounded-lg">
              <div className="text-2xl font-bold text-white/20 mb-4">02</div>
              <h3 className="text-xl font-medium mb-2">Upload & Sign Images</h3>
              <p className="text-gray-400">
                Upload your images and sign them with your private key. This creates a unique digital signature that proves authenticity.
              </p>
            </div>

            <div className="bg-[#0f1218] p-6 rounded-lg">
              <div className="text-2xl font-bold text-white/20 mb-4">03</div>
              <h3 className="text-xl font-medium mb-2">Verify Anytime</h3>
              <p className="text-gray-400">
                Verify images using the public key to ensure they haven't been tampered with and were uploaded by the authorized user.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="bg-[#0f1218] p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to secure your images?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-6">
              Join our secure image verification platform today and protect your digital content with advanced cryptographic technology.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center px-6 py-3 bg-white text-black rounded-md hover:bg-gray-200"
            >
              Get Started Now
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-medium">SecureImage</span>
              <p className="text-sm text-gray-400 mt-1">Secure Image Verification System</p>
            </div>
            <div className="flex space-x-6">
              <Link href="#features" className="text-sm text-gray-400 hover:text-white">
                Features
              </Link>
              <Link href="#security" className="text-sm text-gray-400 hover:text-white">
                Security
              </Link>
              <Link href="#how-it-works" className="text-sm text-gray-400 hover:text-white">
                How It Works
              </Link>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white">
                Login
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500 mt-8">
            &copy; {new Date().getFullYear()} SecureImage. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}
