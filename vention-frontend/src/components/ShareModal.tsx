
import React from 'react';
import { User, UserStatus } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: User[];
  onSelectContact: (user: User) => void;
  title: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, contacts, onSelectContact, title }) => {
  const { theme } = useTheme();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={`relative w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-slide-in transition-colors ${
        theme === 'dark'
          ? 'glass-dark border border-white/10'
          : 'bg-white border border-slate-200'
      }`}>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-2xl font-outfit font-black tracking-tight">{title}</h3>
              <p className={`text-xs font-black uppercase tracking-widest ${
                theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
              }`}>Select a recipient</p>
            </div>
            <button 
              onClick={onClose}
              className={`p-3 rounded-2xl transition-colors ${
                theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10 text-zinc-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 scrollbar-hide">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`w-full flex items-center gap-4 p-4 rounded-[24px] transition-all group relative overflow-hidden text-left ${
                  theme === 'dark'
                    ? 'bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/10'
                    : 'bg-slate-50 border border-slate-200 hover:border-indigo-400/40 hover:bg-indigo-50'
                }`}
              >
                <div className="relative shrink-0">
                  <img src={contact.avatar} className={`w-12 h-12 rounded-2xl object-cover border group-hover:scale-105 transition-transform ${
                    theme === 'dark' ? 'border-white/10' : 'border-slate-200'
                  }`} alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] ${
                    contact.status === UserStatus.ONLINE ? 'bg-emerald-500' : 'bg-zinc-600'
                  } ${theme === 'dark' ? 'border-[#0c0c0e]' : 'border-white'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold tracking-tight truncate ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>{contact.name}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                    theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                  }`}>
                    {contact.status === UserStatus.ONLINE ? 'Active now' : 'Last seen recently'}
                  </p>
                </div>
                <div className={`p-2 rounded-xl transition-all ${
                  theme === 'dark'
                    ? 'bg-white/5 text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/20'
                    : 'bg-slate-100 text-slate-600 group-hover:text-indigo-600 group-hover:bg-indigo-100'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l7-7-7-7" /></svg>
                </div>
              </button>
            ))}
          </div>

          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 text-zinc-400'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
