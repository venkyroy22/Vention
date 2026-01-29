import React, { useState } from 'react';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';
import { UsersAPI } from '../api';

interface ProfileProps {
  currentUser: User;
  onClose: () => void;
  onUserUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ currentUser, onClose, onUserUpdate }) => {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(currentUser.avatar);
  const [editedName, setEditedName] = useState(currentUser.name);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const handleUpdateProfileImage = async () => {
    if (!profileImageUrl.trim()) {
      setError('Please enter an image URL');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/update-avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vention_token')}`
        },
        body: JSON.stringify({ avatar: profileImageUrl })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update avatar');
      }
      
      const data = await response.json();
      onUserUpdate(data.user);
      setSuccess('Profile picture updated successfully!');
      setIsEditing(false);
      setProfileImageUrl(data.user.avatar);
      setImageLoadFailed(false);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/update-name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vention_token')}`
        },
        body: JSON.stringify({ name: editedName })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update name');
      }
      
      const data = await response.json();
      onUserUpdate(data.user);
      setSuccess('Name updated successfully!');
      setIsEditingName(false);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${
      theme === 'dark' ? 'bg-black/50' : 'bg-white/50'
    }`}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`w-full max-w-md rounded-3xl shadow-2xl ${
          theme === 'dark' ? 'bg-zinc-900 border border-white/10' : 'bg-white border border-slate-200'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-white/10' : 'border-slate-200'
          }`}>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>Profile Settings</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-all ${
                theme === 'dark' 
                  ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4">
              {profileImageUrl && !imageLoadFailed ? (
                <img 
                  src={profileImageUrl} 
                  alt={currentUser.name}
                  onError={() => setImageLoadFailed(true)}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-purple-500/20 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 border-4 border-purple-500/20 shadow-lg flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className="text-center">
                <p className={`text-lg font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>{currentUser.name}</p>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                }`}>{currentUser.email}</p>
              </div>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {success}
              </div>
            )}

            {/* Profile Picture Update */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`font-semibold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Update Profile Picture</h3>
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="Enter image URL"
                    value={profileImageUrl}
                    onChange={(e) => setProfileImageUrl(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-zinc-800 border-white/10 text-white placeholder-zinc-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateProfileImage}
                      disabled={loading}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        loading
                          ? 'opacity-50 cursor-not-allowed'
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {loading ? 'Updating...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        theme === 'dark'
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-medium transition-all text-sm border border-purple-500/20"
                >
                  Change Picture
                </button>
              )}
            </div>

            {/* Edit Name */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h3 className={`font-semibold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Edit Name</h3>
              {isEditingName ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      theme === 'dark'
                        ? 'bg-zinc-800 border-white/10 text-white placeholder-zinc-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateName}
                      disabled={loading}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        loading
                          ? 'opacity-50 cursor-not-allowed'
                          : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                      }`}
                    >
                      {loading ? 'Updating...' : 'Update'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(currentUser.name);
                      }}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                        theme === 'dark'
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="w-full px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium transition-all text-sm border border-indigo-500/20"
                >
                  Edit Name
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
