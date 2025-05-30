/*
  # Storage policies for videos bucket

  1. Security
    - Enable storage policies for videos bucket
    - Add policies for:
      - Authenticated users can upload their own videos
      - Anyone can view videos
      - Users can delete their own videos
*/

-- Create storage policies for the videos bucket
BEGIN;

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