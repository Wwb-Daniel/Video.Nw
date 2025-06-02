import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { UserProfile, Follow } from '../lib/supabase';

interface UserState {
  following: Follow[];
  loading: boolean;
  error: string | null;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  isFollowing: (userId: string) => Promise<boolean>;
  fetchFollowing: () => Promise<void>;
  getFollowersCount: (userId: string) => Promise<number>;
  getFollowingCount: (userId: string) => Promise<number>;
}

export const useUserStore = create<UserState>((set, get) => ({
  following: [],
  loading: false,
  error: null,

  followUser: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      if (error) throw error;
      await get().fetchFollowing();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  unfollowUser: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) throw error;
      await get().fetchFollowing();
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  isFollowing: async (userId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .from('follows')
        .select()
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  },

  fetchFollowing: async () => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id);

      if (error) throw error;
      set({ following: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  getFollowersCount: async (userId) => {
    try {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);
      
      return count || 0;
    } catch (error) {
      console.error('Error getting followers count:', error);
      return 0;
    }
  },

  getFollowingCount: async (userId) => {
    try {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);
      
      return count || 0;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  },
}));