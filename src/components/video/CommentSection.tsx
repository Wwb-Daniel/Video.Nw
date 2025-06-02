import React, { useState, useEffect } from 'react';
import { X, User, Send, Gift, Crown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Comment } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import TokenPurchaseModal from '../chat/TokenPurchaseModal';

interface CommentSectionProps {
  videoId: string;
  onClose: () => void;
  onCommentAdded: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({ videoId, onClose, onCommentAdded }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState<string | null>(null);
  const [showTokenPurchase, setShowTokenPurchase] = useState(false);
  const [userTokens, setUserTokens] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchComments(), fetchUserTokens()]);
  }, [videoId]);

  const fetchUserTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserTokens(profile.coins);
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error);
      setError('Failed to fetch user tokens');
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user_profile:profiles!user_id(id, username, avatar_url, is_vip)
        `)
        .eq('content_id', videoId)
        .eq('content_type', 'video')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          content_id: videoId,
          content_type: 'video',
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar el estado local inmediatamente
      const newCommentWithProfile = {
        ...data,
        user_profile: {
          id: userData.user.id,
          username: userData.user.user_metadata.username || userData.user.email?.split('@')[0] || 'User',
          avatar_url: userData.user.user_metadata.avatar_url,
          is_vip: false
        }
      };
      setComments(prevComments => [newCommentWithProfile, ...prevComments]);

      // Notificar al componente padre para actualizar el contador
      onCommentAdded();

      // Actualizar el contador en la base de datos
      const { error: updateError } = await supabase
        .from('videos')
        .update({ comments_count: comments.length + 1 })
        .eq('id', videoId);

      if (updateError) throw updateError;

      setNewComment('');
    } catch (error: any) {
      console.error('Error posting comment:', error);
      setError('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async (commentId: string, reactionType: string, coinCost: number) => {
    try {
      if (userTokens < coinCost) {
        setShowTokenPurchase(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get comment owner and their current balance
      const comment = comments.find(c => c.id === commentId);
      if (!comment) throw new Error('Comment not found');

      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('coins, total_earnings')
        .eq('id', comment.user_id)
        .single();

      if (!receiverProfile) throw new Error('Receiver profile not found');

      // Create transaction
      const { error: transactionError } = await supabase
        .from('virtual_currency_transactions')
        .insert({
          user_id: user.id,
          amount: -coinCost,
          transaction_type: 'reaction',
          reference_id: commentId,
          status: 'completed'
        });

      if (transactionError) throw transactionError;

      // Update sender's balance
      const { error: senderError } = await supabase
        .from('profiles')
        .update({ coins: userTokens - coinCost })
        .eq('id', user.id);

      if (senderError) throw senderError;

      // Update comment owner's balance
      const updatedCoins = receiverProfile.coins + coinCost;
      const updatedEarnings = receiverProfile.total_earnings + (coinCost * 0.01);

      const { error: ownerError } = await supabase
        .from('profiles')
        .update({ 
          coins: updatedCoins,
          total_earnings: updatedEarnings
        })
        .eq('id', comment.user_id);

      if (ownerError) throw ownerError;

      // Update comment reactions
      const currentReactions = comment.reactions || {};
      const { error: reactionError } = await supabase
        .from('comments')
        .update({
          reactions: {
            ...currentReactions,
            [reactionType]: (currentReactions[reactionType] || 0) + 1
          }
        })
        .eq('id', commentId);

      if (reactionError) throw reactionError;

      setShowReactionMenu(null);
      await Promise.all([fetchComments(), fetchUserTokens()]);
    } catch (error: any) {
      console.error('Error sending reaction:', error);
      setError('Failed to send reaction');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold">Comments</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-full"
        >
          <X size={24} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-3 mx-4 mt-4 rounded-lg">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex space-x-3"
            >
              <div className="flex-shrink-0">
                {comment.user_profile?.avatar_url ? (
                  <img
                    src={comment.user_profile.avatar_url}
                    alt={comment.user_profile.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <User size={20} />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">@{comment.user_profile?.username}</span>
                  {comment.user_profile?.is_vip && (
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full px-2 py-0.5 text-xs flex items-center">
                      <Crown size={12} className="text-yellow-300 mr-1" />
                      VIP
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-sm mt-1">{comment.content}</p>
                
                {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(comment.reactions).map(([type, count]) => (
                      <span key={type} className="bg-gray-800 rounded-full px-2 py-1 text-xs flex items-center">
                        {type === 'love' && '❤️'}
                        {type === 'gift' && '🎁'}
                        {type === 'star' && '⭐'}
                        {count}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="relative mt-2 flex items-center space-x-2">
                  <button
                    onClick={() => setShowReactionMenu(showReactionMenu === comment.id ? null : comment.id)}
                    className="text-sm text-gray-400 hover:text-white flex items-center space-x-1"
                  >
                    <Gift size={14} />
                    <span>React</span>
                  </button>
                  
                  <AnimatePresence>
                    {showReactionMenu === comment.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute left-0 top-full mt-2 bg-gray-900 rounded-lg shadow-xl p-2 z-10"
                      >
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleReaction(comment.id, 'love', 5)}
                            className="flex flex-col items-center p-2 hover:bg-gray-800 rounded-lg"
                          >
                            <span className="text-xl">❤️</span>
                            <span className="text-xs mt-1">5 tokens</span>
                          </button>
                          <button
                            onClick={() => handleReaction(comment.id, 'gift', 10)}
                            className="flex flex-col items-center p-2 hover:bg-gray-800 rounded-lg"
                          >
                            <span className="text-xl">🎁</span>
                            <span className="text-xs mt-1">10 tokens</span>
                          </button>
                          <button
                            onClick={() => handleReaction(comment.id, 'star', 20)}
                            className="flex flex-col items-center p-2 hover:bg-gray-800 rounded-lg"
                          >
                            <span className="text-xl">⭐</span>
                            <span className="text-xs mt-1">20 tokens</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className={`p-2 rounded-full ${
              isSubmitting || !newComment.trim()
                ? 'bg-gray-800 text-gray-500'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {showTokenPurchase && (
          <TokenPurchaseModal
            onClose={() => setShowTokenPurchase(false)}
            onSuccess={() => {
              setShowTokenPurchase(false);
              fetchUserTokens();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommentSection;