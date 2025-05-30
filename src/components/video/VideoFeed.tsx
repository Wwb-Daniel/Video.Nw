import React, { useEffect, useRef, useState } from 'react';
import { useVideoStore } from '../../store/videoStore';
import VideoPlayer from './VideoPlayer';
import { motion } from 'framer-motion';

const VideoFeed: React.FC = () => {
  const { videos, loading, error, hasMore, fetchVideos } = useVideoStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  
  // Initialize videos
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);
  
  // Set up infinite scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    };
    
    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading) {
        fetchVideos(Math.floor(videos.length / 5));
      }
    }, options);
    
    if (loaderRef.current) {
      observerRef.current.observe(loaderRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [videos.length, hasMore, loading, fetchVideos]);
  
  // Handle video scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const videoHeight = window.innerHeight * 0.9; // 90vh height for each video
    
    const newIndex = Math.floor((scrollTop + videoHeight / 2) / videoHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex);
    }
  };
  
  if (videos.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <img src="/logo.svg" alt="VideoNew" className="w-24 h-24 mb-6" />
        <h2 className="text-2xl font-bold mb-2">No videos yet</h2>
        <p className="text-gray-400 mb-6">Be the first to upload a video and start the trend!</p>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-screen">
      <div 
        className="h-screen overflow-y-scroll snap-y snap-mandatory"
        onScroll={handleScroll}
      >
        {videos.map((video, index) => (
          <motion.div
            key={video.id}
            className="h-[90vh] w-full snap-start flex items-center justify-center relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <VideoPlayer 
              video={video} 
              isActive={index === currentIndex}
            />
          </motion.div>
        ))}
        
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 p-4 text-center">
            Error loading videos: {error}
          </div>
        )}
        
        <div ref={loaderRef} className="h-4"></div>
      </div>
    </div>
  );
};

export default VideoFeed;