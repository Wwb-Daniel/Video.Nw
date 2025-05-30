import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import AuthGuard from './components/layout/AuthGuard';
import AppLayout from './components/layout/AppLayout';

// Auth pages
import AuthPage from './pages/AuthPage';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

// Main app pages
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import UploadPage from './pages/UploadPage';
import SearchPage from './pages/SearchPage';

function App() {
  const { initialize, initialized } = useAuthStore();
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <img src="/logo.svg" alt="VideoNew" className="w-16 h-16 animate-pulse" />
      </div>
    );
  }
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/auth" element={<AuthPage />}>
          <Route path="login" element={<LoginForm />} />
          <Route path="register" element={<RegisterForm />} />
          <Route index element={<Navigate to="/auth/login" replace />} />
        </Route>
        
        {/* Protected routes */}
        <Route path="/" element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }>
          <Route index element={<HomePage />} />
          <Route path="profile/:id" element={<ProfilePage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="search" element={<SearchPage />} />
        </Route>
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;