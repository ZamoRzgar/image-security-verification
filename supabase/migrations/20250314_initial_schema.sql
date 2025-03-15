-- Create a table for user profiles to store public keys
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
  ON public.user_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON public.user_profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create a table for images
CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  public_url TEXT NOT NULL,
  signature TEXT NOT NULL,
  hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on images
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating them
DROP POLICY IF EXISTS "Users can view their own images" ON public.images;
DROP POLICY IF EXISTS "Users can insert their own images" ON public.images;
DROP POLICY IF EXISTS "Users can update their own images" ON public.images;
DROP POLICY IF EXISTS "Users can delete their own images" ON public.images;

-- Create policies for images
CREATE POLICY "Users can view their own images" 
  ON public.images 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images" 
  ON public.images 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images" 
  ON public.images 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" 
  ON public.images 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_public_key TEXT;
BEGIN
  -- Generate a default RSA public key for new users
  -- This is a placeholder that will be replaced with a real key later
  -- The format follows a standard RSA public key in base64 format
  default_public_key := 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu5sVBczU9qQCQzK5qvZn+QS5Hd/2FRK6Z+Yv9jSVEDIr0LrLXhCmGnmwMYEsuA9QA69TLLmS9TBxZ0qhH7gV1xNU+Jl80VYSQkxzJJJIKw0WJ0H5xzCEMJkCUUVEJCMvmLW8/yvMLKmxhwZZwIm2T+rhyxfYQGtPpvFAYiJZZrdYS1XyaGEZQUCV/CWH3r2yWJQE5+NjJc5wkUjkE9mh4GnlGVSRbMZXJZ8xUm7yYdN0UOvSlYnY4ilPTKpRJDq5Tww0TnGNyRpZdKO5zU7J9UhyTnwbJuAQW9XyD4Qo+XK+aLaGxgNKG5bVEd8pHcpuYRF3he8lvQQGXBQGGvvDZQIDAQAB';
  
  -- Create a new user profile with the default public key
  INSERT INTO public.user_profiles (user_id, public_key)
  VALUES (NEW.id, default_public_key);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger before creating it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create index for faster image hash lookups
CREATE INDEX IF NOT EXISTS images_hash_idx ON public.images (hash);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS images_user_id_idx ON public.images (user_id);