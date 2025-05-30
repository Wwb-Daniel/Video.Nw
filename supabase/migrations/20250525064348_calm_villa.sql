/*
  # Enhanced video recommendations system
  
  1. Changes
    - Add video_categories table for better content organization
    - Add video_hashtags for improved content discovery
    - Add user_preferences to track viewing patterns
    - Add video_similarities for content relationships
  
  2. Security
    - Enable RLS on all new tables
    - Add appropriate security policies
*/

-- Create video categories
CREATE TABLE IF NOT EXISTS video_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create video hashtags
CREATE TABLE IF NOT EXISTS video_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES video_categories(id) ON DELETE CASCADE,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, category_id)
);

-- Create video similarities
CREATE TABLE IF NOT EXISTS video_similarities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id_1 UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  video_id_2 UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(video_id_1, video_id_2)
);

-- Enable RLS
ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_similarities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view categories"
  ON video_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view hashtags"
  ON video_hashtags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view similarities"
  ON video_similarities FOR SELECT
  TO authenticated
  USING (true);

-- Create function to update user preferences based on interactions
CREATE OR REPLACE FUNCTION update_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Update preference weights based on user interactions
  INSERT INTO user_preferences (user_id, category_id, weight)
  SELECT 
    NEW.user_id,
    vc.id,
    COALESCE(
      (SELECT weight * 1.1 FROM user_preferences WHERE user_id = NEW.user_id AND category_id = vc.id),
      1.0
    )
  FROM video_categories vc
  JOIN videos v ON v.id = NEW.video_id
  ON CONFLICT (user_id, category_id)
  DO UPDATE SET 
    weight = EXCLUDED.weight,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for preference updates
CREATE TRIGGER update_preferences_on_like
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences();

CREATE TRIGGER update_preferences_on_view
AFTER INSERT ON video_views
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_hashtags_tag ON video_hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_user_preferences_weight ON user_preferences(weight DESC);
CREATE INDEX IF NOT EXISTS idx_video_similarities_score ON video_similarities(similarity_score DESC);