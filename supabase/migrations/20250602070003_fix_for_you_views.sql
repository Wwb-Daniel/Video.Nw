-- Elimina vistas duplicadas en el feed 'foryou', dejando solo la más reciente para cada usuario y video
DELETE FROM content_views a
USING (
    SELECT user_id, content_id, MAX(created_at) as max_created_at
    FROM content_views
    WHERE content_type = 'video'
    GROUP BY user_id, content_id
) b
WHERE a.user_id = b.user_id
  AND a.content_id = b.content_id
  AND a.content_type = 'video'
  AND a.created_at < b.max_created_at;

-- Crea un índice único para evitar duplicados en el futuro
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_views_unique
ON content_views (user_id, content_type, content_id);

-- Sincroniza el contador de vistas para todos los videos existentes
UPDATE videos
SET views_count = (
    SELECT COUNT(*) FROM content_views
    WHERE content_type = 'video' AND content_id = videos.id
); 