import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import type { Video } from '../../lib/supabase';

interface VideoViewerProps {
  video: Video;
  onClose: () => void;
}

const VideoViewer: React.FC<VideoViewerProps> = ({ video, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black z-50">
      <button 
        onClick={onClose}
        className="absolute top-4 left-4 z-50 p-2 hover:bg-gray-800 rounded-full"
      >
        <ArrowLeft size={24} />
      </button>
      
      <div className="h-full">
        <VideoPlayer video={video} isActive={true} />
      </div>
    </div>
  );
};

export default VideoViewer;