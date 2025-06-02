-- Drop existing constraints and triggers
DROP TRIGGER IF EXISTS update_likes_count_trigger ON likes;
DROP FUNCTION IF EXISTS update_likes_count();

-- Clean up duplicate likes
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

-- Make video_id NOT NULL for video content type
ALTER TABLE likes
ALTER COLUMN video_id SET NOT NULL;

-- Add check constraint to ensure video_id matches content_id for videos
ALTER TABLE likes
ADD CONSTRAINT check_video_id_content_id
CHECK (
  (content_type = 'video' AND video_id = content_id) OR
  (content_type != 'video')
);

-- Remove DELETE policy to prevent like deletion
DROP POLICY IF EXISTS "Users can delete own likes" ON likes;

-- Update RLS policies to prevent like deletion
CREATE POLICY "Users can insert likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

-- Recreate the likes count function
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
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (only for INSERT now)
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT ON likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- Recalculate likes count for videos
UPDATE videos v
SET likes_count = (
  SELECT COUNT(*)
  FROM likes l
  WHERE l.content_type = 'video'
  AND l.content_id = v.id
); 