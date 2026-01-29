import React, { useState, useEffect } from 'react';
import { User, UserStatus } from '../types';
import { UsersAPI } from '../api';
import { FriendsAPI } from '../api/friends.ts';
import { useTheme } from '../context/ThemeContext';

interface UserWithRequest extends User {
  friendRequest?: {
    status: 'pending' | 'accepted' | 'declined';
    requestId: string;
    isSentByMe: boolean;
  } | null;
}

interface FindFriendsProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshContacts: () => void;
}

const FindFriends: React.FC<FindFriendsProps> = ({ isOpen, onClose, onRefreshContacts }) => {
  const { theme } = useTheme();
  const [users, setUsers] = useState<UserWithRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { users: allUsers } = await UsersAPI.list();
      setUsers(allUsers as UserWithRequest[]);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await FriendsAPI.sendRequest(userId);
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to send request', err);
      alert(err.response?.data?.message || 'Failed to send request');
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await FriendsAPI.accept(requestId);
      await loadUsers();
      onRefreshContacts();
    } catch (err) {
      console.error('Failed to accept request', err);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await FriendsAPI.decline(requestId);
      await loadUsers();
    } catch (err) {
      console.error('Failed to decline request', err);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className={`absolute inset-0 backdrop-blur-md animate-fade-in ${
        theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
      }`} onClick={onClose} />
      
      <div className={`relative w-full max-w-2xl max-h-[80vh] border rounded-[40px] shadow-2xl overflow-hidden animate-slide-in flex flex-col transition-colors ${
        theme === 'dark'
          ? 'glass-dark border-white/10'
          : 'bg-white border-slate-300'
      }`}>
        <div className={`p-8 border-b shrink-0 transition-colors ${
          theme === 'dark' ? 'border-white/5' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h3 className={`text-2xl font-outfit font-black tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Find Friends</h3>
              <p className={`text-xs font-black uppercase tracking-widest ${
                theme === 'dark' ? 'text-zinc-500' : 'text-slate-500'
              }`}>Connect with people</p>
            </div>
            <button 
              onClick={onClose}
              className={`p-3 rounded-2xl transition-colors ${
                theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10 text-zinc-400'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className={`w-full border rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 transition-all text-sm font-medium ${
              theme === 'dark'
                ? 'bg-white/5 border-white/5 text-white placeholder:text-zinc-700'
                : 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-500'
            }`}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide">
          {loading && (
            <div className={`p-6 text-center ${
              theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
            }`}>Loading...</div>
          )}
          
          {!loading && filteredUsers.length === 0 && (
            <div className={`p-6 text-center ${
              theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
            }`}>
              {searchQuery ? 'No users found' : 'No users available'}
            </div>
          )}

          {!loading && filteredUsers.map((user) => {
            const fr = user.friendRequest;
            const isAccepted = fr?.status === 'accepted';
            const isPending = fr?.status === 'pending';
            const isSentByMe = fr?.isSentByMe;
            const isReceivedByMe = isPending && !isSentByMe;

            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 p-4 rounded-[24px] border transition-all ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/5 hover:bg-white/[0.06]'
                    : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <div className="relative shrink-0">
                  <img src={user.avatar} className={`w-12 h-12 rounded-2xl object-cover border ${
                    theme === 'dark' ? 'border-white/10' : 'border-slate-400'
                  }`} alt={user.name} />
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] ${
                    user.status === UserStatus.ONLINE ? 'bg-emerald-500' : 'bg-zinc-600'
                  } ${theme === 'dark' ? 'border-[#0c0c0e]' : 'border-white'}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-bold tracking-tight truncate ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>{user.name}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                    user.status === UserStatus.ONLINE 
                      ? 'text-emerald-500' 
                      : theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                  }`}>
                    {user.status === UserStatus.ONLINE ? 'Online now' : 'Offline'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isAccepted && (
                    <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider">
                      Friends
                    </span>
                  )}
                  
                  {isPending && isSentByMe && (
                    <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-xl text-xs font-bold uppercase tracking-wider">
                      Pending
                    </span>
                  )}

                  {isReceivedByMe && (
                    <>
                      <button
                        onClick={() => handleAccept(fr.requestId)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(fr.requestId)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </>
                  )}

                  {!fr && (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FindFriends;