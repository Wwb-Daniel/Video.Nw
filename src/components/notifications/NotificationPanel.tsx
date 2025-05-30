import React, { useEffect } from 'react';
import { Bell, X, Heart, MessageCircle, UserPlus, Eye } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead,
    subscribeToNotifications,
    unsubscribeFromNotifications
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    subscribeToNotifications();
    return () => unsubscribeFromNotifications();
  }, [fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart size={20} className="text-red-500" />;
      case 'comment':
        return <MessageCircle size={20} className="text-blue-500" />;
      case 'follow':
        return <UserPlus size={20} className="text-green-500" />;
      case 'message':
        return <MessageCircle size={20} className="text-purple-500" />;
      default:
        return <Bell size={20} />;
    }
  };

  const getNotificationText = (notification: any) => {
    const username = notification.actor_profile?.username || 'Someone';
    switch (notification.type) {
      case 'like':
        return `${username} liked your video`;
      case 'comment':
        return `${username} commented on your video`;
      case 'follow':
        return `${username} started following you`;
      case 'message':
        return `${username} sent you a message`;
      default:
        return 'New notification';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-16 right-4 w-96 max-h-[80vh] bg-gray-900 rounded-lg shadow-xl overflow-hidden z-50"
    >
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-400">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-500 hover:text-blue-400"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(80vh-64px)]">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-800 transition-colors ${
                  !notification.read ? 'bg-gray-800/50' : ''
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start space-x-3">
                  {notification.actor_profile?.avatar_url ? (
                    <img
                      src={notification.actor_profile.avatar_url}
                      alt={notification.actor_profile.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <Link
                        to={`/profile/${notification.actor_id}`}
                        className="font-medium hover:underline"
                      >
                        {notification.actor_profile?.username}
                      </Link>{' '}
                      {getNotificationText(notification)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationPanel;