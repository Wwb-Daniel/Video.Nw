-- Drop existing likes table constraints and triggers
DROP TRIGGER IF EXISTS update_likes_count_trigger ON likes;
DROP FUNCTION IF EXISTS update_likes_count();

-- Reset likes and comments counters to 0
UPDATE videos SET likes_count = 0, comments_count = 0;
UPDATE image_posts SET likes_count = 0, comments_count = 0;

-- Limpiar likes duplicados antes de agregar la restricción
DELETE FROM likes a USING (
  SELECT MIN(id) as id, user_id, content_type, content_id
  FROM likes
  GROUP BY user_id, content_type, content_id
  HAVING COUNT(*) > 1
) b
WHERE a.user_id = b.user_id 
  AND a.content_type = b.content_type 
  AND a.content_id = b.content_id 
  AND a.id != b.id;

-- Add unique constraint to prevent multiple likes from same user
ALTER TABLE likes
DROP CONSTRAINT IF EXISTS unique_user_content_like;

ALTER TABLE likes
ADD CONSTRAINT unique_user_content_like 
UNIQUE (user_id, content_type, content_id);

-- Recalculate likes count for videos
UPDATE videos v
SET likes_count = (
  SELECT COUNT(*)
  FROM likes l
  WHERE l.content_type = 'video'
  AND l.content_id = v.id
);

-- Recalculate likes count for image posts
UPDATE image_posts p
SET likes_count = (
  SELECT COUNT(*)
  FROM likes l
  WHERE l.content_type = 'image_post'
  AND l.content_id = p.id
);

-- Recalculate comments count for videos
UPDATE videos v
SET comments_count = (
  SELECT COUNT(*)
  FROM comments c
  WHERE c.content_type = 'video'
  AND c.content_id = v.id
);

-- Recalculate comments count for image posts
UPDATE image_posts p
SET comments_count = (
  SELECT COUNT(*)
  FROM comments c
  WHERE c.content_type = 'image_post'
  AND c.content_id = p.id
);

-- Modify likes table
ALTER TABLE likes
DROP CONSTRAINT IF EXISTS likes_user_id_content_id_key,
DROP CONSTRAINT IF EXISTS likes_user_id_video_id_key;

-- Add content_type and content_id columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'likes' AND column_name = 'content_type') THEN
    ALTER TABLE likes ADD COLUMN content_type TEXT CHECK (content_type IN ('video', 'image_post'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'likes' AND column_name = 'content_id') THEN
    ALTER TABLE likes ADD COLUMN content_id UUID;
  END IF;
END $$;

-- Migrate existing likes to use content_id and content_type
UPDATE likes
SET content_id = video_id,
    content_type = 'video'
WHERE content_id IS NULL;

-- Make content_id and content_type NOT NULL after migration
ALTER TABLE likes
ALTER COLUMN content_id SET NOT NULL,
ALTER COLUMN content_type SET NOT NULL;

-- Create new function to update likes count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_type = 'video' THEN
      UPDATE videos 
      SET likes_count = likes_count + 1 
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'image_post' THEN
      UPDATE image_posts 
      SET likes_count = likes_count + 1 
      WHERE id = NEW.content_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_type = 'video' THEN
      UPDATE videos 
      SET likes_count = likes_count - 1 
      WHERE id = OLD.content_id;
    ELSIF OLD.content_type = 'image_post' THEN
      UPDATE image_posts 
      SET likes_count = likes_count - 1 
      WHERE id = OLD.content_id;
    END IF;
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

-- Drop video_id column after migration
ALTER TABLE likes DROP COLUMN IF EXISTS video_id;