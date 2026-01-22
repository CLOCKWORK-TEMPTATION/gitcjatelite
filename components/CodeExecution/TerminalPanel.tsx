
import React, { useEffect, useRef } from 'react';
import Loader from '../Loader';

interface TerminalPanelProps {
  output: string[];
  isRunning: boolean;
  onClose: () => void;
  fileName: string;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ output, isRunning, onClose, fileName }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f0f14] w-full max-w-3xl rounded-xl border border-glass-border shadow-2xl overflow-hidden flex flex-col font-mono text-sm relative">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a23] border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
             </div>
             <span className="text-gray-400 text-xs ml-2 flex items-center gap-1">
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               node {fileName}
             </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Terminal Output */}
        <div 
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto h-[400px] custom-scrollbar text-gray-300 space-y-1 bg-black/50"
        >
          <div className="text-gray-500 mb-2">$ node {fileName}</div>
          {output.map((line, i) => (
             <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-2 mt-2 text-primary">
                <span className="w-2 h-4 bg-primary animate-pulse"></span>
                <span className="text-xs">Running...</span>
            </div>
          )}
          {!isRunning && output.length > 0 && (
             <div className="mt-4 text-success/70 text-xs border-t border-white/5 pt-2">
                Program exited.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;
