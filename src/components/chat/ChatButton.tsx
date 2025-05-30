import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '../../store/notificationStore';
import ChatPanel from './ChatPanel';
import { AnimatePresence } from 'framer-motion';

const ChatButton: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);
  const { unreadCount } = useChatStore();

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="p-2 hover:bg-gray-800 rounded-full relative"
      >
        <MessageCircle size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <ChatPanel onClose={() => setShowPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatButton;