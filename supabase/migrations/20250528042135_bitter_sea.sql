/*
  # Rebuild social features and add new systems
  
  1. Changes
    - Drop and recreate likes, comments, and views systems
    - Add VIP subscription system
    - Add virtual currency system
    - Add explore features with hashtags and challenges
    
  2. Security
    - Enable RLS on all new tables
    - Add appropriate security policies
*/

-- Drop existing triggers and tables with CASCADE
DROP TRIGGER IF EXISTS likes_count_trigger ON likes CASCADE;
DROP TRIGGER IF EXISTS comments_count_trigger ON comments CASCADE;
DROP TRIGGER IF EXISTS increment_views_trigger ON video_views CASCADE;
DROP TRIGGER IF EXISTS on_like_change ON likes CASCADE;
DROP FUNCTION IF EXISTS update_video_likes_count() CASCADE;
DROP FUNCTION IF EXISTS update_video_comments_count() CASCADE;
DROP FUNCTION IF EXISTS increment_video_views() CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS video_views CASCADE;

-- Recreate likes system
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT likes_user_video_unique UNIQUE (user_id, video_id)
);

-- Recreate comments system
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Recreate video views system
CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watch_duration INTEGER NOT NULL DEFAULT 0, -- Duration watched in seconds
  watch_percentage FLOAT NOT NULL DEFAULT 0, -- Percentage of video watched
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT video_views_user_video_unique UNIQUE (user_id, video_id)
);

-- Add VIP system
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  benefits JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_method TEXT NOT NULL,
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT user_subscriptions_user_active_unique UNIQUE (user_id, status)
);

-- Add virtual currency system
CREATE TABLE virtual_currency_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  payment_method TEXT,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add explore features
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  use_count INTEGER DEFAULT 0 NOT NULL,
  trending_score FLOAT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE video_hashtags (
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (video_id, hashtag_id)
);

CREATE TABLE video_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create challenges table first since it's referenced by videos
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  music_track TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  prize_pool INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add columns to videos table
ALTER TABLE videos 
  ADD COLUMN IF NOT EXISTS music_track TEXT,
  ADD COLUMN IF NOT EXISTS effects JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES challenges(id);

-- Add columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- Create functions for counting
CREATE OR REPLACE FUNCTION update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET likes_count = likes_count - 1 WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET comments_count = comments_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET comments_count = comments_count - 1 WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_video_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET views_count = views_count + 1 WHERE id = NEW.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_video_likes_count();

CREATE TRIGGER comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_video_comments_count();

CREATE TRIGGER views_count_trigger
AFTER INSERT ON video_views
FOR EACH ROW EXECUTE FUNCTION update_video_views_count();

-- Enable RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view likes"
  ON likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage their likes"
  ON likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view comments"
  ON comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage their comments"
  ON comments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view video views"
  ON video_views FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can record their views"
  ON video_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their views"
  ON video_views FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_hashtags_trending ON hashtags(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);