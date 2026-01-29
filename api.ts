import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: `${API_BASE}` });

export const setAuthToken = (token?: string) => {
  if (token) {
    localStorage.setItem('vention_token', token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('vention_token');
    delete api.defaults.headers.common.Authorization;
  }
};

const getToken = () => localStorage.getItem('vention_token');
const stored = getToken();
if (stored) setAuthToken(stored);

export const AuthAPI = {
  register: (payload: { name: string; email: string; password: string; avatar?: string }) =>
    api.post('/api/auth/register', payload).then(r => r.data),
  login: (payload: { email: string; password: string }) =>
    api.post('/api/auth/login', payload).then(r => r.data),
  me: () => api.get('/api/auth/me').then(r => r.data),
};

export const UsersAPI = {
  list: () => api.get('/api/users').then(r => r.data),
};

export const MessagesAPI = {
  list: (userId: string) => api.get(`/api/messages/${userId}`).then(r => r.data),
  send: (payload: { to: string; text: string; type?: string; attachmentId?: string; replyToId?: string; imageUrl?: string }) => api.post('/api/messages', payload).then(r => r.data),
  edit: (messageId: string, text: string) => api.put(`/api/messages/${messageId}`, { text }).then(r => r.data),
  react: (messageId: string, emoji: string) => api.post(`/api/messages/${messageId}/reaction`, { emoji }).then(r => r.data),
  delete: (messageId: string) => api.delete(`/api/messages/${messageId}`).then(r => r.data),
  markRead: (userId: string) => api.post(`/api/messages/${userId}/read`, {}).then(r => r.data),
  viewOnce: (messageId: string) => api.post(`/api/messages/${messageId}/view-once`, {}).then(r => r.data),
};

export const NotesAPI = {
  list: () => api.get('/api/notes').then(r => r.data),
  create: (payload: { title: string; content: string; color?: string }) => api.post('/api/notes', payload).then(r => r.data),
  update: (id: string, payload: { title?: string; content?: string; color?: string }) => api.put(`/api/notes/${id}`, payload).then(r => r.data),
  remove: (id: string) => api.delete(`/api/notes/${id}`).then(r => r.data),
};

export const TasksAPI = {
  list: () => api.get('/api/tasks').then(r => r.data),
  create: (payload: { title: string; priority?: 'low' | 'medium' | 'high'; dueDate?: string }) => api.post('/api/tasks', payload).then(r => r.data),
  update: (id: string, payload: { title?: string; completed?: boolean; priority?: 'low' | 'medium' | 'high'; dueDate?: string }) => api.put(`/api/tasks/${id}`, payload).then(r => r.data),
  remove: (id: string) => api.delete(`/api/tasks/${id}`).then(r => r.data),
};

export default api;
