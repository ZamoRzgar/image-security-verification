-- Create the images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', false, false, 10485760, '{image/png,image/jpeg,image/jpg,image/webp,image/gif}')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Allow users to upload their own images
CREATE POLICY "Users can upload their own images" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own images
CREATE POLICY "Users can view their own images" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own images
CREATE POLICY "Users can update their own images" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own images" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create a policy to allow public access to images if needed
-- Uncomment this if you want to make images publicly accessible
/*
CREATE POLICY "Public can view images" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'images');
*/
