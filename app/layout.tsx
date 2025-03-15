import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Secure Image Verification",
  description:
    "Authenticate images using RSA digital signatures and hash functions to ensure they are uploaded by the rightful owner and have not been tampered with.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#0a0c10] text-white`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
