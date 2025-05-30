import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Notification, Chat } from '../lib/supabase';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;
}

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchChats: () => Promise<void>;
  sendMessage: (receiverId: string, message: string) => Promise<void>;
  markChatAsRead: (chatId: string) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  subscribeToChats: () => void;
  unsubscribeFromChats: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  let notificationSubscription: any = null;

  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,

    fetchNotifications: async () => {
      set({ loading: true, error: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select(`
            *,
            actor_profile:profiles!actor_id(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const unreadCount = data?.filter(n => !n.read).length || 0;
        set({ notifications: data || [], unreadCount });
      } catch (error: any) {
        set({ error: error.message });
      } finally {
        set({ loading: false });
      }
    },

    markAsRead: async (notificationId: string) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notificationId);

        if (error) throw error;
        await get().fetchNotifications();
      } catch (error: any) {
        console.error('Error marking notification as read:', error);
      }
    },

    markAllAsRead: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);

        if (error) throw error;
        await get().fetchNotifications();
      } catch (error: any) {
        console.error('Error marking all notifications as read:', error);
      }
    },

    subscribeToNotifications: () => {
      const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        notificationSubscription = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              get().fetchNotifications();
            }
          )
          .subscribe();
      };

      setupSubscription();
    },

    unsubscribeFromNotifications: () => {
      if (notificationSubscription) {
        supabase.removeChannel(notificationSubscription);
      }
    },
  };
});

export const useChatStore = create<ChatState>((set, get) => {
  let chatSubscription: any = null;

  return {
    chats: [],
    activeChat: null,
    unreadCount: 0,
    loading: false,
    error: null,

    fetchChats: async () => {
      set({ loading: true, error: null });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('chats')
          .select(`
            *,
            sender_profile:profiles!sender_id(*),
            receiver_profile:profiles!receiver_id(*)
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const unreadCount = data?.filter(c => !c.read && c.receiver_id === user.id).length || 0;
        set({ chats: data || [], unreadCount });
      } catch (error: any) {
        set({ error: error.message });
      } finally {
        set({ loading: false });
      }
    },

    sendMessage: async (receiverId: string, message: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
          .from('chats')
          .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            message,
          });

        if (error) throw error;
        await get().fetchChats();
      } catch (error: any) {
        console.error('Error sending message:', error);
      }
    },

    markChatAsRead: async (chatId: string) => {
      try {
        const { error } = await supabase
          .from('chats')
          .update({ read: true })
          .eq('id', chatId);

        if (error) throw error;
        await get().fetchChats();
      } catch (error: any) {
        console.error('Error marking chat as read:', error);
      }
    },

    setActiveChat: (chat) => {
      set({ activeChat: chat });
    },

    subscribeToChats: () => {
      const setupSubscription = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        chatSubscription = supabase
          .channel('chats')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'chats',
              filter: `receiver_id=eq.${user.id}`,
            },
            () => {
              get().fetchChats();
            }
          )
          .subscribe();
      };

      setupSubscription();
    },

    unsubscribeFromChats: () => {
      if (chatSubscription) {
        supabase.removeChannel(chatSubscription);
      }
    },
  };
});