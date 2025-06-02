-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS video_view_trigger ON video_views;
DROP TRIGGER IF EXISTS views_count_trigger ON video_views;
DROP FUNCTION IF EXISTS handle_video_view();
DROP FUNCTION IF EXISTS update_video_views_count();

-- Create new function to handle video views
CREATE OR REPLACE FUNCTION handle_video_view()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the views count in the videos table
    UPDATE videos
    SET views_count = views_count + 1
    WHERE id = NEW.content_id
    AND NEW.content_type = 'video';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER video_view_trigger
    AFTER INSERT ON content_views
    FOR EACH ROW
    EXECUTE FUNCTION handle_video_view();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view content views" ON content_views;
DROP POLICY IF EXISTS "Users can manage their content views" ON content_views;

-- Create new policies
CREATE POLICY "Users can view content views"
    ON content_views FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own views"
    ON content_views FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own views"
    ON content_views FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_content_views_user_content 
ON content_views (user_id, content_type, content_id); 