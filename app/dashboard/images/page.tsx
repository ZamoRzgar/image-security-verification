"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Upload, Check, X, Trash2, ExternalLink } from "lucide-react"
import { getUserImages, deleteImage, getCurrentUser } from "@/lib/supabase-utils"
import { formatDate } from "@/lib/crypto-utils"

interface ImageItem {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  publicUrl: string
  createdAt: string
  hash: string
}

export default function ImagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [images, setImages] = useState<ImageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadImages()
  }, [])

  const loadImages = async () => {
    setIsLoading(true)
    try {
      const user = await getCurrentUser()
      
      if (!user) {
        router.push("/login")
        return
      }
      
      const userImages = await getUserImages(user.id)
      setImages(userImages)
    } catch (error) {
      console.error("Error loading images:", error)
      toast({
        title: "Error",
        description: "Failed to load your images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteImage = async (id: string) => {
    try {
      setDeletingId(id)
      const user = await getCurrentUser()
      
      if (!user) {
        router.push("/login")
        return
      }
      
      await deleteImage(id, user.id)
      
      // Update the images list
      setImages(images.filter(img => img.id !== id))
      
      toast({
        title: "Image Deleted",
        description: "The image has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Secure Images</h1>
        </div>
        <Button
          onClick={() => router.push("/dashboard/upload")}
          className="bg-white text-black hover:bg-gray-200"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload New Image
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : images.length === 0 ? (
        <div className="bg-[#0f1218] rounded-lg p-12 text-center">
          <div className="flex flex-col items-center max-w-md mx-auto">
            <Upload className="h-16 w-16 text-gray-500 mb-4" />
            <h2 className="text-xl font-medium mb-2">No Images Yet</h2>
            <p className="text-gray-400 mb-6">
              You haven&apos;t uploaded any secure images yet. Start by uploading your first image.
            </p>
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="bg-white text-black hover:bg-gray-200"
            >
              Upload Your First Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {images.map((image) => (
            <div key={image.id} className="bg-[#0f1218] rounded-lg overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-48 flex-shrink-0">
                  <img
                    src={image.publicUrl}
                    alt={image.fileName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow p-6">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-medium mb-2 truncate">{image.fileName}</h2>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 border-gray-700 hover:bg-gray-800"
                        onClick={() => window.open(image.publicUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 border-red-800 hover:bg-red-900/30 text-red-500"
                        onClick={() => handleDeleteImage(image.id)}
                        disabled={deletingId === image.id}
                      >
                        {deletingId === image.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-red-500 rounded-full border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-500">Size</p>
                      <p className="text-sm">{formatFileSize(image.fileSize)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm">{image.fileType.split('/')[1].toUpperCase()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Uploaded</p>
                      <p className="text-sm">{formatDate(image.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <p className="text-sm">Verified</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">Hash</p>
                    <p className="text-xs font-mono text-gray-400 truncate">{image.hash || "Not available"}</p>
                  </div>
                  
                  <div className="flex mt-4 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-gray-700"
                      onClick={() => router.push(`/dashboard/verify?image=${image.id}`)}
                    >
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-gray-700"
                      onClick={() => {
                        navigator.clipboard.writeText(image.publicUrl)
                        toast({
                          title: "URL Copied",
                          description: "Image URL has been copied to clipboard",
                        })
                      }}
                    >
                      Copy URL
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
