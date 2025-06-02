-- Create a function to handle video views
CREATE OR REPLACE FUNCTION handle_video_view()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the view record
    INSERT INTO video_views (user_id, video_id)
    VALUES (NEW.user_id, NEW.video_id)
    ON CONFLICT (user_id, video_id) DO NOTHING;

    -- Update the views count in the videos table
    UPDATE videos
    SET views_count = (
        SELECT COUNT(*)
        FROM video_views
        WHERE video_id = NEW.video_id
    )
    WHERE id = NEW.video_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically handle video views
DROP TRIGGER IF EXISTS video_view_trigger ON video_views;
CREATE TRIGGER video_view_trigger
    AFTER INSERT ON video_views
    FOR EACH ROW
    EXECUTE FUNCTION handle_video_view();

-- Add a unique constraint to video_views to prevent duplicate views
ALTER TABLE video_views
DROP CONSTRAINT IF EXISTS unique_video_view;

ALTER TABLE video_views
ADD CONSTRAINT unique_video_view UNIQUE (user_id, video_id);

-- Create an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_video_views_user_video 
ON video_views (user_id, video_id);

-- Create a function to get unseen videos for a user
CREATE OR REPLACE FUNCTION get_unseen_videos(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 5,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ,
    likes_count INTEGER,
    comments_count INTEGER,
    views_count INTEGER,
    is_edited BOOLEAN,
    user_profile JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.*,
        jsonb_build_object(
            'id', p.id,
            'username', p.username,
            'avatar_url', p.avatar_url,
            'is_vip', p.is_vip
        ) as user_profile
    FROM videos v
    LEFT JOIN profiles p ON v.user_id = p.id
    WHERE v.id NOT IN (
        SELECT video_id 
        FROM video_views 
        WHERE user_id = p_user_id
    )
    AND (
        v.id IN (
            SELECT content_id 
            FROM likes 
            WHERE user_id = p_user_id 
            AND content_type = 'video'
        )
        OR v.id IN (
            SELECT video_id 
            FROM video_saves 
            WHERE user_id = p_user_id
        )
        OR v.id NOT IN (
            SELECT video_id 
            FROM video_views 
            WHERE user_id = p_user_id
        )
    )
    ORDER BY 
        v.likes_count DESC,
        v.comments_count DESC,
        v.views_count DESC,
        v.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql; 