-- Drop existing likes table constraints and triggers
DROP TRIGGER IF EXISTS update_likes_count_trigger ON likes;
DROP FUNCTION IF EXISTS update_likes_count();

-- Modify likes table
ALTER TABLE likes
DROP CONSTRAINT IF EXISTS likes_user_id_content_id_key,
DROP CONSTRAINT IF EXISTS likes_user_id_video_id_key;

-- Add video_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'likes' AND column_name = 'video_id') THEN
    ALTER TABLE likes ADD COLUMN video_id UUID REFERENCES videos(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create new unique constraint
ALTER TABLE likes
ADD CONSTRAINT likes_user_id_video_id_key UNIQUE (user_id, video_id);

-- Create new function to update likes count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- Update RLS policies
DROP POLICY IF EXISTS "Public can view likes" ON likes;
DROP POLICY IF EXISTS "Users can manage their likes" ON likes;

CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their likes"
  ON likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);