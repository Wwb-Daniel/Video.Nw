import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { motion } from 'framer-motion';

interface EditProfileModalProps {
  profile: {
    username: string;
    bio?: string;
    avatar_url?: string;
  };
  onClose: () => void;
  onUpdate: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  onClose,
  onUpdate,
}) => {
  const [formData, setFormData] = useState({
    username: profile.username,
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(profile.avatar_url || '');

  const handleAvatarChange = (url: string) => {
    setFormData({ ...formData, avatar_url: url });
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
        })
        .eq('id', userData.user.id);

      if (updateError) throw updateError;

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-gray-900 rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setPreviewUrl('')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
            
            <Input
              label="Avatar URL"
              placeholder="Enter image URL"
              value={formData.avatar_url}
              onChange={(e) => handleAvatarChange(e.target.value)}
              fullWidth
            />
          </div>

          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            fullWidth
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Tell us about yourself..."
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EditProfileModal;