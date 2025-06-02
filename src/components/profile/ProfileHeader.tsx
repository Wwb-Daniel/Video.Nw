import React, { useState, useEffect } from 'react';
import { User, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import Button from '../ui/Button';
import ChatPanel from '../chat/ChatPanel';
import { AnimatePresence } from 'framer-motion';

interface ProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    avatar_url?: string;
    bio?: string;
  };
  onEditClick?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, onEditClick }) => {
  const { user } = useAuthStore();
  const { followUser, unfollowUser, isFollowing, getFollowersCount, getFollowingCount } = useUserStore();
  const [following, setFollowing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const isCurrentUser = user?.id === profile.id;

  useEffect(() => {
    const loadFollowData = async () => {
      if (profile.id) {
        const [followStatus, followers, following] = await Promise.all([
          isFollowing(profile.id),
          getFollowersCount(profile.id),
          getFollowingCount(profile.id)
        ]);
        
        setFollowing(followStatus);
        setFollowersCount(followers);
        setFollowingCount(following);
      }
    };
    
    loadFollowData();
  }, [profile.id, isFollowing, getFollowersCount, getFollowingCount]);

  const handleFollowClick = async () => {
    if (following) {
      await unfollowUser(profile.id);
      setFollowersCount(prev => prev - 1);
    } else {
      await followUser(profile.id);
      setFollowersCount(prev => prev + 1);
    }
    setFollowing(!following);
  };

  return (
    <div className="py-8 text-center">
      <div className="max-w-3xl mx-auto">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover mx-auto mb-4"
          />
        ) : (
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} className="text-gray-400" />
          </div>
        )}
        
        <h2 className="text-2xl sm:text-3xl font-bold">@{profile.username}</h2>
        {profile.bio && (
          <p className="text-gray-400 mt-2 max-w-lg mx-auto">{profile.bio}</p>
        )}
        
        <div className="flex justify-center mt-6 space-x-12">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold">{followersCount}</div>
            <div className="text-sm sm:text-base text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold">{followingCount}</div>
            <div className="text-sm sm:text-base text-gray-400">Following</div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center space-x-4">
          {isCurrentUser ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditClick}
            >
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                variant={following ? 'outline' : 'primary'}
                size="sm"
                onClick={handleFollowClick}
              >
                {following ? 'Following' : 'Follow'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChat(true)}
              >
                <MessageCircle size={18} className="mr-2" />
                Message
              </Button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showChat && (
          <ChatPanel 
            onClose={() => setShowChat(false)} 
            initialReceiverId={profile.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileHeader;