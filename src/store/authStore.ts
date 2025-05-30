import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('refresh_token_not_found')) {
          await supabase.auth.signOut();
          set({ user: null });
          return;
        }
        throw error;
      }

      const { session } = data;
      set({ user: session?.user || null });
      
      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
          // Create profile for OAuth users if it doesn't exist
          if (session?.user) {
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select()
              .eq('id', session.user.id)
              .single();

            if (!existingProfile) {
              const username = session.user.email?.split('@')[0] || `user_${Math.random().toString(36).slice(2, 7)}`;
              
              await supabase
                .from('profiles')
                .insert({
                  id: session.user.id,
                  username,
                  avatar_url: session.user.user_metadata.avatar_url || '',
                  bio: '',
                });

              await supabase
                .from('user_settings')
                .insert({
                  user_id: session.user.id,
                  private_account: false,
                });
            }
          }
        }
        set({ user: session?.user || null });
      });

    } catch (error: any) {
      console.error('Error initializing auth:', error);
      set({ error: error.message });
      set({ user: null });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  signUp: async (email, password, username) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            avatar_url: '',
            bio: '',
          });

        if (profileError) throw profileError;
        
        // Create default user settings
        const { error: settingsError } = await supabase
          .from('user_settings')
          .insert({
            user_id: data.user.id,
            private_account: false,
          });

        if (settingsError) throw settingsError;
        
        set({ user: data.user });
      }
    } catch (error: any) {
      set({ error: error.message });
      console.error('Sign up error:', error);
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      set({ user: data.user });
    } catch (error: any) {
      set({ error: error.message });
      console.error('Sign in error:', error);
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
      console.error('Google sign in error:', error);
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error: any) {
      set({ error: error.message });
      console.error('Sign out error:', error);
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));