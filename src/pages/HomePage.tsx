import React, { useEffect } from 'react';
import VideoFeed from '../components/video/VideoFeed';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const { user, initialized } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (initialized && !user) {
      navigate('/auth/login');
    }
  }, [user, initialized, navigate]);
  
  if (!initialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }
  
  return <VideoFeed />;
};

export default HomePage;