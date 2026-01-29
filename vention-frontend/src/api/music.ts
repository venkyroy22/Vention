import axios from 'axios';

const MUSIC_API_BASE = 'https://api.musicapi.com';
const CLIENT_ID = 'c9d5a337-af80-4a1d-85de-471a5a418664';
const CLIENT_SECRET = '856e6f72-f4f0-428a-8d2c-d7d8c884324d';

// Create axios instance with Client ID authentication (for public endpoints)
const musicApi = axios.create({
  baseURL: MUSIC_API_BASE,
  headers: {
    'Authorization': `Token ${CLIENT_ID}`
  }
});

// Create axios instance with Client Secret authentication (for private endpoints)
const musicApiPrivate = axios.create({
  baseURL: MUSIC_API_BASE,
  headers: {
    'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
  }
});

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverUrl?: string;
  audioUrl?: string;
  previewUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  coverUrl?: string;
}

export interface SearchResult {
  tracks: Track[];
  albums: any[];
  artists: any[];
  playlists: Playlist[];
}

export const MusicAPI = {
  // Search for music
  search: async (query: string): Promise<SearchResult> => {
    try {
      const response = await musicApi.get('/public/search/introspection', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Music search failed:', error);
      throw error;
    }
  },

  // Get track details
  getTrack: async (trackId: string): Promise<Track> => {
    try {
      const response = await musicApi.get(`/public/tracks/${trackId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get track:', error);
      throw error;
    }
  },

  // Get featured/trending tracks
  getFeatured: async (): Promise<Track[]> => {
    try {
      const response = await musicApi.get('/public/featured');
      return response.data.tracks || [];
    } catch (error) {
      console.error('Failed to get featured tracks:', error);
      return [];
    }
  },

  // Get user's playlists (requires private auth)
  getPlaylists: async (): Promise<Playlist[]> => {
    try {
      const response = await musicApiPrivate.get('/playlists');
      return response.data.playlists || [];
    } catch (error) {
      console.error('Failed to get playlists:', error);
      return [];
    }
  },

  // Create playlist (requires private auth)
  createPlaylist: async (name: string): Promise<Playlist> => {
    try {
      const response = await musicApiPrivate.post('/playlists', { name });
      return response.data;
    } catch (error) {
      console.error('Failed to create playlist:', error);
      throw error;
    }
  },

  // Add track to playlist (requires private auth)
  addToPlaylist: async (playlistId: string, trackId: string): Promise<void> => {
    try {
      await musicApiPrivate.post(`/playlists/${playlistId}/tracks`, { trackId });
    } catch (error) {
      console.error('Failed to add track to playlist:', error);
      throw error;
    }
  }
};

export default MusicAPI;
