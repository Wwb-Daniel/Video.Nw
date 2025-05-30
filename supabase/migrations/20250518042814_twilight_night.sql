/*
  # Verify and update storage bucket policies

  1. Changes
    - Ensure videos bucket exists
    - Set up storage policies for video uploads and access
    - Enable public access for videos bucket
*/

-- Create the videos bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('videos', 'videos', true)
  ON CONFLICT (id) DO UPDATE
  SET public = true;
END $$;

-- Update storage policies
BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;

-- Allow authenticated users to upload videos
CREATE POLICY "Users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

-- Allow public access to view videos
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Allow users to delete their own videos
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (auth.uid())::text = SPLIT_PART(name, '/', 1)
);

COMMIT;