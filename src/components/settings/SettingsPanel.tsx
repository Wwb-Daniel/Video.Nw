import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { UserSettings } from '../../lib/supabase';
import Button from '../ui/Button';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivateAccountToggle = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ private_account: !settings.private_account })
        .eq('user_id', settings.user_id);

      if (error) throw error;
      setSettings({ ...settings, private_account: !settings.private_account });
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDonationClick = () => {
    window.open('https://paypal.me/Daniel13341?country.x=DO&locale.x=es_XC', '_blank');
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      >
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-gray-900 rounded-lg w-full max-w-md overflow-hidden"
      >
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Privacy</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Private Account</p>
                <p className="text-sm text-gray-400">Only approved followers can see your videos</p>
              </div>
              <button
                onClick={handlePrivateAccountToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings?.private_account ? 'bg-blue-500' : 'bg-gray-700'
                }`}
                disabled={saving}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings?.private_account ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Support</h3>
            <Button
              onClick={handleDonationClick}
              className="w-full flex items-center justify-center space-x-2"
            >
              <DollarSign size={20} />
              <span>Support with a donation</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsPanel;