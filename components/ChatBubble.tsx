
import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import hljs from 'highlight.js';

interface ChatBubbleProps {
  message: Message;
  onTimestampClick?: (seconds: number) => void;
  onRunCode?: (code: string, language: string) => void;
  onBookmark?: (message: Message) => void;
  isBookmarked?: boolean;
}

const CodeBlock: React.FC<{ code: string; language?: string; onRunCode?: (code: string, lang: string) => void }> = ({ code, language, onRunCode }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const isDiff = language === 'diff';
  
  const isRunnable = language && ['javascript', 'js', 'typescript', 'ts', 'node'].includes(language.toLowerCase());

  useEffect(() => {
    if (codeRef.current) {
        codeRef.current.removeAttribute('data-highlighted');
        if (hljs && hljs.highlightElement) {
             hljs.highlightElement(codeRef.current);
        }
    }
  }, [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleDownloadPatch = () => {
      const blob = new Blob([code], { type: 'text/x-diff' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fix-${Date.now()}.patch`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-border bg-[#0d1117] shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#161b22] border-b border-border">
        <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono lowercase">{language || 'text'}</span>
        </div>
        
        <div className="flex gap-2">
            {isRunnable && onRunCode && (
                <button
                    onClick={() => onRunCode(code, language || 'js')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-green-900/30 transition-colors text-xs text-green-400 border border-transparent hover:border-green-800"
                >
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span className="font-medium">Run</span>
                </button>
            )}

            {isDiff && (
                <button
                    onClick={handleDownloadPatch}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-yellow-900/30 transition-colors text-xs text-yellow-400 border border-transparent hover:border-yellow-800"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>Patch</span>
                </button>
            )}
            <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors text-xs text-muted-foreground hover:text-foreground"
            >
             {copied ? (
                 <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>Copied</span>
                 </>
             ) : (
                 <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    <span>Copy</span>
                 </>
             )}
            </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 overflow-x-auto custom-scrollbar" dir="ltr">
        <pre className="text-sm font-mono leading-relaxed">
          <code ref={codeRef} className={`bg-transparent ${language ? `language-${language}` : ''}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onTimestampClick, onRunCode, onBookmark, isBookmarked = false }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  const parseTimestamps = (text: string) => {
     // Matches [MM:SS] or [HH:MM:SS]
     const splitRegex = /(\[(?:\d{1,2}:)?\d{1,2}:\d{2}\])/g;
     const isTimestamp = /^\[(?:\d{1,2}:)?\d{1,2}:\d{2}\]$/;

     const parts = text.split(splitRegex);

     return parts.map((part, index) => {
        if (isTimestamp.test(part)) {
            const timeStr = part.replace('[', '').replace(']', '');
            const timeParts = timeStr.split(':').map(Number);
            let seconds = 0;
            if (timeParts.length === 3) {
                seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            } else if (timeParts.length === 2) {
                seconds = timeParts[0] * 60 + timeParts[1];
            }

            return (
                <button 
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTimestampClick?.(seconds);
                    }}
                    className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-secondary text-primary hover:text-white hover:bg-primary transition-all font-mono text-xs cursor-pointer border border-primary/20 align-middle"
                >
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    <span className="font-medium">{timeStr}</span>
                </button>
            );
        }
        return part;
     });
  };

  const formatContent = (text: string) => {
    return text.split(/(```[\s\S]*?```)/g).map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/^```(\w+)?\n/);
        const language = match ? match[1] : undefined;
        const content = part.replace(/^```[a-z]*\n/, '').replace(/```$/, '');
        return <CodeBlock key={index} code={content} language={language} onRunCode={onRunCode} />;
      }
      return <span key={index} className="whitespace-pre-wrap">{onTimestampClick ? parseTimestamps(part) : part}</span>;
    });
  };

  if (isSystem) {
    return (
        <div className="flex w-full mb-6 justify-center animate-fade-in">
            <div className="bg-secondary/50 border border-border text-muted-foreground text-xs px-3 py-1 rounded-full flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                {message.content}
            </div>
        </div>
    );
  }

  return (
    <div id={`message-${message.id}`} className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
        {!isUser && (
            <div className="hidden md:flex flex-shrink-0 mr-4 w-8 h-8 rounded-lg bg-secondary border border-border items-center justify-center text-primary">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
        )}
      <div
        className={`relative max-w-[90%] md:max-w-[85%] px-5 py-4 rounded-2xl shadow-sm border ${
          isUser
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-card-foreground border-border'
        }`}
      >
        {/* Bookmark Button */}
        {onBookmark && !isSystem && (
          <button
            onClick={() => onBookmark(message)}
            className={`absolute -top-2 -right-2 p-1.5 rounded-full border shadow-sm transition-all opacity-0 group-hover:opacity-100 ${
              isBookmarked 
                ? 'bg-yellow-500 border-yellow-400 text-black' 
                : 'bg-card border-border text-muted-foreground hover:text-yellow-500 hover:border-yellow-500'
            }`}
            title={isBookmarked ? 'إزالة الإشارة المرجعية' : 'إضافة إشارة مرجعية'}
          >
            <svg className="w-3.5 h-3.5" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}
        
        <div className={`text-[15px] leading-relaxed ${isUser ? 'font-medium' : 'font-normal prose prose-invert max-w-none'}`} dir="auto">
           {isUser ? message.content : formatContent(message.content)}
           {message.image && (
                <div className="mt-4 rounded-lg overflow-hidden border border-white/10">
                    <img src={`data:image/png;base64,${message.image.data || message.image}`} className="w-full h-auto max-h-80 object-cover" alt="Uploaded Context" />
                </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
