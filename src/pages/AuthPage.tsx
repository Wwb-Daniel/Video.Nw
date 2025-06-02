import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const AuthPage: React.FC = () => {
  const { user, initialized } = useAuthStore();
  const location = useLocation();
  
  // If user is already authenticated, redirect to home
  if (initialized && user) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-purple to-black text-white flex flex-col items-center justify-center p-4">
      <div className="bg-black bg-opacity-30 backdrop-blur-sm p-8 rounded-xl border border-gray-800 w-full max-w-md">
        <Outlet />
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-400">
        <p>OmniPlay &copy; {new Date().getFullYear()} - All rights reserved</p>
      </div>
    </div>
  );
};

export default AuthPage;