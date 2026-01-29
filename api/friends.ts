import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: `${API_BASE}` });

// Use the same token management as main api
const getToken = () => localStorage.getItem('vention_token');
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const FriendsAPI = {
  list: () => api.get('/api/friends/accepted').then(r => r.data),
  sendRequest: (userId: string) => api.post('/api/friends/request', { to: userId }).then(r => r.data),
  acceptRequest: (requestId: string) => api.post('/api/friends/accept', { requestId }).then(r => r.data),
  declineRequest: (requestId: string) => api.post('/api/friends/decline', { requestId }).then(r => r.data),
  remove: (userId: string) => api.delete(`/api/friends/${userId}`).then(r => r.data),
  getPendingRequests: () => api.get('/api/friends/requests').then(r => r.data),
  // Aliases
  accept: (requestId: string) => api.post('/api/friends/accept', { requestId }).then(r => r.data),
  decline: (requestId: string) => api.post('/api/friends/decline', { requestId }).then(r => r.data),
  accepted: () => api.get('/api/friends/accepted').then(r => r.data),
};
