import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  redirectTo = '/auth/login',
}) => {
  const { user, initialized, initialize } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initialized) {
      initialize();
    } else if (!user) {
      navigate(redirectTo);
    }
  }, [user, initialized, navigate, redirectTo, initialize]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;