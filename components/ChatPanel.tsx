
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message, User, Note, Task } from '../types';
import { Socket } from 'socket.io-client';
import { useTheme } from '../context/ThemeContext';

const EMOJI_CATEGORIES = [
  { label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'] },
  { label: 'Gestures', emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🙏'] },
  { label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'] },
  { label: 'Work', emojis: ['💻', '🖥️', '⌨️', '🖱️', '🖨️', '📁', '📂', '📅', '📝', '📌', '📍', '📎', '📏', '📐', '📊', '📈', '📉', '💼'] },
];

const REACTION_QUICK_LIST = ['❤️', '👍', '🔥', '😂', '😮', '🙌'];

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string, type?: Message['type'], attachmentId?: string, options?: { replyToId?: string }) => void;
  onDeleteMessage: (id: string) => void;
  onEditMessage: (id: string, newText: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  currentUser: User;
  selectedFriend: User | null;
  socket: Socket | null;
  isTyping: boolean;
  onBack?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  onDeleteMessage,
  onEditMessage,
  onReaction,
  currentUser, 
  selectedFriend,
  socket,
  isTyping,
  onBack 
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingViewOnceImage, setPendingViewOnceImage] = useState<string | null>(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [viewingObject, setViewingObject] = useState<{
    type: 'note' | 'task' | 'drawing',
    title: string,
    content: string,
    meta?: any
  } | null>(null);
  const [reactionsModalMsgId, setReactionsModalMsgId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const { theme } = useTheme();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingSentRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; id: string } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Force periodic re-render to update relative status timestamps
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Keep typing indicator visible by scrolling to bottom when it toggles
  useEffect(() => {
    if (isTyping && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isTyping]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
      if (reactionPickerMsgId && !(event.target as HTMLElement).closest('.reaction-trigger')) {
        setReactionPickerMsgId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [reactionPickerMsgId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there's a pending view-once image
    if (pendingViewOnceImage) {
      onSendMessage('📷 View Once Photo', 'view-once-image', undefined, { imageUrl: pendingViewOnceImage });
      setPendingViewOnceImage(null);
      setInputText('');
      setShowEmojiPicker(false);
      setReplyToMessage(null);
      
      // Stop typing indicator
      if (socket && selectedFriend) {
        const recipientClerkId = selectedFriend.clerkId || selectedFriend.id;
        socket.emit('typing', { recipientId: recipientClerkId, isTyping: false });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingSentRef.current = false;
      return;
    }
    
    console.log('Form submitted. Input text:', inputText, 'Reply to:', replyToMessage);
    if (inputText.trim()) {
      console.log('Sending message with reply:', replyToMessage ? { replyToId: replyToMessage.id, text: replyToMessage.text } : 'none');
      onSendMessage(inputText, 'text', undefined, replyToMessage ? { replyToId: replyToMessage.id } : undefined);
      setInputText('');
      setShowEmojiPicker(false);
      setReplyToMessage(null);
      // Stop typing indicator when message is sent
      if (socket && selectedFriend) {
        const recipientClerkId = selectedFriend.clerkId || selectedFriend.id;
        socket.emit('typing', { recipientId: recipientClerkId, isTyping: false });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingSentRef.current = false;
    } else {
      console.log('Form submitted but input is empty, ignoring');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Emit typing indicator - use clerkId for recipient
    if (socket && selectedFriend) {
      const recipientClerkId = selectedFriend.clerkId || selectedFriend.id;
      if (!isTypingSentRef.current) {
        socket.emit('typing', { recipientId: recipientClerkId, isTyping: true });
        isTypingSentRef.current = true;
      }

      // Reset inactivity timer (always stop after inactivity regardless of content)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { recipientId: recipientClerkId, isTyping: false });
        isTypingSentRef.current = false;
        typingTimeoutRef.current = null;
      }, 1500);
    }
  };

  const handleViewOnceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      alert('Image size must be less than 10MB. Please select a smaller image.');
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);
    setShowPlusMenu(false);

    try {
      // Convert image to base64
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      reader.onload = (event) => {
        const base64Image = event.target?.result as string;
        setPendingViewOnceImage(base64Image);
        setInputText('📷 View Once Photo (ready to send)');
        setUploadingImage(false);
        setUploadProgress(100);
      };
      
      reader.onerror = () => {
        alert('Failed to read image');
        setUploadingImage(false);
        setUploadProgress(0);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image');
      setUploadingImage(false);
      setUploadProgress(0);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenCamera = async () => {
    try {
      setShowPlusMenu(false);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setCameraStream(stream);
      setShowCameraCapture(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Failed to access camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    
    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    // Set as pending view once image
    setPendingViewOnceImage(base64Image);
    setInputText('📷 View Once Photo (ready to send)');
    setShowCameraCapture(false);
  };

  const handleCloseCameraCapture = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraCapture(false);
  };

  const handleCancelViewOnce = () => {
    setPendingViewOnceImage(null);
    setInputText('');
  };

  // Ensure typing stops on blur/unmount or when switching chats
  useEffect(() => {
    return () => {
      if (socket && selectedFriend && isTypingSentRef.current) {
        const recipientClerkId = selectedFriend.clerkId || selectedFriend.id;
        socket.emit('typing', { recipientId: recipientClerkId, isTyping: false });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      isTypingSentRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFriend]);

  // Keyboard shortcuts: Shift+R to reply to the latest message from the other user; Esc cancels reply
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingMessageId) return; // ignore while editing
      if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        const lastOther = [...messages].reverse().find(m => m.senderId !== currentUser.id);
        if (lastOther) {
          setReplyToMessage(lastOther);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      } else if (e.key === 'Escape') {
        if (replyToMessage) {
          setReplyToMessage(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUser.id, replyToMessage, editingMessageId]);

  const lastMyMessageIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].senderId === currentUser.id) return i;
    }
    return -1;
  }, [messages, currentUser.id]);

  const formatStatusText = (msg: Message) => {
    const label = msg.status === 'read' ? 'Seen' : msg.status === 'delivered' ? 'Delivered' : 'Sent';
    const reference = msg.statusUpdatedAt || msg.timestamp;
    const diffMs = nowTick - reference;
    const secs = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffMs / 60000);

    if (secs < 5) return `${label} Just now`;
    if (secs < 60) return `${label} ${secs}s ago`;
    if (mins < 60) return `${label} ${mins}m ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${label} ${hrs}hr${hrs === 1 ? '' : 's'} ago`;

    const days = Math.floor(hrs / 24);
    return `${label} ${days}d ago`;
  };

  const handleEditSubmit = (id: string) => {
    if (editBuffer.trim()) {
      onEditMessage(id, editBuffer);
    }
    setEditingMessageId(null);
    setEditBuffer('');
  };

  const addEmoji = (emoji: string) => {
    if (editingMessageId) {
      setEditBuffer(prev => prev + emoji);
    } else {
      setInputText(prev => prev + emoji);
      inputRef.current?.focus();
    }
  };

  const handleOpenObject = (msg: Message) => {
    if (msg.type === 'note') {
      setViewingObject({
        type: 'note',
        title: msg.text.split(': ')[1] || 'Shared Note',
        content: 'Open this note from the owner workspace to see full content.'
      });
    } else if (msg.type === 'task') {
      setViewingObject({
        type: 'task',
        title: msg.text.split(': ')[1] || 'Shared Task',
        content: '',
        meta: { completed: false, priority: 'medium' }
      });
    } else if (msg.type === 'drawing') {
      setViewingObject({
        type: 'drawing',
        title: msg.text.split(': ')[1] || 'Shared Drawing',
        content: msg.attachmentId || ''
      });
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 transition-colors ${
      theme === 'dark' ? 'bg-[#0c0c0e]' : 'bg-white'
    }`}>
      {/* Thread Sub-Header */}
      <div className={`px-6 py-3 flex items-center gap-4 shrink-0 transition-colors ${
        theme === 'dark' 
          ? 'border-b border-white/5 bg-black/20 backdrop-blur-md' 
          : 'border-b border-slate-200 bg-slate-50/50 backdrop-blur-md'
      }`}>
        <button 
          onClick={onBack}
          className={`p-2 rounded-xl transition-all flex items-center gap-2 ${
            theme === 'dark'
              ? 'hover:bg-white/5 text-zinc-500 hover:text-white'
              : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">All Contacts</span>
        </button>
        <div className={`w-px h-4 ${
          theme === 'dark' ? 'bg-white/10' : 'bg-slate-300'
        }`} />
        <div className="flex items-center gap-2">
           <img src={selectedFriend?.avatar} className="w-6 h-6 rounded-lg object-cover" alt="" />
           <span className={`text-xs font-black uppercase tracking-widest ${
             theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
           }`}>{selectedFriend?.name}</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-4 md:px-8 pt-6 ${isTyping ? 'pb-24 md:pb-28' : 'pb-6'} space-y-4 scrollbar-hide`}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-6 animate-pulse">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20" />
              <div className="relative w-24 h-24 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center backdrop-blur-xl">
                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className={`text-lg font-outfit font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Direct Message</p>
              <p className={`text-sm max-w-xs mx-auto leading-relaxed ${
                theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
              }`}>Secure, encrypted conversation with {selectedFriend?.name}. Start by saying hello!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === currentUser.id;
            const prevMsg = messages[idx - 1];
            const isGrouped = prevMsg && prevMsg.senderId === msg.senderId;
            const isEditing = editingMessageId === msg.id;
            const isLastMyMessage = isMe && idx === lastMyMessageIdx;

            return (
              <div 
                key={msg.id} 
                className={`flex w-full animate-slide-in ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-6'}`}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  touchStartRef.current = { x: t.clientX, y: t.clientY, id: msg.id };
                }}
                onTouchEnd={(e) => {
                  const start = touchStartRef.current;
                  if (!start || start.id !== msg.id) return;
                  const t = e.changedTouches[0];
                  const dx = t.clientX - start.x;
                  const dy = t.clientY - start.y;
                  // Swipe right with minimal vertical movement
                  if (dx > 60 && Math.abs(dy) < 40) {
                    setReplyToMessage(msg);
                    setTimeout(() => inputRef.current?.focus(), 0);
                  }
                  touchStartRef.current = null;
                }}
              >
                {/* Removed per design: redundant avatar near messages */}
                
                <div className={`flex flex-col max-w-[85%] md:max-w-[70%] group ${isMe ? 'items-end' : 'items-start'} relative`}>
                  {/* Message Actions Menu */}
                  {!isEditing && (
                    <div className={`
                      absolute -top-7 ${isMe ? 'right-0' : 'left-0'} 
                      flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 
                      p-1 rounded-xl z-20 shadow-2xl ${
                        theme === 'dark'
                          ? 'bg-zinc-900/90 backdrop-blur-md border border-white/10'
                          : 'bg-white border border-slate-200'
                      }
                    `}>
                      <button 
                        onClick={() => { setReplyToMessage(msg); setTimeout(() => inputRef.current?.focus(), 0); }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-white/10 text-zinc-400 hover:text-indigo-400'
                            : 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600'
                        }`}
                        title="Reply"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7l-5 5m0 0l5 5M2 12h11a7 7 0 017 7v1" /></svg>
                      </button>
                      <div className="relative reaction-trigger">
                        <button 
                          onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                          }`}
                          title="React"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                        {reactionPickerMsgId === msg.id && (
                          <div className={`absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 flex items-center gap-1 p-1.5 rounded-full shadow-2xl animate-slide-in z-50 ${
                            theme === 'dark'
                              ? 'bg-zinc-900 border border-white/10'
                              : 'bg-white border border-slate-200'
                          }`}>
                            {REACTION_QUICK_LIST.map(emoji => (
                              <button 
                                key={emoji}
                                onClick={() => { onReaction(msg.id, emoji); setReactionPickerMsgId(null); }}
                                className={`w-8 h-8 flex items-center justify-center rounded-full text-lg transition-transform hover:scale-125 ${
                                  theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {isMe && msg.type === 'text' && (
                        <button 
                          onClick={() => { setEditingMessageId(msg.id); setEditBuffer(msg.text); }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            theme === 'dark'
                              ? 'hover:bg-white/10 text-zinc-400 hover:text-indigo-400'
                              : 'hover:bg-slate-200 text-slate-500 hover:text-indigo-600'
                          }`}
                          title="Edit Message"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      <button 
                        onClick={() => onDeleteMessage(msg.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-red-500/20 text-zinc-400 hover:text-red-400'
                            : 'hover:bg-red-100 text-slate-500 hover:text-red-600'
                        }`}
                        title="Delete Message"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}

                  <div className={`
                    px-5 py-3 rounded-[24px] text-sm md:text-[15px] leading-relaxed shadow-xl transition-all relative
                    ${isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : theme === 'dark'
                        ? 'bg-zinc-800/60 text-zinc-100 rounded-tl-none border border-white/5 backdrop-blur-md'
                        : 'bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200'
                    }
                    ${msg.type !== 'text' ? 'ring-2 ring-indigo-500/40' : ''}
                    ${isEditing ? theme === 'dark' ? 'ring-2 ring-indigo-400 !bg-zinc-900/90' : 'ring-2 ring-indigo-400 !bg-slate-200' : ''}
                  `}>
                    {isEditing ? (
                      <div className="flex flex-col gap-3 min-w-[240px]">
                        <textarea 
                          autoFocus
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          className={`border outline-none rounded-xl p-3 text-sm resize-none w-full ${
                            theme === 'dark'
                              ? 'bg-white/5 text-white border-white/10 focus:border-indigo-500/50'
                              : 'bg-slate-200 text-slate-900 border-slate-300 focus:border-indigo-400'
                          }`}
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(msg.id); }
                            if (e.key === 'Escape') setEditingMessageId(null);
                          }}
                        />
                        <div className="flex justify-end items-center gap-3">
                          <button 
                            onClick={() => setEditingMessageId(null)} 
                            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleEditSubmit(msg.id)} 
                            className="px-4 py-1.5 bg-indigo-500 rounded-lg text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : msg.type === 'view-once-image' ? (
                      <div className="flex flex-col gap-3 py-1 min-w-[200px]">
                        <div className="flex items-center gap-2 text-indigo-200/80 font-black uppercase text-[10px] tracking-[0.2em]">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                          View Once Photo
                        </div>
                        {msg.isViewed ? (
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center text-zinc-500 text-sm">
                            Photo expired
                          </div>
                        ) : !isMe ? (
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/${msg.id}/view-once`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('vention_token')}`,
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.imageUrl) {
                                    // Create a new window with the image
                                    const newWindow = window.open('', '_blank');
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <!DOCTYPE html>
                                        <html>
                                          <head>
                                            <title>View Once Photo</title>
                                            <style>
                                              body {
                                                margin: 0;
                                                padding: 0;
                                                display: flex;
                                                justify-content: center;
                                                align-items: center;
                                                min-height: 100vh;
                                                background: #000;
                                              }
                                              img {
                                                max-width: 100%;
                                                max-height: 100vh;
                                                object-fit: contain;
                                              }
                                            </style>
                                          </head>
                                          <body>
                                            <img src="${data.imageUrl}" alt="View Once Photo" />
                                          </body>
                                        </html>
                                      `);
                                      newWindow.document.close();
                                    }
                                  }
                                } else {
                                  const error = await response.json();
                                  alert(error.message || 'Failed to view image');
                                }
                              } catch (error) {
                                console.error('Failed to view image:', error);
                                alert('Failed to view image');
                              }
                            }}
                            className="bg-indigo-500/20 hover:bg-indigo-500/30 p-4 rounded-2xl border border-indigo-500/30 transition-colors"
                          >
                            <div className="flex items-center justify-center gap-3">
                              <svg className="w-6 h-6 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="font-semibold text-white">Tap to view</span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-2">Photo will disappear after viewing</p>
                          </button>
                        ) : (
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-sm text-zinc-300">📷 View Once Photo sent</p>
                            <p className="text-xs text-zinc-500 mt-1">Recipient can view once</p>
                          </div>
                        )}
                      </div>
                    ) : msg.type === 'text' ? (
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          {msg.text}
                        </div>
                        {msg.isEdited && (
                          <span className="text-[11px] text-zinc-400 opacity-75 italic">
                            (edited)
                          </span>
                        )}
                        {msg.replyTo && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Replied to:</p>
                            <div className={`p-2 rounded-xl ${isMe ? 'bg-white/10 text-white/80' : 'bg-black/20 text-zinc-300'} border border-white/10`}>
                              <p className="text-xs break-words" title={msg.replyTo.text}>{msg.replyTo.text}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 py-1 min-w-[200px]">
                        <div className="flex items-center gap-2 text-indigo-200/80 font-black uppercase text-[10px] tracking-[0.2em]">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                          Vention {msg.type}
                        </div>
                        <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-6">
                           <div className="flex-1 overflow-hidden">
                              <p className="font-bold text-white mb-1 truncate">{msg.text.split(': ')[1] || msg.text}</p>
                              <p className="text-[11px] text-zinc-400 font-medium capitalize">Shared {msg.type}</p>
                           </div>
                           <button 
                             onClick={() => handleOpenObject(msg)}
                             className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                           </button>
                        </div>
                      </div>
                    )}

                    {/* Reactions Display - Stacked Emoji Style */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <button
                        onClick={() => setReactionsModalMsgId(msg.id)}
                        className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group border border-white/10"
                      >
                        <div className="flex -space-x-1.5">
                          {msg.reactions.slice(0, 3).map((r) => (
                            <div
                              key={r.emoji}
                              className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 border border-white/10 text-sm"
                              title={`${r.count} ${r.count === 1 ? 'reaction' : 'reactions'}`}
                            >
                              {r.emoji}
                            </div>
                          ))}
                          {msg.reactions.length > 3 && (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 border border-white/10 text-[9px] font-bold text-zinc-400">
                              +{msg.reactions.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          {msg.reactions.reduce((sum, r) => sum + r.count, 0)}
                        </span>
                      </button>
                    )}
                  </div>
                  {(!isGrouped || isLastMyMessage) && (
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-2 px-1 opacity-70 ${
                      theme === 'dark' ? 'text-zinc-500' : 'text-slate-500'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isLastMyMessage && ` · ${formatStatusText(msg)}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex w-full justify-start mt-4 animate-slide-in">
            <div className="flex items-center gap-3">
              <img src={selectedFriend?.avatar} className="w-8 h-8 rounded-xl shadow-lg" alt="" />
              <div className={`flex items-center gap-1.5 px-4 py-3 rounded-[20px] ${
                theme === 'dark'
                  ? 'bg-zinc-800/60 border border-white/5 backdrop-blur-md'
                  : 'bg-slate-100 border border-slate-200'
              }`}>
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '0ms', backgroundColor: theme === 'dark' ? '#9ca3af' : '#64748b' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '150ms', backgroundColor: theme === 'dark' ? '#9ca3af' : '#64748b' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ animationDelay: '300ms', backgroundColor: theme === 'dark' ? '#9ca3af' : '#64748b' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 lg:p-8 shrink-0 relative">
        {/* Emoji Picker Integration */}
        {showEmojiPicker && (
          <div 
            ref={pickerRef}
            className={`absolute bottom-[calc(100%-8px)] right-4 md:right-8 w-72 h-80 border rounded-[32px] shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in transition-colors ${
              theme === 'dark'
                ? 'glass-dark border-white/10'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className={`px-5 py-3 border-b flex items-center justify-between ${
              theme === 'dark'
                ? 'border-white/5 bg-white/[0.02]'
                : 'border-slate-200 bg-slate-50'
            }`}>
               <span className={`text-[10px] font-black uppercase tracking-widest ${
                 theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
               }`}>Emojis</span>
               <button 
                 onClick={() => setShowEmojiPicker(false)}
                 className={`${
                   theme === 'dark' ? 'text-zinc-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                 }`}
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide ${
              theme === 'dark' ? '' : 'bg-white'
            }`}>
              {EMOJI_CATEGORIES.map(cat => (
                <div key={cat.label} className="space-y-2">
                  <p className={`text-[9px] font-bold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-zinc-600' : 'text-slate-500'
                  }`}>{cat.label}</p>
                  <div className="grid grid-cols-6 gap-1">
                    {cat.emojis.map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form 
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto glass-dark border border-white/10 rounded-[32px] flex items-center gap-2 p-2 focus-within:ring-4 ring-indigo-500/10 transition-all shadow-2xl relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 pointer-events-none" />
          {replyToMessage && (
            <div className="absolute -top-16 left-0 right-0 mx-2 md:mx-6 flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-0.5">Replying to {replyToMessage.senderId === currentUser.id ? 'You' : selectedFriend?.name}</p>
                <p className="text-xs text-zinc-300 truncate">{replyToMessage.text}</p>
              </div>
              <button onClick={() => setReplyToMessage(null)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Cancel reply">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          {pendingViewOnceImage && (
            <div className="absolute -top-24 left-0 right-0 mx-2 md:mx-6 flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img src={pendingViewOnceImage} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest font-black text-indigo-400 mb-0.5">📷 View Once Photo</p>
                  <p className="text-xs text-zinc-300">Click send to share</p>
                  {uploadingImage && (
                    <div className="mt-1.5 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => {setPendingViewOnceImage(null); setInputText('');}} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Cancel photo">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <div className="relative" ref={plusMenuRef}>
            <button 
              type="button" 
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              disabled={uploadingImage}
              className={`p-3 rounded-2xl transition-colors shrink-0 ${
                uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                theme === 'dark'
                  ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              }`}
            >
              {uploadingImage ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              )}
            </button>
            {showPlusMenu && (
              <div className={`absolute bottom-full left-0 mb-2 w-48 rounded-2xl shadow-2xl overflow-hidden border animate-slide-in ${
                theme === 'dark'
                  ? 'glass-dark border-white/10'
                  : 'bg-white border-slate-200'
              }`}>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowPlusMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-white/10 text-zinc-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-sm font-medium">View Once Photo</span>
                </button>
                <button
                  onClick={handleOpenCamera}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-white/10 text-zinc-300'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Take Photo <span className="text-xs opacity-70">(View Once)</span></span>
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleViewOnceImage}
            className="hidden"
          />
          <input 
            ref={inputRef}
            type="text" 
            value={inputText}
            onChange={handleInputChange}
            readOnly={!!pendingViewOnceImage}
            disabled={uploadingImage}
            placeholder={pendingViewOnceImage ? "Click send to share photo" : "Type a message..."}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onBlur={() => {
              if (socket && selectedFriend && isTypingSentRef.current) {
                socket.emit('typing', { recipientId: selectedFriend.id, isTyping: false });
                isTypingSentRef.current = false;
              }
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
              }
            }}
            className={`flex-1 border-none outline-none text-sm md:text-base font-medium py-3 px-2 relative z-10 transition-colors ${
              theme === 'dark'
                ? 'bg-transparent text-white placeholder:text-zinc-600'
                : 'bg-transparent text-slate-900 placeholder:text-slate-500'
            }`}
          />
          <div className="flex items-center gap-1 md:gap-2 px-1 relative z-10">
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-xl transition-colors ${showEmojiPicker ? 'bg-indigo-500/20 text-indigo-400' : theme === 'dark' ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button 
              type="submit"
              disabled={uploadingImage || (!pendingViewOnceImage && !inputText.trim())}
              className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-20 disabled:grayscale rounded-[20px] transition-all shadow-[0_8px_20px_rgba(99,102,241,0.4)] active:scale-90"
            >
              {uploadingImage ? (
                <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Reactions Modal */}
      {reactionsModalMsgId && messages.find(m => m.id === reactionsModalMsgId) && (() => {
        const msg = messages.find(m => m.id === reactionsModalMsgId)!;
        return (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
            onClick={() => setReactionsModalMsgId(null)}
          >
            <div 
              className="glass-dark border border-white/10 rounded-[24px] w-full max-w-md max-h-96 flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Reactions</h3>
                <button 
                  onClick={() => setReactionsModalMsgId(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Reactions List */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {msg.reactions && msg.reactions.length > 0 ? (
                  <div className="space-y-3 p-4">
                    {msg.reactions.map((reaction) => (
                      <div key={reaction.emoji} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{reaction.emoji}</span>
                          <span className="text-xs text-zinc-400">{reaction.count} {reaction.count === 1 ? 'reaction' : 'reactions'}</span>
                        </div>
                        <div className="space-y-1 ml-11">
                          {reaction.userIds.map((userId) => {
                            const isCurrentUser = userId === currentUser.id;
                            const userName = isCurrentUser ? 'You' : (selectedFriend?.id === userId ? selectedFriend?.name || 'Friend' : 'Unknown User');
                            return (
                              <div key={userId} className="flex items-center justify-between group">
                                <span className="text-xs text-zinc-300">
                                  {userName}
                                  {isCurrentUser && <span className="text-zinc-500 ml-1">(You)</span>}
                                </span>
                                {isCurrentUser && (
                                  <button
                                    onClick={() => {
                                      onReaction(msg.id, reaction.emoji);
                                      // Close modal after removing reaction if this was the only reaction from current user
                                      const remainingReactions = msg.reactions.filter(r => {
                                        if (r.emoji === reaction.emoji) {
                                          const newUserIds = r.userIds.filter(id => id !== currentUser.id);
                                          return newUserIds.length > 0;
                                        }
                                        return true;
                                      });
                                      if (remainingReactions.length === 0) {
                                        setReactionsModalMsgId(null);
                                      }
                                    }}
                                    className="px-2 py-1 text-[11px] bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-zinc-500 text-sm">No reactions yet</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Shared Object Preview Modal */}
      {viewingObject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={() => setViewingObject(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] glass-dark border border-white/10 rounded-[40px] shadow-2xl overflow-hidden animate-slide-in flex flex-col">
            <div className="p-6 md:p-10 border-b border-white/5 flex items-center justify-between shrink-0">
               <div>
                 <h3 className="text-3xl font-outfit font-black tracking-tighter">{viewingObject.title}</h3>
                 <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Shared {viewingObject.type} Reader</p>
               </div>
               <button 
                 onClick={() => setViewingObject(null)}
                 className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-400 transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
               {viewingObject.type === 'note' && (
                 <div 
                   className="prose prose-invert max-w-none text-zinc-300 leading-relaxed text-lg"
                   dangerouslySetInnerHTML={{ __html: viewingObject.content }}
                 />
               )}
               {viewingObject.type === 'task' && (
                 <div className="flex flex-col gap-6 items-center justify-center py-10">
                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/20">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </div>
                    <div className="text-center space-y-4 max-w-lg">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] inline-block ${
                        viewingObject.meta?.priority === 'high' ? 'bg-rose-500/10 text-rose-500' : 
                        viewingObject.meta?.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {viewingObject.meta?.priority || 'Standard'} Priority
                      </div>
                      <h4 className="text-2xl font-bold text-white">{viewingObject.title}</h4>
                      <p className="text-zinc-500 leading-relaxed">This task has been shared with you as a collaborative goal. {viewingObject.meta?.completed ? 'It is currently marked as complete.' : 'It is currently in progress.'}</p>
                    </div>
                 </div>
               )}
               {viewingObject.type === 'drawing' && (
                 <div className="flex flex-col items-center">
                    <div className="w-full aspect-video rounded-3xl border border-white/5 overflow-hidden bg-[#09090b] shadow-2xl">
                       <img src={viewingObject.content} className="w-full h-full object-contain" alt="Shared drawing" />
                    </div>
                 </div>
               )}
            </div>
            <div className="p-6 md:px-10 py-6 bg-white/[0.02] border-t border-white/5 shrink-0 flex justify-end">
               <button 
                 onClick={() => setViewingObject(null)}
                 className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
               >
                 Close Preview
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCameraCapture && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl flex flex-col items-center gap-4">
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCapturePhoto}
                className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture Photo
              </button>
              <button
                onClick={handleCloseCameraCapture}
                className="px-8 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
