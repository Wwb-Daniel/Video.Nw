-- Sincroniza el contador de vistas para todos los videos existentes
UPDATE videos
SET views_count = (
    SELECT COUNT(*) FROM content_views
    WHERE content_type = 'video' AND content_id = videos.id
); 