-- Eliminar la tabla content_views si existe
DROP TABLE IF EXISTS content_views;

-- Crear la tabla video_views original
CREATE TABLE IF NOT EXISTS video_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, video_id)
);

-- Habilitar RLS
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Crear políticas para video_views
CREATE POLICY "Users can view any video views"
    ON video_views FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own video views"
    ON video_views FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Crear función para actualizar el contador de vistas
CREATE OR REPLACE FUNCTION update_video_views_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos
    SET views_count = views_count + 1
    WHERE id = NEW.video_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar el contador
DROP TRIGGER IF EXISTS video_view_trigger ON video_views;
CREATE TRIGGER video_view_trigger
    AFTER INSERT ON video_views
    FOR EACH ROW
    EXECUTE FUNCTION update_video_views_count();

-- Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON video_views(user_id); 