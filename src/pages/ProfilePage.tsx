import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserProfile, Video } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Grid, Heart, Bookmark, ArrowLeft, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import EditProfileModal from '../components/profile/EditProfileModal';
import VideoViewer from '../components/video/VideoViewer';
import ProfileHeader from '../components/profile/ProfileHeader';
import { AnimatePresence } from 'framer-motion';

type TabType = 'videos' | 'likes' | 'saved';

const ProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const navigate = useNavigate();
  
  const isCurrentUser = user?.id === id;

  const fetchProfileData = async () => {
    if (!id) {
      setError('Profile ID is required');
      setLoading(false);
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      if (!profileData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          user_profile:profiles(id, username, avatar_url)
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);

      if (isCurrentUser) {
        // Fetch liked video IDs first
        const { data: likedVideoIds } = await supabase
          .from('likes')
          .select('video_id')
          .eq('user_id', id);

        // Filter out null values and extract video IDs
        const validLikedVideoIds = (likedVideoIds || [])
          .map(like => like.video_id)
          .filter(Boolean);

        if (validLikedVideoIds.length > 0) {
          const { data: likedData, error: likedError } = await supabase
            .from('videos')
            .select(`
              *,
              user_profile:profiles(id, username, avatar_url)
            `)
            .in('id', validLikedVideoIds)
            .order('created_at', { ascending: false });

          if (likedError) throw likedError;
          setLikedVideos(likedData || []);
        }

        // Fetch saved video IDs first
        const { data: savedVideoIds } = await supabase
          .from('video_saves')
          .select('video_id')
          .eq('user_id', id);

        // Filter out null values and extract video IDs
        const validSavedVideoIds = (savedVideoIds || [])
          .map(save => save.video_id)
          .filter(Boolean);

        if (validSavedVideoIds.length > 0) {
          const { data: savedData, error: savedError } = await supabase
            .from('videos')
            .select(`
              *,
              user_profile:profiles(id, username, avatar_url)
            `)
            .in('id', validSavedVideoIds)
            .order('created_at', { ascending: false });

          if (savedError) throw savedError;
          setSavedVideos(savedData || []);
        }
      }

      setError(null);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [id, isCurrentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <Grid size={64} className="text-gray-500 mb-4" />
        <h2 className="text-xl font-bold">{error || 'Profile not found'}</h2>
        <p className="text-gray-500 mb-6">The profile you're looking for doesn't exist or is unavailable.</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Go to Home
        </Button>
      </div>
    );
  }

  const getCurrentVideos = () => {
    switch (activeTab) {
      case 'likes':
        return likedVideos;
      case 'saved':
        return savedVideos;
      default:
        return videos;
    }
  };

  const renderVideoGrid = (videos: Video[]) => {
    if (videos.length === 0) {
      return (
        <div className="py-12 text-center">
          <Grid size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium mb-1">No videos yet</h3>
          <p className="text-gray-500">
            {activeTab === 'videos' && isCurrentUser && 'Upload your first video today!'}
            {activeTab === 'videos' && !isCurrentUser && 'This user has not uploaded any videos.'}
            {activeTab === 'likes' && 'No liked videos yet.'}
            {activeTab === 'saved' && 'No saved videos yet.'}
          </p>
          {activeTab === 'videos' && isCurrentUser && (
            <Link to="/upload">
              <Button className="mt-4">Upload Video</Button>
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-2">
        {videos.map((video) => (
          <button
            key={video.id}
            onClick={() => setSelectedVideo(video)}
            className="aspect-[9/16] relative bg-gray-900 overflow-hidden rounded-lg group"
          >
            <video
              src={video.video_url}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <h4 className="text-sm font-medium truncate">{video.title}</h4>
                <div className="flex items-center text-xs text-gray-300 mt-1">
                  <Eye size={12} className="mr-1" />
                  {video.views_count} views
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 flex items-center">
          <Link to="/" className="text-gray-400 hover:text-white mr-4">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
        
        <ProfileHeader
          profile={profile}
          onEditClick={() => setShowEditModal(true)}
        />
        
        <div className="border-t border-gray-800">
          <div className="flex justify-around p-2 border-b border-gray-800">
            <button
              className={`flex items-center justify-center flex-1 py-2 space-x-2 ${
                activeTab === 'videos' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('videos')}
            >
              <Grid size={20} />
              <span className="text-sm font-medium">Videos</span>
            </button>
            
            {isCurrentUser && (
              <>
                <button
                  className={`flex items-center justify-center flex-1 py-2 space-x-2 ${
                    activeTab === 'likes' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
                  }`}
                  onClick={() => setActiveTab('likes')}
                >
                  <Heart size={20} />
                  <span className="text-sm font-medium">Likes</span>
                </button>
                
                <button
                  className={`flex items-center justify-center flex-1 py-2 space-x-2 ${
                    activeTab === 'saved' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
                  }`}
                  onClick={() => setActiveTab('saved')}
                >
                  <Bookmark size={20} />
                  <span className="text-sm font-medium">Saved</span>
                </button>
              </>
            )}
          </div>
          
          <div className="py-4">
            {renderVideoGrid(getCurrentVideos())}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && profile && (
          <EditProfileModal
            profile={profile}
            onClose={() => setShowEditModal(false)}
            onUpdate={fetchProfileData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedVideo && (
          <VideoViewer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;