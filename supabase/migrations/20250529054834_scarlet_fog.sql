-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS update_likes_count_trigger ON likes;
DROP TRIGGER IF EXISTS update_comments_count_trigger ON comments;
DROP FUNCTION IF EXISTS update_likes_count();
DROP FUNCTION IF EXISTS update_comments_count();

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

-- Create new function to update comments count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_type = 'video' THEN
      UPDATE videos 
      SET comments_count = comments_count + 1 
      WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'image_post' THEN
      UPDATE image_posts 
      SET comments_count = comments_count + 1 
      WHERE id = NEW.content_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_type = 'video' THEN
      UPDATE videos 
      SET comments_count = comments_count - 1 
      WHERE id = OLD.content_id;
    ELSIF OLD.content_type = 'image_post' THEN
      UPDATE image_posts 
      SET comments_count = comments_count - 1 
      WHERE id = OLD.content_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create new triggers
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

CREATE TRIGGER update_comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comments_count();