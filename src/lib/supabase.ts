import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with explicit options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export type UserProfile = {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  followers_count: number;
  following_count: number;
}

export type UserSettings = {
  id: string;
  user_id: string;
  private_account: boolean;
  donation_link?: string;
  created_at: string;
  updated_at: string;
}

export type Video = {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_edited: boolean;
  user_profile?: UserProfile;
}

export type Comment = {
  id: string;
  content: string;
  user_id: string;
  video_id: string;
  created_at: string;
  user_profile?: UserProfile;
}

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type VideoSave = {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export type Chat = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
  sender_profile?: UserProfile;
  receiver_profile?: UserProfile;
}

export type Notification = {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  actor_id: string;
  reference_id?: string;
  read: boolean;
  created_at: string;
  actor_profile?: UserProfile;
  video?: Video;
}