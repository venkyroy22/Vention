
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Note, Task } from '../types';
import { TasksAPI } from '../api';
import { useTheme } from '../context/ThemeContext';
import { AIChat } from './AIChat';
import { Sparkles } from 'lucide-react';

interface ProductivityPanelProps {
  isOpen?: boolean;
  isEmbedded?: boolean;
  defaultTab?: 'notes' | 'tasks' | 'calculator' | 'whiteboard';
  onClose?: () => void;
  onShare?: (type: 'note' | 'task' | 'drawing', id: string, title: string) => void;
}

const ProductivityPanel: React.FC<ProductivityPanelProps> = ({ 
  isOpen = true, 
  isEmbedded = false, 
  defaultTab = 'tasks',
  onClose, 
  onShare 
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [calcInput, setCalcInput] = useState('0');
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');

  useEffect(() => {
    setIsLoadingTasks(true);
    TasksAPI.list()
      .then(({ tasks: payload }) => setTasks(payload))
      .catch((err) => console.error('Failed to load tasks', err))
      .finally(() => setIsLoadingTasks(false));
  }, []);

  // Whiteboard State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyStep = useRef(-1);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        ctx.strokeStyle = '#1a1a1e';
        ctx.lineWidth = 0.5;
        for(let i=0; i<rect.width; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, rect.height); ctx.stroke(); }
        for(let i=0; i<rect.height; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(rect.width, i); ctx.stroke(); }

        if (historyRef.current.length > 0 && historyStep.current >= 0) {
          loadState(historyRef.current[historyStep.current]);
        } else if (historyRef.current.length === 0) {
          saveState();
        }
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'whiteboard') {
      const timer = setTimeout(initCanvas, 100);
      window.addEventListener('resize', initCanvas);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', initCanvas);
      };
    }
  }, [activeTab]);

  const saveState = () => {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL();
    if (historyStep.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyStep.current + 1);
    }
    historyRef.current.push(data);
    historyStep.current++;
  };

  const undo = () => {
    if (historyStep.current > 0) {
      historyStep.current--;
      loadState(historyRef.current[historyStep.current]);
    }
  };

  const redo = () => {
    if (historyStep.current < historyRef.current.length - 1) {
      historyStep.current++;
      loadState(historyRef.current[historyStep.current]);
    }
  };

  const loadState = (dataUrl: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
  };

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left), y: (clientY - rect.top) };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = isEraser ? '#09090b' : brushColor;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = isEraser ? '#09090b' : brushColor;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveState();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.strokeStyle = '#1a1a1e';
      ctx.lineWidth = 0.5;
      for(let i=0; i<rect.width; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, rect.height); ctx.stroke(); }
      for(let i=0; i<rect.height; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(rect.width, i); ctx.stroke(); }
      saveState();
    }
  };

  const handleAddTaskSubmit = () => {
    if (!newTaskTitle.trim()) return;
    TasksAPI.create({ title: newTaskTitle, priority: newTaskPriority })
      .then(({ task }) => {
        setTasks(prev => [task, ...prev]);
        setNewTaskTitle('');
        setIsAddingTask(false);
        setNewTaskPriority('medium');
      })
      .catch((err) => console.error('Failed to create task', err));
  };

  const togglePriority = (id: string) => {
    const current = tasks.find(t => t.id === id);
    if (!current) return;
    const next: Task['priority'] = current.priority === 'low' ? 'medium' : current.priority === 'medium' ? 'high' : 'low';
    TasksAPI.update(id, { priority: next })
      .then(({ task }) => setTasks(tasks.map(t => (t.id === id ? task : t))))
      .catch((err) => console.error('Failed to update priority', err));
  };

  const deleteTask = (id: string) => {
    TasksAPI.remove(id)
      .then(() => setTasks(tasks.filter(t => t.id !== id)))
      .catch((err) => console.error('Failed to delete task', err));
  };

  const clearCompleted = () => {
    const completed = tasks.filter(t => t.completed);
    completed.forEach(t => TasksAPI.remove(t.id).catch(() => {}));
    setTasks(tasks.filter(t => !t.completed));
  };

  if (!isOpen) return null;

  const contentClass = isEmbedded 
    ? "w-full max-w-4xl animate-slide-in h-full flex flex-col mx-auto" 
    : `w-full md:w-96 flex flex-col z-30 animate-slide-in h-full transition-colors ${
        theme === 'dark'
          ? 'glass-dark border-l border-white/10'
          : 'bg-white border-l border-slate-200'
      }`;

  return (
    <div className={contentClass}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-4 space-y-6 flex flex-col h-full scrollbar-hide">
        {activeTab === 'tasks' && (
          <div className="space-y-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className={`text-4xl font-outfit font-black tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Tasks</h2>
                <p className={`text-xs font-black uppercase tracking-widest ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                }`}>Active workflow</p>
              </div>
              <div className="flex gap-2">
                {tasks.some(t => t.completed) && (
                  <button 
                    onClick={clearCompleted}
                    className={`p-3 rounded-xl transition-all ${
                      theme === 'dark'
                        ? 'text-red-400/60 hover:text-red-400 hover:bg-red-400/10'
                        : 'text-red-500/60 hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Clear completed tasks"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
                <button
                  onClick={() => setIsAIChatOpen(true)}
                  className={`p-3 rounded-xl transition-all ${
                    theme === 'dark'
                      ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                      : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                  }`}
                  title="Get AI suggestions"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className={`p-3 rounded-xl transition-all ${
                    isAddingTask
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : theme === 'dark'
                        ? 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <svg className={`w-6 h-6 transition-transform ${isAddingTask ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>

            {isAddingTask && (
              <div className={`animate-slide-in relative group space-y-3 p-6 rounded-[32px] shadow-2xl ${
                theme === 'dark'
                  ? 'glass-dark border border-white/10'
                  : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <input 
                      autoFocus
                      type="text" 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title..." 
                      className={`w-full border rounded-2xl px-5 py-4 text-sm md:text-base outline-none transition-all font-medium shadow-inner ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/5 text-white focus:border-indigo-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-400'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTaskSubmit();
                        if (e.key === 'Escape') setIsAddingTask(false);
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${
                      theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                    }`}>Select Priority</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'low', label: 'Low', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', active: 'bg-emerald-500 text-white' },
                        { id: 'medium', label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', active: 'bg-amber-500 text-white' },
                        { id: 'high', label: 'High', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', active: 'bg-rose-500 text-white' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setNewTaskPriority(p.id as Task['priority'])}
                          className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                            newTaskPriority === p.id 
                              ? `${p.active} border-transparent shadow-lg` 
                              : theme === 'dark'
                                ? `bg-white/5 ${p.color} border-white/5 hover:border-white/20`
                                : `bg-slate-100 ${p.color} border-slate-200 hover:border-slate-300`
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleAddTaskSubmit}
                      disabled={!newTaskTitle.trim()}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-20 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                    >
                      Add Task
                    </button>
                    <button 
                      onClick={() => setIsAddingTask(false)}
                      className={`px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        theme === 'dark'
                          ? 'bg-white/5 hover:bg-white/10 text-zinc-400'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3">
              {isLoadingTasks && tasks.length === 0 && (
                <div className={`p-6 rounded-2xl border text-sm text-center ${
                  theme === 'dark'
                    ? 'border-white/5 text-zinc-500'
                    : 'border-slate-200 text-slate-600'
                }`}>Loading tasks...</div>
              )}
              {tasks.map(task => (
                <div key={task.id} className={`flex items-center gap-4 p-4 rounded-[24px] group transition-all cursor-pointer shadow-sm relative overflow-hidden ${
                  theme === 'dark'
                    ? 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}>
                  <button 
                    onClick={() => {
                      TasksAPI.update(task.id, { completed: !task.completed })
                        .then(({ task: updated }) => setTasks(tasks.map(t => (t.id === task.id ? updated : t))))
                        .catch((err) => console.error('Failed to toggle task', err));
                    }}
                    className={`w-7 h-7 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${
                      task.completed
                        ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                        : theme === 'dark'
                          ? 'border-zinc-700 hover:border-zinc-500'
                          : 'border-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {task.completed && <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </button>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-sm md:text-base font-bold truncate ${
                      task.completed
                        ? theme === 'dark' ? 'text-zinc-600 line-through' : 'text-slate-400 line-through'
                        : theme === 'dark' ? 'text-zinc-200' : 'text-slate-900'
                    }`}>
                      {task.title}
                    </span>
                    <button 
                      onClick={() => togglePriority(task.id)}
                      className={`text-[9px] font-black uppercase tracking-widest mt-0.5 w-fit ${
                        task.priority === 'high' ? 'text-rose-500' : task.priority === 'medium' ? 'text-amber-500' : theme === 'dark' ? 'text-zinc-500' : 'text-slate-500'
                      }`}
                    >
                      {task.priority} Priority
                    </button>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onShare && onShare('task', task.id, task.title)} className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-white/10 text-zinc-500'
                        : 'hover:bg-slate-200 text-slate-500'
                    }`} title="Share to chat">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                    <button onClick={() => deleteTask(task.id)} className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-red-500/20 text-zinc-500 hover:text-red-400'
                        : 'hover:bg-red-100 text-slate-500 hover:text-red-600'
                    }`} title="Delete task">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              
              {tasks.length === 0 && !isAddingTask && (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center mb-4 ${
                    theme === 'dark' ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
                  }`}>All caught up!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="flex flex-col items-center justify-center flex-1 h-full py-4 px-2">
             <div className={`w-full max-w-[340px] sm:max-w-[360px] p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] border shadow-2xl space-y-4 transition-colors ${
               theme === 'dark'
                 ? 'bg-gradient-to-br from-zinc-800 to-zinc-950 border-white/10'
                 : 'bg-white border-slate-200'
             }`}>
                <div className={`p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] text-right overflow-hidden border backdrop-blur-xl shadow-inner transition-colors ${
                  theme === 'dark'
                    ? 'bg-black/60 border-white/5'
                    : 'bg-slate-50 border-slate-300'
                }`}>
                   <div className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                     theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                   }`}>Result</div>
                   <span className={`text-3xl sm:text-4xl md:text-5xl font-outfit font-light tracking-tighter truncate block leading-none ${
                     theme === 'dark' ? 'text-white' : 'text-slate-900'
                   }`}>
                      {calcInput}
                   </span>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                   {['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map((btn) => (
                     <button 
                       key={btn} 
                       onClick={() => {
                         if (btn === 'C') setCalcInput('0');
                         else if (btn === '=') {
                           try {
                             const sanitized = calcInput.replace('×', '*').replace('÷', '/').replace('±', '-');
                             const result = eval(sanitized);
                             setCalcInput(String(Number(result.toFixed(8))));
                           } catch { setCalcInput('Error'); }
                         }
                         else if (calcInput === '0' || calcInput === 'Error') setCalcInput(btn);
                         else setCalcInput(calcInput + btn);
                       }}
                       className={`h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold transition-all active:scale-90 shadow-md ${
                         ['÷', '×', '-', '+', '='].includes(btn) 
                           ? 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/20' 
                           : isNaN(parseInt(btn)) && btn !== '.' 
                             ? theme === 'dark' ? 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600' : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                             : theme === 'dark' ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white border border-white/5' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                       } ${btn === '0' ? 'col-span-2' : ''}`}
                     >
                       {btn}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'whiteboard' && (
          <div className="space-y-4 h-full flex flex-col min-h-0 flex-1">
             <div className="flex items-center justify-between flex-wrap gap-4 shrink-0 px-1">
                <div className="flex flex-col">
                  <h2 className={`text-3xl font-outfit font-black tracking-tight ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  }`}>Whiteboard</h2>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                    theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                  }`}>Draw freely</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-3xl transition-colors ${
                  theme === 'dark'
                    ? 'glass border-white/10'
                    : 'bg-white/80 border-slate-200'
                }`}>
                   <button onClick={undo} className={`p-2 rounded-xl transition-colors ${
                     theme === 'dark'
                       ? 'hover:bg-white/10 text-zinc-400'
                       : 'hover:bg-slate-200 text-slate-600'
                   }`} title="Undo"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
                   <button onClick={redo} className={`p-2 rounded-xl transition-colors ${
                     theme === 'dark'
                       ? 'hover:bg-white/10 text-zinc-400'
                       : 'hover:bg-slate-200 text-slate-600'
                   }`} title="Redo"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg></button>
                   <div className={`w-px h-6 mx-2 ${
                     theme === 'dark' ? 'bg-white/10' : 'bg-slate-300'
                   }`} />
                   <button onClick={clearCanvas} className={`p-2 rounded-xl transition-colors ${
                     theme === 'dark'
                       ? 'hover:bg-red-500/20 hover:text-red-400 text-zinc-400'
                       : 'hover:bg-red-100 hover:text-red-600 text-slate-600'
                   }`} title="Clear All"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                   <div className={`w-px h-6 mx-2 ${
                     theme === 'dark' ? 'bg-white/10' : 'bg-slate-300'
                   }`} />
                   <button onClick={() => onShare && onShare('drawing', canvasRef.current?.toDataURL() || '', 'My Masterpiece')} className={`p-2 rounded-xl transition-colors ${
                     theme === 'dark'
                       ? 'hover:bg-indigo-500/20 hover:text-indigo-400 text-zinc-400'
                       : 'hover:bg-indigo-100 hover:text-indigo-600 text-slate-600'
                   }`} title="Share drawing"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
                </div>
             </div>

             <div className={`relative flex-1 rounded-[40px] border overflow-hidden shadow-3xl group min-h-[350px] transition-colors ${
               theme === 'dark'
                 ? 'bg-[#09090b] border-white/10'
                 : 'bg-white border-slate-200'
             }`}>
                <canvas 
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair touch-none block"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                
                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col md:flex-row items-center gap-4 p-4 md:px-8 md:py-4 border rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] group-hover:opacity-100 md:opacity-0 transition-opacity backdrop-blur-3xl z-20 ${
                  theme === 'dark'
                    ? 'glass-dark border-white/20'
                    : 'bg-white/90 border-slate-200'
                }`}>
                   <div className="flex gap-3">
                      {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ffffff'].map(c => (
                        <button 
                          key={c}
                          onClick={() => { setBrushColor(c); setIsEraser(false); }}
                          className={`w-7 h-7 rounded-full border-[3px] transition-all hover:scale-125 ${brushColor === c && !isEraser ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-transparent shadow-lg'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <button onClick={() => setIsEraser(!isEraser)} className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                        isEraser
                          ? theme === 'dark' ? 'bg-white text-black' : 'bg-slate-900 text-white'
                          : theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                      }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                   </div>
                   <div className={`w-full md:w-px md:h-8 hidden md:block ${
                     theme === 'dark' ? 'bg-white/10' : 'bg-slate-300'
                   }`} />
                   <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest hidden md:block ${
                        theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                      }`}>Size</span>
                      <input type="range" min="1" max="40" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-24 md:w-32 accent-indigo-500" />
                   </div>
                </div>
             </div>
          </div>
        )}

        <AIChat
          isOpen={isAIChatOpen}
          onClose={() => setIsAIChatOpen(false)}
          section="tasks"
          contentPreview={tasks.map(t => `- ${t.title} (${t.completed ? 'done' : 'pending'})`).join('\n') || 'No tasks yet'}
          context={`Total tasks: ${tasks.length}, Completed: ${tasks.filter(t => t.completed).length}`}
        />
      </div>
    </div>
  );
};

export default ProductivityPanel;
