-- Drop existing triggers and tables
DROP TRIGGER IF EXISTS likes_count_trigger ON likes CASCADE;
DROP TRIGGER IF EXISTS comments_count_trigger ON comments CASCADE;
DROP TRIGGER IF EXISTS views_count_trigger ON video_views CASCADE;
DROP FUNCTION IF EXISTS update_video_likes_count() CASCADE;
DROP FUNCTION IF EXISTS update_video_comments_count() CASCADE;
DROP FUNCTION IF EXISTS update_video_views_count() CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS video_views CASCADE;
DROP TABLE IF EXISTS video_hashtags CASCADE;
DROP TABLE IF EXISTS hashtags CASCADE;

-- Create audio tracks table
CREATE TABLE audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create image posts table
CREATE TABLE image_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT,
  audio_track_id UUID REFERENCES audio_tracks(id) ON DELETE SET NULL,
  likes_count INTEGER DEFAULT 0 NOT NULL,
  comments_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create image attachments table
CREATE TABLE image_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES image_posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create hashtags table
CREATE TABLE hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  use_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create content hashtags table (for both videos and image posts)
CREATE TABLE content_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image_post')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(hashtag_id, content_type, content_id)
);

-- Recreate likes system
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image_post')),
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, content_type, content_id)
);

-- Recreate comments system
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image_post')),
  content_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Recreate video views system with enhanced tracking
CREATE TABLE content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image_post')),
  content_id UUID NOT NULL,
  view_duration INTEGER DEFAULT 0,
  last_viewed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, content_type, content_id)
);

-- Create functions for counting
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_type = 'video' THEN
    UPDATE videos 
    SET likes_count = (
      SELECT COUNT(*) FROM likes 
      WHERE content_type = 'video' AND content_id = NEW.content_id
    )
    WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'image_post' THEN
    UPDATE image_posts 
    SET likes_count = (
      SELECT COUNT(*) FROM likes 
      WHERE content_type = 'image_post' AND content_id = NEW.content_id
    )
    WHERE id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_type = 'video' THEN
    UPDATE videos 
    SET comments_count = (
      SELECT COUNT(*) FROM comments 
      WHERE content_type = 'video' AND content_id = NEW.content_id
    )
    WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'image_post' THEN
    UPDATE image_posts 
    SET comments_count = (
      SELECT COUNT(*) FROM comments 
      WHERE content_type = 'image_post' AND content_id = NEW.content_id
    )
    WHERE id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

CREATE TRIGGER update_comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- Enable RLS
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view audio tracks"
  ON audio_tracks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their audio tracks"
  ON audio_tracks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view image posts"
  ON image_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their image posts"
  ON image_posts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view image attachments"
  ON image_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their image attachments"
  ON image_attachments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM image_posts
    WHERE id = image_attachments.post_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view hashtags"
  ON hashtags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view content hashtags"
  ON content_hashtags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage content hashtags"
  ON content_hashtags FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their likes"
  ON likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their comments"
  ON comments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view content views"
  ON content_views FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their content views"
  ON content_views FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_content_hashtags_content ON content_hashtags(content_type, content_id);
CREATE INDEX idx_likes_content ON likes(content_type, content_id);
CREATE INDEX idx_comments_content ON comments(content_type, content_id);
CREATE INDEX idx_content_views_content ON content_views(content_type, content_id);
CREATE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_audio_tracks_user ON audio_tracks(user_id);
CREATE INDEX idx_image_posts_user ON image_posts(user_id);