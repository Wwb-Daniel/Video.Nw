-- Elimina el trigger y función anterior si existen
DROP TRIGGER IF EXISTS video_view_trigger ON content_views;
DROP FUNCTION IF EXISTS handle_video_view();

-- Nueva función que recalcula el contador de vistas
CREATE OR REPLACE FUNCTION sync_video_views_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos
    SET views_count = (
        SELECT COUNT(*) FROM content_views
        WHERE content_type = 'video' AND content_id = NEW.content_id
    )
    WHERE id = NEW.content_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nuevo trigger que se ejecuta después de INSERT, DELETE o UPDATE
CREATE TRIGGER video_view_trigger
    AFTER INSERT OR DELETE OR UPDATE ON content_views
    FOR EACH ROW
    EXECUTE FUNCTION sync_video_views_count(); 