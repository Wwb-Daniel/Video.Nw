/*
  # Add user follows and enhance video features
  
  1. New Tables
    - `follows` - Track user follows/followers
    - `video_saves` - Track saved/favorited videos
  
  2. Changes
    - Add last_watched column to video_views
    - Add is_edited column to videos
    - Add indexes for performance optimization
  
  3. Security
    - Enable RLS on new tables
    - Add appropriate security policies
*/

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Create video_saves table
CREATE TABLE IF NOT EXISTS video_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, video_id)
);

-- Add last_watched to video_views
ALTER TABLE video_views
ADD COLUMN IF NOT EXISTS last_watched TIMESTAMPTZ DEFAULT now() NOT NULL;

-- Add is_edited to videos
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false NOT NULL;

-- Add follower count to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0 NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_video_views_last_watched ON video_views(last_watched);
CREATE INDEX IF NOT EXISTS idx_videos_engagement ON videos(likes_count, comments_count, views_count);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_saves ENABLE ROW LEVEL SECURITY;

-- Follows policies
CREATE POLICY "Users can view follows"
  ON follows FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- Video saves policies
CREATE POLICY "Users can view their saved videos"
  ON video_saves FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save videos"
  ON video_saves FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave videos"
  ON video_saves FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for follower counts
CREATE TRIGGER update_follower_counts_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follower_counts();