import React, { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, User, Volume2, VolumeX, Play, Pause, Eye, Bookmark, MoreVertical, Plus, Check, Pencil, Trash2, Download, Crown } from 'lucide-react';
import { useVideoStore } from '../../store/videoStore';
import { useUserStore } from '../../store/userStore';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { Video } from '../../lib/supabase';
import CommentSection from './CommentSection';
import EditVideoModal from './EditVideoModal';

interface VideoPlayerProps {
  video: Video;
  isActive: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCurrentUserVideo, setIsCurrentUserVideo] = useState(false);
  const [hasRecordedView, setHasRecordedView] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { likeVideo, saveVideo, deleteVideo, updateVideo } = useVideoStore();
  const { followUser, unfollowUser, isFollowing: checkIsFollowing } = useUserStore();
  const navigate = useNavigate();

  // Reset view recording state when video changes
  useEffect(() => {
    setHasRecordedView(false);
  }, [video.id]);

  // Check if current user is the video owner
  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsCurrentUserVideo(user?.id === video.user_id);
    };
    checkOwnership();
  }, [video.user_id]);

  // Check if user is following the video creator
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (video.user_id) {
        const following = await checkIsFollowing(video.user_id);
        setIsFollowing(following);
      }
    };
    checkFollowStatus();
  }, [video.user_id, checkIsFollowing]);

  // Check if video is liked by current user
  useEffect(() => {
    const checkLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('likes')
        .select()
        .eq('user_id', user.id)
        .eq('content_id', video.id)
        .eq('content_type', 'video')
        .maybeSingle();

      setIsLiked(!!data);
    };
    checkLikeStatus();
  }, [video.id]);

  // Check if video is saved by current user
  useEffect(() => {
    const checkSaveStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('video_saves')
        .select()
        .eq('user_id', user.id)
        .eq('video_id', video.id)
        .maybeSingle();

      setIsSaved(!!data);
    };
    checkSaveStatus();
  }, [video.id]);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        const playVideo = async () => {
          try {
            if (!isPlaying) {
              await videoRef.current?.play();
              setIsPlaying(true);
              setShowPlayButton(false);
              
              if (!hasRecordedView) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await recordView();
                  setHasRecordedView(true);
                }
              }
            }
          } catch (error) {
            setIsPlaying(false);
            setShowPlayButton(true);
          }
        };
        playVideo();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
        setShowPlayButton(true);
      }
    }
  }, [isActive, hasRecordedView]);

  const recordView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Registrar la vista en video_views
      const { error: viewError } = await supabase
        .from('video_views')
        .insert({
          video_id: video.id,
          user_id: user.id
        });

      if (viewError) {
        // Si es un error de duplicado, lo ignoramos (el usuario ya vio el video)
        if (viewError.code === '23505') return;
        console.error('Error recording view:', viewError);
        return;
      }

      // El trigger actualizará automáticamente el contador de vistas
      // No necesitamos actualizar manualmente el contador
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const togglePlay = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
          setShowPlayButton(true);
        } else {
          await videoRef.current.play();
          setIsPlaying(true);
          setShowPlayButton(false);
        }
      } catch (error) {
        setIsPlaying(false);
        setShowPlayButton(true);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!isLiked) {
        // Add like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            content_id: video.id,
            content_type: 'video',
            video_id: video.id
          });

        if (error) {
          // If it's a unique constraint violation, the like already exists
          if (error.code === '23505') {
            console.log('Like already exists');
            return;
          }
          throw error;
        }

        // Actualizar el estado local inmediatamente
        setIsLiked(true);
        // Incrementar el contador localmente
        video.likes_count = (video.likes_count || 0) + 1;

        // Actualizar el contador en la base de datos
        const { error: updateError } = await supabase
          .from('videos')
          .update({ 
            likes_count: video.likes_count
          })
          .eq('id', video.id);

        if (updateError) {
          console.error('Error updating likes count:', updateError);
        }
      }
    } catch (error) {
      console.error('Error adding like:', error);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    await saveVideo(video.id);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      await deleteVideo(video.id);
      navigate('/');
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
    setShowOptions(false);
  };

  const handleVideoUpdate = async (title: string, description: string) => {
    await updateVideo(video.id, title, description);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(video.video_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading video:', error);
    }
    setShowOptions(false);
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowing) {
      await unfollowUser(video.user_id);
    } else {
      await followUser(video.user_id);
    }
    setIsFollowing(!isFollowing);
  };

  const toggleComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(!showComments);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: video.title,
        text: video.description,
        url: window.location.href
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
    setShowOptions(false);
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={video.video_url}
        className="absolute inset-0 w-full h-full object-contain z-10"
        loop
        playsInline
        muted={isMuted}
        onClick={togglePlay}
      />
      
      <motion.button
        whileTap={{ scale: 1.1 }}
        className="absolute top-4 left-4 z-30"
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
      >
        <div className="w-10 h-10 rounded-full bg-gray-800 bg-opacity-70 flex items-center justify-center">
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </div>
      </motion.button>

      <div 
        className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        {showPlayButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="bg-black bg-opacity-50 rounded-full p-4"
          >
            {isPlaying ? (
              <Pause className="w-12 h-12 text-white" />
            ) : (
              <Play className="w-12 h-12 text-white" />
            )}
          </motion.div>
        )}
      </div>

      {/* VIP badge for creator */}
      {video.user_profile?.is_vip && (
        <div className="absolute top-4 right-4 z-30 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full px-3 py-1 flex items-center space-x-1">
          <Crown size={16} className="text-yellow-300" />
          <span className="text-xs font-medium">VIP Creator</span>
        </div>
      )}

      {/* Interaction buttons - centered on the right */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center space-y-4">
        <motion.button
          whileTap={{ scale: 1.1 }}
          className="flex flex-col items-center"
          onClick={handleLike}
        >
          <div className={`w-12 h-12 rounded-full bg-gray-800 bg-opacity-70 flex items-center justify-center ${isLiked ? 'text-red-500' : 'text-white'}`}>
            <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
          </div>
          <span className="text-xs mt-1">{formatCount(video.likes_count)}</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 1.1 }}
          className="flex flex-col items-center"
          onClick={toggleComments}
        >
          <div className="w-12 h-12 rounded-full bg-gray-800 bg-opacity-70 flex items-center justify-center">
            <MessageCircle size={24} />
          </div>
          <span className="text-xs mt-1">{formatCount(video.comments_count)}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 1.1 }}
          className="flex flex-col items-center"
          onClick={handleSave}
        >
          <div className={`w-12 h-12 rounded-full bg-gray-800 bg-opacity-70 flex items-center justify-center ${isSaved ? 'text-blue-500' : 'text-white'}`}>
            <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
          </div>
          <span className="text-xs mt-1">Save</span>
        </motion.button>
        
        <div className="relative">
          <motion.button
            whileTap={{ scale: 1.1 }}
            className="flex flex-col items-center"
            onClick={handleOptionsClick}
          >
            <div className="w-12 h-12 rounded-full bg-gray-800 bg-opacity-70 flex items-center justify-center">
              <MoreVertical size={24} />
            </div>
          </motion.button>

          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-lg overflow-hidden"
              >
                {isCurrentUserVideo && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
                    >
                      <Pencil size={18} className="mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptions(false);
                        handleDelete();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center text-red-500"
                    >
                      <Trash2 size={18} className="mr-2" />
                      Delete
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
                >
                  <Share2 size={18} className="mr-2" />
                  Share
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center"
                >
                  <Download size={18} className="mr-2" />
                  Download
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Video info section */}
      <div className="absolute bottom-8 left-0 right-16 z-30 px-4">
        <div className="max-w-3xl">
          <div className="flex items-center space-x-3 mb-3">
            <Link 
              to={`/profile/${video.user_id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            >
              {video.user_profile?.avatar_url ? (
                <img 
                  src={video.user_profile.avatar_url} 
                  alt={video.user_profile.username}
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <User size={20} />
                </div>
              )}
            </Link>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <Link 
                  to={`/profile/${video.user_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  <span className="text-base font-medium">@{video.user_profile?.username}</span>
                </Link>
                
                {!isCurrentUserVideo && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleFollow}
                    className="ml-2 px-3 py-1 rounded-full bg-gray-800 bg-opacity-70 flex items-center space-x-1"
                  >
                    {isFollowing ? (
                      <>
                        <Check size={16} className="text-blue-500" />
                        <span className="text-sm">Following</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span className="text-sm">Follow</span>
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          
          <h3 className="text-sm font-medium mb-1">{video.title}</h3>
          
          {video.description && (
            <p className="text-xs text-gray-300 line-clamp-2">{video.description}</p>
          )}
          
          <div className="flex items-center mt-2 text-gray-400 text-xs">
            <Eye size={12} className="mr-1" />
            <span>{formatCount(video.views_count)} views</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-0 left-0 right-0 h-[70vh] md:h-[70vh] md:w-[400px] md:right-0 md:left-auto md:top-auto bg-black bg-opacity-95 z-40 rounded-t-2xl md:rounded-tl-2xl md:rounded-tr-none"
            onClick={(e) => e.stopPropagation()}
          >
            <CommentSection
              videoId={video.id}
              onClose={() => setShowComments(false)}
              onCommentAdded={() => {
                // Actualizar el contador localmente
                video.comments_count = (video.comments_count || 0) + 1;
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <EditVideoModal
            video={video}
            onClose={() => setShowEditModal(false)}
            onUpdate={handleVideoUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VideoPlayer;