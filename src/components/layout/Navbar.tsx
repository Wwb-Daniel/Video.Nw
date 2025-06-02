import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, User, LogOut, Menu, X, Compass, Users, Settings, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useVideoStore } from '../../store/videoStore';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '../notifications/NotificationBell';
import ChatButton from '../chat/ChatButton';
import SettingsPanel from '../settings/SettingsPanel';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { feedType, setFeedType } = useVideoStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-black border-b border-gray-800 z-50 px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src="/logo (2).png" alt="OmniPlay Logo" className="h-8 w-8 mr-2" />
          <span className="text-xl font-bold bg-gradient-brand text-transparent bg-clip-text">OmniPlay</span>
        </Link>
        
        <div className="flex items-center space-x-2">
          <NotificationBell />
          <ChatButton />
          <button
            onClick={toggleMenu}
            className="p-2 hover:bg-gray-800 rounded-lg"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed top-0 left-0 bottom-0 w-64 bg-black border-r border-gray-800 z-40 pt-16"
          >
            <div className="p-4">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Feed</h3>
                <button
                  onClick={() => {
                    setFeedType('all');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg ${
                    feedType === 'all' ? 'bg-gradient-brand text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Compass size={20} className="mr-3" />
                  For You
                </button>
                <button
                  onClick={() => {
                    setFeedType('following');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg mt-1 ${
                    feedType === 'following' ? 'bg-gradient-brand text-white' : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Users size={20} className="mr-3" />
                  Following
                </button>
              </div>

              <div className="space-y-1">
                <NavItem
                  to="/"
                  icon={<Home size={20} />}
                  label="Home"
                  isActive={location.pathname === '/'}
                  onClick={() => setIsMenuOpen(false)}
                />
                <NavItem
                  to="/search"
                  icon={<Search size={20} />}
                  label="Search"
                  isActive={location.pathname === '/search'}
                  onClick={() => setIsMenuOpen(false)}
                />
                <NavItem
                  to="/upload"
                  icon={<PlusSquare size={20} />}
                  label="Upload"
                  isActive={location.pathname === '/upload'}
                  onClick={() => setIsMenuOpen(false)}
                />
                <NavItem
                  to={`/profile/${user?.id}`}
                  icon={<User size={20} />}
                  label="Profile"
                  isActive={location.pathname.startsWith('/profile')}
                  onClick={() => setIsMenuOpen(false)}
                />
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
                >
                  <Settings size={20} className="mr-3" />
                  <span>Settings</span>
                </button>
              </div>

              <div className="absolute bottom-4 left-4 right-4">
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-2 text-red-500 hover:bg-gray-800 rounded-lg"
                >
                  <LogOut size={20} className="mr-3" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      <div className="h-14" /> {/* Spacer for fixed navbar */}
    </>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive, onClick }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-3 py-2 rounded-lg ${
        isActive ? 'bg-gradient-brand text-white' : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <div className="mr-3">{icon}</div>
      <span>{label}</span>
    </Link>
  );
};

export default Navbar;