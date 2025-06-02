-- Elimina el trigger y función actuales
DROP TRIGGER IF EXISTS video_view_trigger ON content_views;
DROP FUNCTION IF EXISTS sync_video_views_count();

-- Restaura la función y trigger originales
CREATE OR REPLACE FUNCTION handle_video_view()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos
    SET views_count = views_count + 1
    WHERE id = NEW.content_id
    AND NEW.content_type = 'video';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_view_trigger
    AFTER INSERT ON content_views
    FOR EACH ROW
    EXECUTE FUNCTION handle_video_view();

-- Elimina el índice único para permitir duplicados
DROP INDEX IF EXISTS idx_content_views_unique; 