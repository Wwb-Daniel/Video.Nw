/*
  # Fix video views RLS policies
  
  1. Changes
    - Update RLS policies for video_views table
    - Ensure authenticated users can record their own views
  
  2. Security
    - Enable RLS for video_views table
    - Add policies for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own views" ON video_views;
DROP POLICY IF EXISTS "Users can view any video views" ON video_views;

-- Create new policies
CREATE POLICY "Users can record their own views"
  ON video_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own views"
  ON video_views
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view video views"
  ON video_views
  FOR SELECT
  TO authenticated
  USING (true);