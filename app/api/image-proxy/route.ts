import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with server-side credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Get path from the URL
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    
    if (!path) {
      return new NextResponse('Path parameter is required', { status: 400 });
    }
    
    // Decode the path
    const decodedPath = decodeURIComponent(path);
    
    // Use Supabase server-side client to download the file
    const { data, error } = await supabase.storage
      .from('images')
      .download(decodedPath);
    
    if (error || !data) {
      console.error('Error fetching image from storage:', error);
      return new NextResponse('Failed to fetch image', { status: 404 });
    }
    
    // Get file type from path
    const fileExtension = decodedPath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExtension === 'png') {
      contentType = 'image/png';
    } else if (fileExtension === 'gif') {
      contentType = 'image/gif';
    } else if (fileExtension === 'webp') {
      contentType = 'image/webp';
    }
    
    // Convert the blob to an array buffer
    const arrayBuffer = await data.arrayBuffer();
    
    // Return the image with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('Error in image proxy:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
