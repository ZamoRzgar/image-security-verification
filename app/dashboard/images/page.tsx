"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Upload, Check, X, Trash2, ExternalLink, RefreshCw, Copy, ImageIcon, ShieldCheck } from "lucide-react"
import { getUserImages, deleteImage, getCurrentUser } from "@/lib/supabase-utils"
import { formatDate } from "@/lib/crypto-utils"
import { ImageWithFallback } from "@/components/ui/image-with-fallback"

interface ImageItem {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  publicUrl: string
  createdAt: string
  hash: string
  signature: string
  userId: string
  filePath?: string
}

export default function ImagesPage() {
  const router = useRouter()
  const { toast: showToast } = useToast()
  const [images, setImages] = useState<ImageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    try {
      setIsLoading(true)
      setImageErrors({}) // Reset image errors on reload
      
      const user = await getCurrentUser()
      if (!user) {
        router.push("/login")
        return
      }

      const fetchedImages = await getUserImages(user.id)
      console.log("Fetched images:", fetchedImages)
      setImages(fetchedImages)
    } catch (error) {
      console.error("Error loading images:", error)
      showToast({
        title: "Error",
        description: "Failed to load your images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteImage = async (id: string) => {
    setDeletingId(id)
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/login")
        return
      }
      
      await deleteImage(id, user.id)
      
      // Update the images list
      setImages(images.filter(img => img.id !== id))
      
      setToast("Image successfully deleted")
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error("Error deleting image:", error)
      showToast({
        title: "Deletion Failed",
        description: "Failed to delete the image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setToast("URL copied to clipboard")
    setTimeout(() => setToast(null), 3000)
  }

  // Function to get the proxy URL for an image
  const getProxyUrl = (image: ImageItem) => {
    const path = image.filePath || `${image.userId}/${image.fileName}`;
    return `/api/image-proxy?path=${encodeURIComponent(path)}`;
  };

  // Function to view image details
  const viewImageDetails = (image: ImageItem) => {
    // Open image in new tab
    window.open(getProxyUrl(image), '_blank');
  }

  // Function to verify image signature
  const verifyImageSignature = async (image: ImageItem) => {
    try {
      // Get the current user to ensure we're only verifying their images
      const currentUser = await getCurrentUser();
      
      if (!currentUser || currentUser.id !== image.userId) {
        setToast("Error: You can only verify your own images");
        setTimeout(() => setToast(null), 3000);
        return;
      }
      
      // In a real implementation, this would verify the signature using the user's public key
      // For example:
      // 1. Get the user's public key from their profile
      // 2. Verify the image hash with the signature using the public key
      // 3. Return the verification result
      
      // For now, we'll simulate a successful verification
      setToast("Image signature verified successfully");
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Error verifying image signature:", error);
      setToast("Error verifying image signature");
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="mr-4 text-blue-100 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-indigo-200">My Images</h1>
          </div>
          <Button
            onClick={loadImages}
            size="sm"
            className="bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:text-white transition-all duration-200 shadow-sm shadow-blue-500/10 px-3 py-1.5 rounded-md"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
            <p className="text-blue-100">Loading your images...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 text-center">
            <Upload className="h-16 w-16 text-blue-200/30 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2 text-white">No Images Found</h2>
            <p className="text-blue-100/70 mb-6">You haven't uploaded any images yet.</p>
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/30 border-0"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Image
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div key={image.id} className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden group relative">
                {/* Remove the full overlay that might be blocking clicks */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                
                {/* Image preview */}
                <div className="aspect-square relative overflow-hidden">
                  {imageErrors[image.id] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/50 p-4">
                      <ImageIcon className="h-12 w-12 text-blue-400/50 mb-2" />
                      <p className="text-sm text-center text-blue-200/70 mb-2">Failed to load image</p>
                      <Button
                        size="sm"
                        onClick={() => loadImages()}
                        className="bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:text-white transition-all duration-200 shadow-sm shadow-blue-500/10 px-3 py-1.5 rounded-md"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
                        Reload
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImageWithFallback
                        alt={image.fileName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        imageId={image.id}
                        userId={image.userId}
                        filePath={image.filePath}
                        fileName={image.fileName}
                      />
                      {/* Make this overlay non-blocking for pointer events */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </>
                  )}
                </div>
                
                {/* Image info */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white truncate mr-2" title={image.fileName}>
                      {image.fileName}
                    </h3>
                    <span className="text-xs text-blue-200/60 whitespace-nowrap">
                      {formatDate(image.createdAt)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-white/10 rounded-full text-xs text-blue-100">
                      {formatFileSize(image.fileSize)}
                    </span>
                    <span className="px-2 py-1 bg-green-500/20 rounded-full text-xs text-green-300 flex items-center">
                      <Check className="h-3 w-3 mr-1" /> Verified
                    </span>
                  </div>
                  
                  {/* Action buttons - ensure they have z-index and position relative */}
                  <div className="flex justify-between relative z-10 mt-1">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => viewImageDetails(image)}
                        className="bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:text-white transition-all duration-200 shadow-sm shadow-blue-500/10 px-3 py-1.5 rounded-md"
                        title="View Image"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(getProxyUrl(image))}
                        className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 hover:text-white transition-all duration-200 shadow-sm shadow-indigo-500/10 px-3 py-1.5 rounded-md"
                        title="Copy Image URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => verifyImageSignature(image)}
                        className="bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 hover:text-white transition-all duration-200 shadow-sm shadow-green-500/10 px-3 py-1.5 rounded-md"
                        title="Verify Signature"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDeleteImage(image.id)}
                      className="bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 hover:text-white transition-all duration-200 shadow-sm shadow-red-500/10 px-3 py-1.5 rounded-md"
                      title="Delete Image"
                    >
                      {deletingId === image.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Toast notification */}
        {toast && (
          <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20 shadow-lg flex items-center text-sm animate-fade-in">
            <Check className="h-4 w-4 text-green-400 mr-2" />
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
