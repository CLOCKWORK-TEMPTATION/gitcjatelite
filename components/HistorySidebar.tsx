
import React, { useEffect, useState } from 'react';
import { ChatSession } from '../types';
import { dbService } from '../services/dbService';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
  currentSessionId: string | null;
  onNewChat: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ isOpen, onClose, onSelectSession, currentSessionId, onNewChat }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
      setIsLoading(true);
      try {
          const data = await dbService.getAllChatSessions();
          setSessions(data);
      } catch (e) {
          console.error("Failed to load history", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
          await dbService.deleteChatSession(id);
          setSessions(prev => prev.filter(s => s.id !== id));
      }
  };

  const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      if (days === 1) return 'أمس';
      if (days < 7) return `${days} أيام`;
      return date.toLocaleDateString('ar-EG');
  };

  const getIcon = (session: ChatSession) => {
      if (session.youtubeInfo) return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      );
      if (session.repoInfo) return (
        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
      );
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
      );
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      <div 
        className={`fixed inset-y-0 left-0 w-80 bg-background border-r border-border z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col shadow-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
          <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            سجل المحادثات
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {/* New Chat Button */}
        <div className="p-4 border-b border-border">
            <button 
                onClick={onNewChat}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-glow-sm"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                محادثة جديدة
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
            {isLoading ? (
                <div className="flex justify-center py-10 text-muted-foreground text-xs">جاري التحميل...</div>
            ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-50">
                    <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.063 8.063 0 01-4.995-1.738L4 21l1.772-4.116C4.665 15.632 4 13.916 4 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" /></svg>
                    <span className="text-xs">لا توجد محادثات سابقة</span>
                </div>
            ) : (
                sessions.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => onSelectSession(session)}
                        className={`
                            group relative p-3 rounded-lg cursor-pointer transition-all border border-transparent
                            ${currentSessionId === session.id 
                                ? 'bg-secondary border-border shadow-sm' 
                                : 'hover:bg-secondary/50 hover:border-border/50 text-muted-foreground hover:text-foreground'
                            }
                        `}
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                {getIcon(session)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate mb-0.5 leading-snug" dir="auto">{session.title}</h4>
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <span>{formatDate(session.lastUpdated)}</span>
                                    {session.repoInfo && <span className="truncate max-w-[80px]">{session.repoInfo.repo}</span>}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={(e) => handleDelete(e, session.id)}
                            className="absolute left-2 top-3 p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
