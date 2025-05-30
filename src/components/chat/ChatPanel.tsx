import React, { useEffect, useRef, useState } from 'react';
import { X, Send, User } from 'lucide-react';
import { useChatStore } from '../../store/notificationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';

interface ChatPanelProps {
  onClose: () => void;
  initialReceiverId?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onClose, initialReceiverId }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const {
    chats,
    activeChat,
    loading,
    fetchChats,
    sendMessage,
    markChatAsRead,
    setActiveChat,
    subscribeToChats,
    unsubscribeFromChats
  } = useChatStore();

  useEffect(() => {
    const initializeChat = async () => {
      await fetchChats();
      if (initialReceiverId) {
        // Find existing chat with this user
        const existingChat = chats.find(chat => 
          (chat.sender_id === user?.id && chat.receiver_id === initialReceiverId) ||
          (chat.sender_id === initialReceiverId && chat.receiver_id === user?.id)
        );
        if (existingChat) {
          setActiveChat(existingChat);
          if (!existingChat.read && existingChat.receiver_id === user?.id) {
            markChatAsRead(existingChat.id);
          }
        } else {
          // Create a placeholder chat for new conversation
          setActiveChat({
            id: 'new',
            sender_id: user?.id || '',
            receiver_id: initialReceiverId,
            message: '',
            read: true,
            created_at: new Date().toISOString(),
            sender_profile: undefined,
            receiver_profile: undefined
          });
        }
      }
    };

    initializeChat();
    subscribeToChats();
    return () => unsubscribeFromChats();
  }, [fetchChats, subscribeToChats, unsubscribeFromChats, initialReceiverId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeChat) return;

    const receiverId = activeChat.sender_id === user?.id
      ? activeChat.receiver_id
      : activeChat.sender_id;

    await sendMessage(receiverId, message.trim());
    setMessage('');
  };

  const getOtherUser = (chat: any) => {
    if (chat.sender_id === user?.id) {
      return chat.receiver_profile;
    }
    return chat.sender_profile;
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed top-16 right-0 w-80 h-[calc(100vh-4rem)] bg-gray-900 shadow-xl z-50"
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Messages</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {!activeChat ? (
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                </div>
              ) : chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <User size={48} className="text-gray-600 mb-4" />
                  <p className="text-gray-400">No messages yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Start a conversation by visiting someone's profile
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {chats.map((chat) => {
                    const otherUser = getOtherUser(chat);
                    return (
                      <button
                        key={chat.id}
                        onClick={() => {
                          setActiveChat(chat);
                          if (!chat.read && chat.receiver_id === user?.id) {
                            markChatAsRead(chat.id);
                          }
                        }}
                        className="w-full p-4 hover:bg-gray-800 flex items-center space-x-3 transition-colors"
                      >
                        {otherUser?.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                            <User size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium">@{otherUser?.username}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {chat.message}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}
                          </p>
                          {!chat.read && chat.receiver_id === user?.id && (
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1"></span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-800 flex items-center space-x-3">
                <button
                  onClick={() => setActiveChat(null)}
                  className="p-1 hover:bg-gray-800 rounded-full"
                >
                  <X size={20} />
                </button>
                {getOtherUser(activeChat)?.avatar_url ? (
                  <img
                    src={getOtherUser(activeChat).avatar_url}
                    alt={getOtherUser(activeChat).username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <User size={16} />
                  </div>
                )}
                <span className="font-medium">
                  @{getOtherUser(activeChat)?.username}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chats
                  .filter(
                    (chat) =>
                      (chat.sender_id === activeChat.sender_id &&
                        chat.receiver_id === activeChat.receiver_id) ||
                      (chat.sender_id === activeChat.receiver_id &&
                        chat.receiver_id === activeChat.sender_id)
                  )
                  .map((chat) => (
                    <div
                      key={chat.id}
                      className={`flex ${
                        chat.sender_id === user?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          chat.sender_id === user?.id
                            ? 'bg-blue-600'
                            : 'bg-gray-800'
                        }`}
                      >
                        <p className="text-sm">{chat.message}</p>
                        <p className="text-xs text-gray-300 mt-1">
                          {formatDistanceToNow(new Date(chat.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className={`p-2 rounded-full ${
                      message.trim()
                        ? 'bg-blue-500 hover:bg-blue-600'
                        : 'bg-gray-800 cursor-not-allowed'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatPanel;