import React, { useState, useEffect } from 'react';
import MusicAPI, { Track } from '../api/music';
import { useTheme } from '../context/ThemeContext';

interface MusicLibraryProps {
  onPlayTrack: (track: Track, playlist: Track[]) => void;
}

const MusicLibrary: React.FC<MusicLibraryProps> = ({ onPlayTrack }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'featured' | 'search'>('featured');

  useEffect(() => {
    loadFeatured();
  }, []);

  const loadFeatured = async () => {
    try {
      const tracks = await MusicAPI.getFeatured();
      setFeaturedTracks(tracks);
    } catch (error) {
      console.error('Failed to load featured tracks:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setActiveTab('featured');
      return;
    }

    setIsSearching(true);
    setActiveTab('search');
    try {
      const results = await MusicAPI.search(query);
      setSearchResults(results.tracks || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const displayTracks = activeTab === 'featured' ? featuredTracks : searchResults;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col">
          <h2 className={`text-3xl font-outfit font-black tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>Music Library</h2>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
            theme === 'dark' ? 'text-zinc-500' : 'text-slate-500'
          }`}>Discover & Play</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for songs, artists, albums..."
            className={`w-full px-5 py-3.5 pl-12 border rounded-2xl placeholder focus:outline-none focus:border-indigo-500/50 transition-colors ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-white placeholder-zinc-500'
                : 'bg-slate-200 border-slate-300 text-slate-900 placeholder-slate-500'
            }`}
          />
          <svg
            className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 ${
              theme === 'dark' ? 'text-zinc-500' : 'text-slate-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('featured')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'featured'
                ? 'bg-indigo-500 text-white'
                : theme === 'dark'
                  ? 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Featured
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === 'search'
                ? 'bg-indigo-500 text-white'
                : theme === 'dark'
                  ? 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
            disabled={!searchQuery}
          >
            Search Results {searchResults.length > 0 && `(${searchResults.length})`}
          </button>
        </div>
      </div>

      {/* Tracks List */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-32">
        {displayTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
              theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'
            }`}>
              <svg className={`w-10 h-10 ${theme === 'dark' ? 'text-zinc-600' : 'text-slate-500'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <p className={`font-medium ${
              theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
            }`}>
              {activeTab === 'search' ? 'No tracks found' : 'No featured tracks available'}
            </p>
            <p className={`text-sm mt-1 ${
              theme === 'dark' ? 'text-zinc-600' : 'text-slate-500'
            }`}>
              {activeTab === 'search' ? 'Try a different search term' : 'Check back later'}
            </p>
          </div>
        ) : (
          displayTracks.map((track, index) => (
            <div
              key={track.id || index}
              className={`group flex items-center gap-4 p-3 rounded-2xl transition-all cursor-pointer ${
                theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-200'
              }`}
              onClick={() => onPlayTrack(track, displayTracks)}
            >
              {/* Album Art */}
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-14 h-14 rounded-xl object-cover shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              )}

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate group-hover:text-indigo-400 transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {track.title}
                </p>
                <p className={`text-sm truncate ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                }`}>{track.artist}</p>
              </div>

              {/* Duration & Play Button */}
              <div className="flex items-center gap-3">
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                }`}>
                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                </span>
                <button className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-indigo-500/30 hover:scale-110">
                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MusicLibrary;
