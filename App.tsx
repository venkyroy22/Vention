
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser, useClerk } from '@clerk/clerk-react';
import { User, UserStatus, Message } from './types';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import ProductivityPanel from './components/ProductivityPanel';
import WorkspaceNotes from './components/WorkspaceNotes';
import ShareModal from './components/ShareModal';
import Profile from './components/Profile';
import Auth from './components/Auth';
import FindFriends from './components/FindFriends';
import TestLogin from './components/TestLogin';
import { AuthAPI, UsersAPI, MessagesAPI, setAuthToken } from './api';
import { FriendsAPI } from './api/friends.ts';
import { useTheme } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

const AppContent: React.FC = () => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { theme } = useTheme();
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(null);

  const [contacts, setContacts] = useState<User[]>([]);
  const [activeView, setActiveView] = useState<'notes' | 'chat' | 'tasks' | 'calculator' | 'whiteboard'>(() => {
    const saved = localStorage.getItem('vention_activeView');
    return (saved as any) || 'notes';
  });
  const [selectedFriend, setSelectedFriend] = useState<User | null>(() => {
    const saved = localStorage.getItem('vention_selectedFriend');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const socketRef = useRef<Socket | null>(null);
  const isLoadingContacts = useRef(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMuted, setIsMuted] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Share Modal State
  const [shareData, setShareData] = useState<{ type: Message['type'], id: string, title: string } | null>(null);
  const [showFindFriends, setShowFindFriends] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('vention_activeView', activeView);
  }, [activeView]);

  useEffect(() => {
    if (selectedFriend) {
      localStorage.setItem('vention_selectedFriend', JSON.stringify(selectedFriend));
    } else {
      localStorage.removeItem('vention_selectedFriend');
    }
  }, [selectedFriend]);

  // Initialize Clerk user or test user (for development)
  useEffect(() => {
    const initUser = async () => {
      // Try Clerk first
      if (isLoaded && clerkUser) {
        const clerkToken = clerkUser.id; // Clerk user ID as token
        
        // Sync Clerk user to database and get MongoDB _id
        let mongoUserId = clerkUser.id; // fallback to clerkId
        let userAvatar = clerkUser.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clerkUser.id}`;
        try {
          const response = await fetch(`${API_BASE}/api/users/sync-clerk-user`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${clerkToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clerkId: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              name: clerkUser.firstName || clerkUser.username || 'User',
              avatar: userAvatar,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            mongoUserId = data.user?.id || clerkUser.id; // Use MongoDB _id from response
            userAvatar = data.user?.avatar || userAvatar; // Use database avatar if available
            const userName = data.user?.name || clerkUser.firstName || clerkUser.username || 'User'; // Use database name if available
            
            setCurrentUser({
              id: mongoUserId,
              clerkId: clerkToken,
              name: userName,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              avatar: userAvatar,
              status: 'online',
              lastSeen: Date.now(),
            } as User);
            setAuthToken(clerkToken);
            setAuthTokenState(clerkToken);
            fetchContacts();
            return;
          } else {
            console.error('Failed to sync Clerk user:', await response.text());
          }
        } catch (err) {
          console.error('Error syncing Clerk user:', err);
        }
        
        // Fallback if sync failed
        setCurrentUser({
          id: mongoUserId,
          clerkId: clerkToken,
          name: clerkUser.firstName || clerkUser.username || 'User',
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          avatar: userAvatar,
          status: 'online',
          lastSeen: Date.now(),
        } as User);
        setAuthToken(clerkToken);
        setAuthTokenState(clerkToken);
        fetchContacts();
      } else if (isLoaded && !clerkUser && import.meta.env.DEV) {
        // For development testing, check if there's a test token in localStorage
        const testToken = localStorage.getItem('vention_test_token');
        if (testToken) {
          // Fetch the test user from the debug endpoint
          (async () => {
            try {
              const response = await fetch(`${API_BASE}/api/debug/users`);
              const { users } = await response.json();
              const testUser = users.find((u: any) => u.clerkId === testToken);
              if (testUser) {
                setCurrentUser({
                  id: testUser._id,
                  clerkId: testUser.clerkId,
                  name: testUser.name,
                  email: testUser.email,
                  avatar: testUser.avatar,
                  status: 'online',
                  lastSeen: Date.now(),
                } as User);
                setAuthToken(testToken);
                setAuthTokenState(testToken);
                fetchContacts();
              }
            } catch (err) {
              console.error('Failed to load test user:', err);
            }
          })();
        }
      }
    };
    
    initUser();
  }, [isLoaded, clerkUser]);

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!currentUser) return;
      try {
        await fetchContacts();
      } catch (err) {
        console.error('Failed to load contacts:', err);
      }
    };
    bootstrapSession();
  }, []);

  const fetchContacts = async () => {
    if (isLoadingContacts.current) return;
    isLoadingContacts.current = true;
    try {
      const { friends } = await FriendsAPI.accepted();
      setContacts(friends as User[]);
      
      // If selectedFriend was already restored from localStorage, update it with fresh data
      setSelectedFriend(prev => {
        if (prev) {
          const updated = (friends as User[]).find(c => c.id === prev.id);
          if (updated) {
            return updated;
          }
        }
        return prev;
      });
      
      // Load messages for currently selected friend if one is selected
      setTimeout(() => {
        setSelectedFriend(current => {
          if (current) {
            MessagesAPI.list(current.id)
              .then(({ messages: payload }) => {
                setMessages(prev => ({ ...prev, [current.id]: payload }));
              })
              .catch(err => console.error('Failed to load conversation', err));
          }
          return current;
        });
      }, 0);
    } catch (err) {
      console.error('Failed to load contacts', err);
    } finally {
      isLoadingContacts.current = false;
    }
  };

  // Removed - using Clerk authentication only

  const handleLogout = async () => {
    // Clear all tokens and localStorage
    setAuthToken(undefined); // This clears vention_token from localStorage
    localStorage.removeItem('vention_token');
    localStorage.removeItem('vention_test_token');
    localStorage.removeItem('vention_activeView');
    localStorage.removeItem('vention_selectedFriend');
    
    // Clear state
    setCurrentUser(null);
    setAuthTokenState(null);
    setContacts([]);
    setMessages({});
    setSelectedFriend(null);
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Sign out from Clerk
    await signOut();
    // Redirect to sign-out is handled by Clerk
  };

  const playSound = useCallback((type: 'sent' | 'received') => {
    if (isMuted) return;
    const audio = new Audio();
    audio.src = type === 'sent' 
      ? 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'
      : 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
    audio.volume = 0.1;
    audio.play().catch(() => {});
  }, [isMuted]);

  const handleSendMessageToTarget = async (targetUserId: string, text: string, type: Message['type'] = 'text', attachmentId?: string, options?: { replyToId?: string; imageUrl?: string }) => {
    if (!currentUser) return;
    try {
      console.log('App sending:', { to: targetUserId, text, type, attachmentId, replyToId: options?.replyToId, imageUrl: options?.imageUrl });
      const { message } = await MessagesAPI.send({ to: targetUserId, text, type, attachmentId, replyToId: options?.replyToId, imageUrl: options?.imageUrl });
      console.log('Received message from API:', message);
      setMessages(prev => ({
        ...prev,
        [targetUserId]: [...(prev[targetUserId] || []).filter(m => m.id !== message.id), message],
      }));
      playSound('sent');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleSendMessage = (text: string, type: Message['type'] = 'text', attachmentId?: string, options?: { replyToId?: string; imageUrl?: string }) => {
    if (!selectedFriend) return;
    handleSendMessageToTarget(selectedFriend.id, text, type, attachmentId, options);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedFriend) return;
    try {
      await MessagesAPI.delete(messageId);
      setMessages(prev => ({
        ...prev,
        [selectedFriend.id]: prev[selectedFriend.id].filter(m => m.id !== messageId)
      }));
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    if (!selectedFriend) return;
    MessagesAPI.edit(messageId, newText).catch((err) => console.error('Edit failed', err));
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!selectedFriend) return;
    MessagesAPI.react(messageId, emoji).catch((err) => console.error('Reaction failed', err));
  };

  const formatLastSeen = (lastSeen?: number | string) => {
    if (!lastSeen) return 'Recently active';
    const timestamp = typeof lastSeen === 'string' ? new Date(lastSeen).getTime() : lastSeen;
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const selectChat = (friend: User) => {
    setSelectedFriend(friend);
    setActiveView('chat');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    MessagesAPI.list(friend.id)
      .then(({ messages: payload }) => {
        setMessages(prev => ({ ...prev, [friend.id]: payload }));
        // Mark as read any messages from this friend
        MessagesAPI.markRead(friend.id).catch(() => {});
      })
      .catch(err => console.error('Failed to load conversation', err));
  };

  const handleMessagesClick = () => {
    setSelectedFriend(null);
    setActiveView('chat');
  };

  useEffect(() => {
    if (!currentUser?.id || !authToken) return;
    const socket = io(API_BASE, { auth: { token: authToken } });
    socketRef.current = socket;

    socket.on('message:new', (msg: Message) => {
      console.log('Frontend received message:new event:', msg);
      const otherId = msg.senderId === currentUser.id ? msg.recipientId : msg.senderId;
      if (!otherId) return;
      setMessages(prev => {
        const messages = prev[otherId] || [];
        const existingIdx = messages.findIndex(m => m.id === msg.id);
        if (existingIdx > -1) {
          // Update existing message in place (for reactions, edits, etc)
          const updated = [...messages];
          updated[existingIdx] = msg;
          return { ...prev, [otherId]: updated };
        } else {
          // New message, add to end
          return { ...prev, [otherId]: [...messages, msg] };
        }
      });
      if (msg.senderId !== currentUser.id) {
        playSound('received');
        // If viewing this conversation, immediately mark as read so status updates to Seen
        if (selectedFriend?.id === msg.senderId) {
          MessagesAPI.markRead(msg.senderId).catch(() => {});
        }
      }
    });

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].filter(m => m.id !== messageId);
        });
        return updated;
      });
    });

    socket.on('message:viewed', ({ messageId }: { messageId: string }) => {
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].map(m => 
            m.id === messageId ? { ...m, isViewed: true } : m
          );
        });
        return updated;
      });
    });

    socket.on('message:edited', (msg: Message) => {
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].map(m => 
            m.id === msg.id ? msg : m
          );
        });
        return updated;        return updated;
      });
    });

    socket.on('friend:request', () => {
      // New friend request received
    });

    socket.on('friend:accepted', () => {
      fetchContacts();
    });

    socket.on('friend:declined', () => {
      // Friend request declined
    });

    socket.on('user:status', ({ userId, status }: { userId: string; status: string }) => {
      setContacts(prev => 
        prev.map(contact => 
          contact.id === userId ? { ...contact, status: status as any } : contact
        )
      );
      // Also update selected friend if they're the one with status change
      if (selectedFriend?.id === userId) {
        setSelectedFriend(prev => prev ? { ...prev, status: status as any } : prev);
      }
    });

    socket.on('user:typing', ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      console.log('Received typing event:', { userId, isTyping, currentTypingUsers: typingUsers });
      setTypingUsers(prev => ({
        ...prev,
        [userId]: isTyping
      }));
    });

    socket.on('message:status', ({ messageId, status, statusUpdatedAt }: { messageId: string; status: Message['status']; statusUpdatedAt?: number }) => {
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].map(m => m.id === messageId ? { ...m, status, statusUpdatedAt: statusUpdatedAt || m.statusUpdatedAt || Date.now() } : m);
        });
        return updated;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id, authToken, playSound, API_BASE, selectedFriend?.id]);

  // Debug logging for typing users
  useEffect(() => {
    if (selectedFriend) {
      const lookupKey = selectedFriend.clerkId || selectedFriend.id;
      const isTyping = typingUsers[lookupKey] || false;
      console.log('Typing check:', { 
        friendName: selectedFriend.name,
        lookupKey, 
        friendClerkId: selectedFriend.clerkId,
        friendId: selectedFriend.id,
        isTyping, 
        allTypingUsers: typingUsers 
      });
    }
  }, [typingUsers, selectedFriend]);

  if (!currentUser) {
    return <div className="flex items-center justify-center h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className={`flex h-screen w-full text-white overflow-hidden font-inter selection:bg-indigo-500/30 transition-colors ${
      theme === 'dark' ? 'bg-[#050507]' : 'bg-slate-50'
    }`}>
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full animate-pulse ${
          theme === 'dark' ? 'bg-indigo-600/10 blur-[140px]' : 'bg-indigo-300/20 blur-[140px]'
        }`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full animate-pulse ${
          theme === 'dark' ? 'bg-purple-600/10 blur-[140px]' : 'bg-purple-300/20 blur-[140px]'
        }`} style={{ animationDelay: '2s' }}></div>
      </div>

      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        friends={contacts}
        selectedFriend={selectedFriend}
        onSelectFriend={selectChat}
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={(v) => {
          if (v === 'chat') handleMessagesClick();
          else setActiveView(v);
        }}
        onLogout={handleLogout}
        onShowProfile={() => setShowProfileModal(true)}
      />

      <main className="flex-1 flex flex-col relative z-10 overflow-hidden min-w-0">
        <header className={`h-16 flex items-center justify-between px-4 md:px-6 border-b shrink-0 transition-colors ${
          theme === 'dark'
            ? 'glass-dark border-white/5'
            : 'bg-white/50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg lg:hidden transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-white/5'
                  : 'hover:bg-slate-300'
              }`}
            >
              <svg className={`w-6 h-6 ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex flex-col">
              <h2 className={`font-outfit font-bold text-sm md:text-base tracking-tight leading-none ${
                theme === 'dark' ? 'text-zinc-100' : 'text-slate-900'
              }`}>
                {activeView === 'chat' 
                  ? (selectedFriend ? selectedFriend.name : 'Messages') 
                  : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
              </h2>
              {activeView === 'chat' && selectedFriend && (
                <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                  selectedFriend.status === UserStatus.ONLINE ? 'text-emerald-500' : 'text-zinc-500'
                }`}>
                  {selectedFriend.status === UserStatus.ONLINE ? 'Active Now' : `Last seen ${formatLastSeen(selectedFriend.lastSeen)}`}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-3">
            {activeView === 'chat' && !selectedFriend && (
              <button 
                onClick={() => setShowFindFriends(true)}
                className={`p-2 rounded-xl transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/5 text-zinc-400 hover:text-indigo-400'
                    : 'hover:bg-slate-300 text-slate-600 hover:text-indigo-600'
                }`}
                title="Find Friends"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </button>
            )}
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-white/5 text-zinc-400'
                  : 'hover:bg-slate-300 text-slate-600'
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              )}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col relative">
          {activeView === 'notes' && (
            <WorkspaceNotes 
              onShare={(id, title) => setShareData({ type: 'note', id, title })}
            />
          )}
          {activeView === 'chat' && (
            <>
              {selectedFriend ? (
                <ChatPanel 
                  messages={messages[selectedFriend.id] || []} 
                  onSendMessage={handleSendMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onReaction={handleReaction}
                  currentUser={currentUser}
                  selectedFriend={selectedFriend}
                  socket={socketRef.current}
                  isTyping={typingUsers[selectedFriend.clerkId || selectedFriend.id] || false}
                  onBack={() => setSelectedFriend(null)}
                />
              ) : (
                <div className={`flex-1 flex flex-col p-6 md:p-12 overflow-y-auto ${
                  theme === 'dark' ? 'bg-[#0c0c0e]' : 'bg-white'
                }`}>
                  <div className="max-w-5xl mx-auto w-full space-y-8">
                    <div className="flex flex-col gap-2">
                      <h1 className={`text-4xl font-outfit font-black tracking-tighter ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`}>Messages</h1>
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                      }`}>Select a contact to start a conversation</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {contacts.length === 0 && (
                        <div className={`col-span-full p-6 rounded-3xl border text-center ${
                          theme === 'dark'
                            ? 'border-white/5 bg-white/5 text-zinc-500'
                            : 'border-slate-300 bg-slate-100 text-slate-600'
                        }`}>
                          No users found. Once other users register, they will appear here.
                        </div>
                      )}
                      {contacts.map(user => (
                        <button 
                          key={user.id}
                          onClick={() => selectChat(user)}
                          className={`flex items-center gap-4 p-5 rounded-[32px] border transition-all group text-left relative overflow-hidden ${
                            theme === 'dark'
                              ? 'glass-dark border-white/5 hover:border-indigo-500/40 hover:bg-white/[0.04]'
                              : 'bg-slate-100 border-slate-300 hover:border-indigo-400 hover:bg-slate-200'
                          }`}
                        >
                          <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity ${
                            theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-300/30'
                          }`} />
                          <div className="relative shrink-0">
                            <img src={user.avatar} className={`w-14 h-14 rounded-2xl object-cover border group-hover:scale-105 transition-transform ${
                              theme === 'dark' ? 'border-white/10' : 'border-slate-400'
                            }`} alt={user.name} />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] ${
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
                              {user.status === UserStatus.ONLINE ? 'Online now' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                            </p>
                          </div>
                          <div className={`p-2 rounded-xl transition-all ${
                            theme === 'dark'
                              ? 'bg-white/5 text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10'
                              : 'bg-slate-300 text-slate-600 group-hover:text-indigo-600 group-hover:bg-indigo-200'
                          }`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {(activeView === 'tasks' || activeView === 'calculator' || activeView === 'whiteboard') && (
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden w-full">
               <ProductivityPanel 
                  isEmbedded={true}
                  defaultTab={activeView}
                  onShare={(type, id, title) => setShareData({ type, id, title })}
                />
            </div>
          )}
        </div>
      </main>

      {/* Share Modal Integration */}
      {shareData && (
        <ShareModal 
          isOpen={!!shareData}
          onClose={() => setShareData(null)}
          contacts={contacts}
          onSelectContact={(user) => {
            handleSendMessageToTarget(user.id, `Shared ${shareData.type}: ${shareData.title}`, shareData.type, shareData.id);
            setShareData(null);
            // Optional: Redirect to chat to see the sent message
            selectChat(user);
          }}
          title={`Share ${shareData.type}`}
        />
      )}

      {/* Find Friends Modal */}
      <FindFriends 
        isOpen={showFindFriends}
        onClose={() => setShowFindFriends(false)}
        onRefreshContacts={fetchContacts}
      />

      {/* Profile Modal */}
      {showProfileModal && currentUser && (
        <Profile 
          currentUser={currentUser}
          onClose={() => setShowProfileModal(false)}
          onUserUpdate={(user) => setCurrentUser(user)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const { theme } = useTheme();
  
  return (
    <div className={`flex h-screen overflow-hidden ${
      theme === 'dark' ? 'bg-black' : 'bg-white'
    }`}>
      <SignedOut>
        <div className="flex flex-col items-center justify-center h-screen w-full p-4">
          <RedirectToSignIn />
          <TestLogin onLoginSuccess={() => {}} />
        </div>
      </SignedOut>
      <SignedIn>
        <AppContent />
      </SignedIn>
    </div>
  );
};

const RootApp = () => {
  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  if (!clerkPublishableKey) {
    console.error('Missing VITE_CLERK_PUBLISHABLE_KEY');
    return <div>Missing Clerk configuration</div>;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <App />
    </ClerkProvider>
  );
};

export default RootApp;
