
import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { NotesAPI } from '../api';
import { useTheme } from '../context/ThemeContext';
import { AIChat } from './AIChat';
import { Sparkles } from 'lucide-react';

const COLOR_PALETTE = [
  { name: 'indigo', hex: '#6366f1' },
  { name: 'rose', hex: '#f43f5e' },
  { name: 'emerald', hex: '#10b981' },
  { name: 'amber', hex: '#f59e0b' },
  { name: 'violet', hex: '#8b5cf6' },
  { name: 'cyan', hex: '#06b6d4' },
  { name: 'orange', hex: '#f97316' },
  { name: 'zinc', hex: '#71717a' },
];

interface WorkspaceNotesProps {
  onShare?: (id: string, title: string) => void;
}

const WorkspaceNotes: React.FC<WorkspaceNotesProps> = ({ onShare }) => {
  const { theme } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    const saved = localStorage.getItem('vention_activeNoteId');
    return saved ? saved : null;
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const activeNote = notes.find(n => n.id === activeNoteId);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    NotesAPI.list()
      .then(({ notes: payload }) => {
        setNotes(payload);
        // If we had an active note ID saved, keep it active
        const savedNoteId = localStorage.getItem('vention_activeNoteId');
        if (savedNoteId && payload.find(n => n.id === savedNoteId)) {
          setActiveNoteId(savedNoteId);
        }
      })
      .catch((err) => console.error('Failed to load notes', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Save active note ID to localStorage whenever it changes
  useEffect(() => {
    if (activeNoteId) {
      localStorage.setItem('vention_activeNoteId', activeNoteId);
    } else {
      localStorage.removeItem('vention_activeNoteId');
    }
  }, [activeNoteId]);

  const createNote = () => {
    NotesAPI.create({ title: 'Untitled Note', content: '<div>Start typing your ideas...</div>', color: 'indigo' })
      .then(({ note }) => {
        setNotes(prev => [note, ...prev]);
        setActiveNoteId(note.id);
      })
      .catch((err) => console.error('Failed to create note', err));
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    if (!activeNoteId) return;
    setNotes(prev => prev.map(n => 
      n.id === activeNoteId ? { ...n, ...updates, updatedAt: Date.now() } : n
    ));
    NotesAPI.update(activeNoteId, updates).catch((err) => console.error('Failed to save note', err));
  };

  const deleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    NotesAPI.remove(id)
      .then(() => {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (activeNoteId === id) setActiveNoteId(null);
      })
      .catch((err) => console.error('Failed to delete note', err));
  };

  const handleShareNote = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (onShare) onShare(note.id, note.title);
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  if (activeNoteId && activeNote) {
    const themeColor = COLOR_PALETTE.find(c => c.name === activeNote.color)?.hex || '#6366f1';

    return (
      <>
        <div className={`flex-1 flex flex-col items-center overflow-y-auto px-4 md:px-12 py-10 md:py-16 animate-slide-in relative scrollbar-hide transition-colors ${
          theme === 'dark' ? 'bg-[#050507]' : 'bg-white'
        }`}>
        <div className="w-full max-w-4xl space-y-8 pb-32">
          {/* Editor Header */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveNoteId(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 border-slate-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
            </button>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAIChatOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all border border-purple-500/20"
                title="Get AI suggestions"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">AI Assistant</span>
              </button>
              <button
                onClick={() => onShare && onShare(activeNote.id, activeNote.title)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-all border border-indigo-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Share</span>
              </button>
              <div className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-xl border border-white/5">
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color.name}
                    onClick={() => updateActiveNote({ color: color.name })}
                    className={`w-5 h-5 rounded-full transition-all hover:scale-125 ${activeNote.color === color.name ? 'ring-2 ring-white ring-offset-2 ring-offset-[#050507] scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <input 
              type="text"
              value={activeNote.title}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              className={`w-full bg-transparent border-none outline-none font-outfit text-4xl md:text-6xl font-black leading-tight tracking-tight ${
                theme === 'dark' ? 'text-white placeholder:text-zinc-800' : 'text-slate-900 placeholder:text-slate-400'
              }`}
              placeholder="Document Title"
            />
            
            <div className={`flex items-center flex-wrap gap-4 py-6 border-y ${
              theme === 'dark' ? 'border-white/5 text-zinc-500' : 'border-slate-300 text-slate-600'
            }`}>
               <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center border transition-colors" style={{ backgroundColor: `${themeColor}1a`, borderColor: `${themeColor}33` }}>
                     <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: `${themeColor}cc` }}>Theme: {activeNote.color}</span>
               </div>
            </div>
          </div>

          <div
            ref={editorRef}
            contentEditable
            onBlur={(e) => updateActiveNote({ content: e.currentTarget.innerHTML })}
            dangerouslySetInnerHTML={{ __html: activeNote.content }}
            className={`w-full bg-transparent border-none outline-none leading-relaxed text-lg md:text-xl min-h-[500px] prose max-w-none focus:ring-0 selection:bg-indigo-500/40 ${
              theme === 'dark' 
                ? 'text-zinc-300 prose-invert' 
                : 'text-slate-900 [&_p]:text-slate-900 [&_h1]:text-slate-900 [&_h2]:text-slate-900 [&_h3]:text-slate-900'
            }`}
          />
        </div>

        {/* Floating Toolbar - Fixed Position */}
        <div 
          ref={toolbarRef}
          className={`fixed z-30 flex items-center gap-0.5 px-2 py-1 border rounded-[24px] shadow-lg backdrop-blur-3xl transition-colors ${
            theme === 'dark'
              ? 'glass-dark border-white/20'
              : 'bg-white/90 border-slate-200'
          }`}
          style={{
            top: '60px',
            left: '35%',
            transform: 'translateX(-13%)',
          }}
        >
          {[
            { label: 'Undo', cmd: 'undo', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /> },
            { label: 'B', cmd: 'bold', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" /> },
            { label: 'List', cmd: 'insertUnorderedList', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /> },
          ].map((btn) => (
            <button key={btn.cmd} onMouseDown={(e) => { e.preventDefault(); execCommand(btn.cmd); }} className={`p-2 rounded-[12px] transition-all flex items-center justify-center ${
              theme === 'dark'
                ? 'hover:bg-white/10 text-zinc-400 hover:text-white'
                : 'hover:bg-slate-300 text-slate-600 hover:text-slate-900'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{btn.icon}</svg>
            </button>
          ))}
        </div>

        <style>{`
          [contenteditable] ul { list-style-type: disc; padding-left: 2rem; margin: 1.5rem 0; }
          [contenteditable] blockquote { border-left: 6px solid ${themeColor}; padding: 1rem 0 1rem 2rem; margin: 2rem 0; color: #a1a1aa; font-style: italic; background: ${themeColor}0d; border-radius: 0 16px 16px 0; }
          [contenteditable] b { color: white; font-weight: 800; }
        `}</style>
      </div>

      <AIChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        section="notes"
        contentPreview={activeNote?.content || ''}
        context={`Note Title: ${activeNote?.title || 'Untitled'}`}
      />
      </>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto px-6 md:px-12 py-10 scrollbar-hide transition-colors ${
      theme === 'dark' ? 'bg-[#050507]' : 'bg-white'
    }`}>
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className={`text-4xl md:text-5xl font-outfit font-black tracking-tighter ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>My Notes</h1>
            <p className={`font-medium ${
              theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
            }`}>Capture your thoughts, Vention handles the rest.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAIChatOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all border border-purple-500/20"
              title="Get AI suggestions"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">AI Assistant</span>
            </button>
            <button 
              onClick={createNote}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-[20px] font-bold shadow-xl shadow-indigo-500/20 transition-all active:scale-95 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              Create New Note
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading && notes.length === 0 && (
            <div className={`col-span-full p-6 rounded-2xl transition-colors text-center ${
              theme === 'dark' ? 'border border-white/5 text-zinc-500' : 'border border-slate-200 bg-slate-50 text-slate-600'
            }`}>Loading notes...</div>
          )}
          {notes.map(note => {
            const cardColor = COLOR_PALETTE.find(c => c.name === note.color)?.hex || '#6366f1';
            return (
              <div 
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={`group relative p-6 rounded-[32px] transition-all cursor-pointer hover:translate-y-[-4px] overflow-hidden ${
                  theme === 'dark' 
                    ? 'glass-dark border border-white/5' 
                    : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
                }`}
                style={{ borderColor: activeNoteId === note.id ? cardColor : undefined }}
              >
                {/* Dynamic Background Glow */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 blur-[45px] rounded-full pointer-events-none group-hover:opacity-40 opacity-20 transition-opacity" 
                  style={{ backgroundColor: cardColor }}
                />
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div 
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                        theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'
                      }`}
                      style={{ color: cardColor }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleShareNote(e, note)}
                        className={`p-2 rounded-xl transition-all ${
                          theme === 'dark' 
                            ? 'hover:bg-white/10 text-zinc-500 hover:text-white' 
                            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                        }`}
                        title="Share note"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                      <button 
                        onClick={(e) => deleteNote(e, note.id)}
                        className={`p-2 rounded-xl transition-all ${
                          theme === 'dark' 
                            ? 'hover:bg-red-500/20 text-zinc-500 hover:text-red-400' 
                            : 'hover:bg-red-50 text-red-500 hover:text-red-600'
                        }`}
                        title="Delete note"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className={`font-outfit font-bold text-xl truncate leading-tight ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>{note.title}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                      theme === 'dark' ? 'text-zinc-500' : 'text-slate-500'
                    }`}>
                      {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div 
                    className={`text-sm line-clamp-3 leading-relaxed overflow-hidden h-12 ${
                      theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                    }`}
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                </div>
              </div>
            );
          })}

          {notes.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
               <div className={`w-20 h-20 rounded-[30px] border flex items-center justify-center ${
                 theme === 'dark' ? 'bg-white/5 border-white/5 text-zinc-700' : 'bg-slate-100 border-slate-200 text-slate-400'
               }`}>
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
               </div>
               <p className={`font-medium ${
                 theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
               }`}>Your creative canvas is empty.</p>
            </div>
          )}
        </div>
      </div>
      
      <AIChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        section="notes"
        contentPreview={activeNote?.content || ''}
        context={`Note Title: ${activeNote?.title || 'Untitled'}`}
      />
    </div>
  );
};

export default WorkspaceNotes;
