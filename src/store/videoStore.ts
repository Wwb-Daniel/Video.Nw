import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Video } from '../lib/supabase';

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  feedType: 'all' | 'following' | 'foryou' | 'explore';
  fetchVideos: (page?: number) => Promise<void>;
  uploadVideo: (file: File, title: string, description: string, options?: {
    musicTrack?: string;
    effects?: any[];
    challengeId?: string;
    hashtags?: string[];
    mentions?: string[];
  }) => Promise<void>;
  updateVideo: (videoId: string, title: string, description: string) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  likeVideo: (videoId: string) => Promise<void>;
  saveVideo: (videoId: string) => Promise<void>;
  setCurrentVideo: (video: Video | null) => void;
  setFeedType: (type: 'all' | 'following' | 'foryou' | 'explore') => void;
}

const PAGE_SIZE = 5;

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
};

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  currentVideo: null,
  loading: false,
  error: null,
  hasMore: true,
  feedType: 'all',

  setFeedType: (type) => {
    set({ feedType: type });
    get().fetchVideos(0);
  },

  fetchVideos: async (page = 0) => {
    const { videos, feedType } = get();
    set({ loading: true, error: null });
    
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      let query = supabase
        .from('videos')
        .select(`
          *,
          likes_count,
          comments_count,
          views_count,
          user_profile:profiles!user_id(
            id, 
            username, 
            avatar_url, 
            is_vip
          ),
          video_hashtags(
            hashtag:hashtags(
              id,
              name
            )
          ),
          challenge:challenges(
            id,
            name,
            description
          )
        `);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's viewed videos
      const { data: viewedVideos } = await supabase
        .from('video_views')
        .select('video_id')
        .eq('user_id', user.id);

      const viewedIds = viewedVideos?.map(v => v.video_id) || [];

      // Get user's liked videos
      const { data: likedVideos } = await supabase
        .from('likes')
        .select('video_id')
        .eq('user_id', user.id);

      const likedIds = likedVideos?.map(v => v.video_id) || [];

      // Get user's saved videos
      const { data: savedVideos } = await supabase
        .from('video_saves')
        .select('video_id')
        .eq('user_id', user.id);

      const savedIds = savedVideos?.map(v => v.video_id) || [];

      switch (feedType) {
        case 'following':
          const { data: followingIds } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (followingIds && followingIds.length > 0) {
            query = query.in('user_id', followingIds.map(f => f.following_id));
          } else {
            set({ videos: [], hasMore: false, loading: false });
            return;
          }
          break;

        case 'foryou':
          // Exclude viewed videos unless liked or saved
          const excludeIds = viewedIds.filter(id => 
            !likedIds.includes(id) && !savedIds.includes(id)
          );
          
          if (excludeIds.length > 0) {
            query = query.not('id', 'in', `(${excludeIds.join(',')})`);
          }

          // Order by engagement score
          query = query.order('likes_count', { ascending: false })
            .order('comments_count', { ascending: false })
            .order('views_count', { ascending: false });
          break;

        case 'explore':
          // Include trending hashtags and challenges
          query = query
            .order('created_at', { ascending: false })
            .not('challenge_id', 'is', null);
          break;

        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.range(from, to);
        
      if (error) throw error;
      
      const newVideos = page === 0 ? data : [...videos, ...data];
      set({ 
        videos: newVideos,
        hasMore: data.length === PAGE_SIZE,
      });
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error fetching videos:', error);
    } finally {
      set({ loading: false });
    }
  },

  uploadVideo: async (file, title, description, options = {}) => {
    set({ loading: true, error: null });
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');
      
      const sanitizedFileName = sanitizeFileName(file.name);
      const fileName = `${user.id}/${Date.now()}-${sanitizedFileName}`;
      
      const { data: videoData, error: videoError } = await supabase
        .storage
        .from('videos')
        .upload(fileName, file);
        
      if (videoError) throw videoError;
      
      const { data: publicUrlData } = await supabase
        .storage
        .from('videos')
        .getPublicUrl(fileName);

      // Insert video
      const { data: video, error: insertError } = await supabase
        .from('videos')
        .insert({
          title,
          description,
          video_url: publicUrlData.publicUrl,
          user_id: user.id,
          music_track: options.musicTrack,
          effects: options.effects,
          challenge_id: options.challengeId
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Handle hashtags
      if (options.hashtags?.length) {
        for (const tag of options.hashtags) {
          // Insert or get hashtag
          const { data: hashtag } = await supabase
            .from('hashtags')
            .select()
            .eq('name', tag.toLowerCase())
            .single();

          const hashtagId = hashtag?.id || (
            await supabase
              .from('hashtags')
              .insert({ name: tag.toLowerCase() })
              .select()
              .single()
          ).data?.id;

          if (hashtagId) {
            await supabase
              .from('video_hashtags')
              .insert({
                video_id: video.id,
                hashtag_id: hashtagId
              });
          }
        }
      }

      // Handle mentions
      if (options.mentions?.length) {
        for (const userId of options.mentions) {
          await supabase
            .from('video_mentions')
            .insert({
              video_id: video.id,
              mentioned_user_id: userId
            });
        }
      }
      
      await get().fetchVideos(0);
    } catch (error: any) {
      set({ error: error.message });
      console.error('Error uploading video:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateVideo: async (videoId, title, description) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          title,
          description,
          is_edited: true,
        })
        .eq('id', videoId);

      if (error) throw error;
      await get().fetchVideos(0);
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  deleteVideo: async (videoId) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;
      await get().fetchVideos(0);
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  likeVideo: async (videoId) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');
      
      const { data: existingLike } = await supabase
        .from('likes')
        .select()
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
        
      if (existingLike) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
      }
      
      await get().fetchVideos(0);
    } catch (error) {
      console.error('Error liking video:', error);
    }
  },

  saveVideo: async (videoId) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');
      
      const { data: existingSave } = await supabase
        .from('video_saves')
        .select()
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();
        
      if (existingSave) {
        await supabase
          .from('video_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('video_saves')
          .insert({
            user_id: user.id,
            video_id: videoId,
          });
      }
    } catch (error) {
      console.error('Error saving video:', error);
    }
  },

  setCurrentVideo: (video) => set({ currentVideo: video }),
}));