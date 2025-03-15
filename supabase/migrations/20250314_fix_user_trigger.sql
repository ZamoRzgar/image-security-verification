-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create an improved function to handle user creation with public key
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, public_key)
  VALUES (
    NEW.id, 
    COALESCE(
      (NEW.raw_app_meta_data->>'public_key')::TEXT, 
      (NEW.raw_user_meta_data->>'public_key')::TEXT,
      ''
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a policy to allow the service role to manage all profiles
CREATE POLICY "Service role can manage all profiles" 
  ON public.user_profiles 
  USING (true) 
  WITH CHECK (true);
