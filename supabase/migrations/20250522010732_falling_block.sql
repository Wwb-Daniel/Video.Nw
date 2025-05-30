/*
  # Add view count to videos table
  
  1. Changes
    - Add views_count column to videos table
    - Create function and trigger to increment views
*/

-- Add views_count column
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0 NOT NULL;

-- Create function to increment views
CREATE OR REPLACE FUNCTION increment_video_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos 
  SET views_count = views_count + 1 
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create video_views table
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(video_id, user_id)
);

-- Enable RLS
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own views"
  ON video_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view any video views"
  ON video_views
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger
CREATE TRIGGER increment_views_trigger
AFTER INSERT ON video_views
FOR EACH ROW
EXECUTE FUNCTION increment_video_views();