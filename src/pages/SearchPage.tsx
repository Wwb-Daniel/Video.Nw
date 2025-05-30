import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, Video } from '../lib/supabase';
import { Link } from 'react-router-dom';

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    videos: Video[],
    users: UserProfile[]
  }>({ videos: [], users: [] });
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Search videos by title or description
      const { data: videosData } = await supabase
        .from('videos')
        .select(`
          *,
          user_profile:profiles(id, username, avatar_url)
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10);
      
      // Search users by username
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .limit(10);
      
      setResults({
        videos: videosData || [],
        users: usersData || []
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Search</h1>
        
        <div className="flex items-center bg-gray-900 rounded-full px-4 py-2 mb-6">
          <Search size={20} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search for videos or users"
            className="bg-transparent border-none w-full focus:outline-none text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Users section */}
            {results.users.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Users</h2>
                <div className="space-y-3">
                  {results.users.map((user) => (
                    <Link 
                      key={user.id}
                      to={`/profile/${user.id}`}
                      className="flex items-center p-2 hover:bg-gray-900 rounded-lg"
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center mr-3">
                          <Search size={20} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">@{user.username}</div>
                        {user.bio && (
                          <p className="text-sm text-gray-400 truncate max-w-xs">{user.bio}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Videos section */}
            {results.videos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Videos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {results.videos.map((video) => (
                    <Link
                      key={video.id}
                      to={`/video/${video.id}`}
                      className="rounded-lg overflow-hidden aspect-[9/16] relative bg-gray-900"
                    >
                      <video
                        src={video.video_url}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black p-2">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        <p className="text-xs text-gray-400">@{video.user_profile?.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty state */}
            {query && !results.users.length && !results.videos.length && (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium mb-1">No results found</h3>
                <p className="text-gray-500">Try a different search term</p>
              </div>
            )}
            
            {/* Initial state */}
            {!query && (
              <div className="text-center py-12">
                <Search size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium mb-1">Search for content</h3>
                <p className="text-gray-500">Find videos, users, and more</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;