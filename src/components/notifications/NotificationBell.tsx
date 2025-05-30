import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationPanel from './NotificationPanel';
import { AnimatePresence } from 'framer-motion';

const NotificationBell: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);
  const { unreadCount } = useNotificationStore();

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="p-2 hover:bg-gray-800 rounded-full relative"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showPanel && (
          <NotificationPanel onClose={() => setShowPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;