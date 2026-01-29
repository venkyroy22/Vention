
import React from 'react';
import { User, UserStatus } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  friends: User[];
  selectedFriend: User | null;
  onSelectFriend: (u: User) => void;
  currentUser: User;
  activeView: string;
  setActiveView: (v: any) => void;
  onLogout: () => void;
  onShowProfile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, friends, selectedFriend, onSelectFriend, currentUser, activeView, setActiveView, onLogout, onShowProfile }) => {
  const { theme } = useTheme();
  const navItems = [
    { id: 'notes', label: 'Workspace', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    )},
    { id: 'chat', label: 'Messages', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    )},
    { id: 'tasks', label: 'Tasks', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    )},
    { id: 'calculator', label: 'Calculator', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    )},
    { id: 'whiteboard', label: 'Whiteboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    )},
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className={`fixed inset-0 backdrop-blur-sm z-40 lg:hidden transition-colors ${
            theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
          }`}
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 lg:relative z-50
        ${isOpen ? 'translate-x-0 w-72 md:w-80' : '-translate-x-full lg:translate-x-0 lg:w-20'} 
        transition-all duration-500 ease-[cubic-bezier(0.4, 0, 0.2, 1)]
        flex flex-col
        ${theme === 'dark' 
          ? 'bg-black/40 border-white/10' 
          : 'bg-white/80 border-slate-200'}
        border-r
      `}>
        <div className="p-8 flex items-center justify-between">
          {(isOpen || !window.matchMedia("(min-width: 1024px)").matches) && (
            <h1 className="text-xl font-outfit font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent tracking-tighter">
              VENTION
            </h1>
          )}
          {(!isOpen && window.matchMedia("(min-width: 1024px)").matches) && (
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/40">V</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-4 scrollbar-hide">
          <div className="space-y-2">
            {isOpen && <p className={`px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] ${
              theme === 'dark' ? 'text-zinc-600' : 'text-slate-500'
            }`}>Platform</p>}
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'chat') {
                    setActiveView('chat');
                  } else {
                    setActiveView(item.id);
                  }
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                  activeView === item.id 
                    ? theme === 'dark'
                      ? 'bg-white/10 text-white border border-white/10'
                      : 'bg-indigo-500/20 text-indigo-900 border border-indigo-300/50'
                    : theme === 'dark'
                      ? 'text-zinc-500 hover:bg-white/5 active:scale-95'
                      : 'text-slate-600 hover:bg-slate-300/30 active:scale-95'
                }`}
              >
                <div className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${activeView === item.id ? 'text-indigo-400' : ''}`}>
                  {item.icon}
                </div>
                {isOpen && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
                {activeView === item.id && !isOpen && (
                  <div className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 mt-auto space-y-3">
          <button
            onClick={onShowProfile}
            className={`w-full flex items-center gap-4 p-4 rounded-[24px] transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                : 'bg-slate-100 border border-slate-200 hover:bg-slate-200'
            } ${!isOpen ? 'justify-center' : ''}`}>
            <div className="shrink-0">
              <img src={currentUser.avatar} className={`w-10 h-10 rounded-2xl border shadow-xl object-cover ${
                theme === 'dark' ? 'border-white/10' : 'border-slate-300'
              }`} alt="" />
            </div>
            {isOpen && (
              <div className="flex-1 overflow-hidden">
                <p className={`font-bold text-[15px] truncate tracking-tight leading-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>{currentUser.name}</p>
                <p className={`text-[10px] uppercase tracking-[0.15em] font-medium mt-0.5 ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-slate-500'
                }`}>My Profile</p>
              </div>
            )}
          </button>
          {isOpen && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 text-sm font-medium bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 15s linear infinite;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
