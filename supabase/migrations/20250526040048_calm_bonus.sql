/*
  # Add social features and notifications
  
  1. New Tables
    - `chats` - Private messaging between users
    - `notifications` - System notifications for likes, comments, follows, messages
    - `user_settings` - User preferences and profile settings
  
  2. Changes
    - Add indexes for performance optimization
    - Fix duplicate likes issue
    - Add notification triggers
  
  3. Security
    - Enable RLS on all new tables
    - Add appropriate security policies
*/

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'message')),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reference_id UUID, -- Can be video_id, comment_id, etc.
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  private_account BOOLEAN DEFAULT false,
  donation_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_chats_unread ON chats(receiver_id) WHERE NOT read;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE NOT read;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Chat policies
CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  TO authenticated
  USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can send messages"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Notification policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view any user settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own settings"
  ON user_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'likes' THEN
    IF NEW.content_type = 'video' THEN
      INSERT INTO notifications (user_id, type, actor_id, reference_id)
      SELECT v.user_id, 'like', NEW.user_id, v.id
      FROM videos v
      WHERE v.id = NEW.content_id AND v.user_id != NEW.user_id;
    ELSIF NEW.content_type = 'image_post' THEN
      INSERT INTO notifications (user_id, type, actor_id, reference_id)
      SELECT p.user_id, 'like', NEW.user_id, p.id
      FROM image_posts p
      WHERE p.id = NEW.content_id AND p.user_id != NEW.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    IF NEW.content_type = 'video' THEN
      INSERT INTO notifications (user_id, type, actor_id, reference_id)
      SELECT v.user_id, 'comment', NEW.user_id, v.id
      FROM videos v
      WHERE v.id = NEW.content_id AND v.user_id != NEW.user_id;
    ELSIF NEW.content_type = 'image_post' THEN
      INSERT INTO notifications (user_id, type, actor_id, reference_id)
      SELECT p.user_id, 'comment', NEW.user_id, p.id
      FROM image_posts p
      WHERE p.id = NEW.content_id AND p.user_id != NEW.user_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'follows' THEN
    INSERT INTO notifications (user_id, type, actor_id, reference_id)
    SELECT NEW.following_id, 'follow', NEW.follower_id, NULL
    WHERE NEW.following_id != NEW.follower_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification triggers
CREATE TRIGGER create_like_notification
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION create_notification();

CREATE TRIGGER create_comment_notification
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION create_notification();

CREATE TRIGGER create_follow_notification
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION create_notification();

-- Fix duplicate likes issue
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_video_id_key;
ALTER TABLE likes ADD CONSTRAINT likes_user_id_video_id_key UNIQUE (user_id, video_id);

-- Create function to handle chat notifications
CREATE OR REPLACE FUNCTION create_chat_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, reference_id)
  SELECT NEW.receiver_id, 'message', NEW.sender_id, NEW.id
  WHERE NEW.receiver_id != NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create chat notification trigger
CREATE TRIGGER create_chat_notification
AFTER INSERT ON chats
FOR EACH ROW
EXECUTE FUNCTION create_chat_notification();

-- Create default settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;