import { useState, useEffect } from 'react';
import { ImageIcon, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  imageId?: string;
  userId?: string;
  filePath?: string;
  fileName?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  imageId,
  userId,
  filePath,
  fileName
}: ImageWithFallbackProps) {
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Generate the image URL using the server-side proxy
  const getProxyUrl = () => {
    // Prefer filePath if available, otherwise construct from userId and fileName
    const path = filePath || (userId && fileName ? `${userId}/${fileName}` : '');
    if (!path) return '';
    
    return `/api/image-proxy?path=${encodeURIComponent(path)}&t=${Date.now()}`;
  };
  
  const [imgSrc, setImgSrc] = useState<string>(getProxyUrl());
  
  // Update image source when props change
  useEffect(() => {
    setImgSrc(getProxyUrl());
    setError(false);
  }, [filePath, userId, fileName]);
  
  const handleError = () => {
    console.error(`Failed to load image: ${imgSrc}`);
    setError(true);
  };

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    // Generate a fresh URL with a new timestamp
    setImgSrc(getProxyUrl());
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-slate-800/50 p-4 ${className}`}>
        <ImageIcon className="h-12 w-12 text-blue-400/50 mb-2" />
        <p className="text-sm text-center text-blue-200/70 mb-2">Failed to load image</p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="border-white/20 text-blue-100 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
      style={{ opacity: loading ? 0.7 : 1 }}
      onLoad={() => setLoading(false)}
    />
  );
}
