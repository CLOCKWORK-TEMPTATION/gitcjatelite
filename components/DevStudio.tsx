
import React, { useState, useEffect, useMemo } from 'react';
import D3FlowChart from './D3FlowChart';
import { FileNode, D3Node, D3Link, Message } from '../types';
import { askNodeSpecificQuestion } from '../services/geminiService';
import Loader from './Loader';

interface DevStudioProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileNode[];
  repoName: string;
}

const DevStudio: React.FC<DevStudioProps> = ({ isOpen, onClose, files, repoName }) => {
  const [selectedNode, setSelectedNode] = useState<D3Node | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Transform FileNodes to D3 Graph Data
  const graphData = useMemo(() => {
    if (!files.length) return { nodes: [], links: [] };

    const nodes: D3Node[] = [];
    const links: D3Link[] = [];
    const nodeMap = new Map<string, string>(); // Path -> ID

    // Add Root
    const rootId = 'root';
    nodes.push({ id: rootId, group: 1, label: repoName, path: '/', size: 20 });
    nodeMap.set('', rootId);

    // Limit files to prevent D3 performance explosion (approx 200 nodes max)
    const limitedFiles = files.sort((a, b) => a.path.length - b.path.length).slice(0, 200);

    limitedFiles.forEach(file => {
        const parts = file.path.split('/');
        const fileName = parts.pop() || '';
        const parentPath = parts.join('/');
        
        // Create Node
        const isFile = file.type === 'blob';
        const id = file.path;
        
        if (!nodeMap.has(id)) {
            nodes.push({
                id,
                group: isFile ? 3 : 2,
                label: fileName,
                path: file.path,
                size: isFile ? 5 : 8
            });
            nodeMap.set(id, id);
        }

        // Create Link
        const parentId = parentPath === '' ? rootId : parentPath;
        // Simple linking: if parent exists in our limited set, link it. 
        // If parent doesn't exist (because it was a folder not strictly in FileNode list or cut off), link to Root.
        const targetParent = nodeMap.has(parentId) ? parentId : rootId;
        
        links.push({
            source: targetParent,
            target: id,
            value: 1
        });
    });

    return { nodes, links };
  }, [files, repoName]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    
    const userMsg: Message = { 
        id: Date.now().toString(), 
        role: 'user', 
        content: text, 
        timestamp: Date.now() 
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setIsProcessing(true);
    setInputQuery('');

    try {
        const targetLabel = selectedNode ? selectedNode.label : repoName;
        const responseText = await askNodeSpecificQuestion(targetLabel, text, files);
        
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
            timestamp: Date.now()
        };
        setChatHistory(prev => [...prev, aiMsg]);
    } catch (e) {
        setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'system', content: "Error communicating with AI.", timestamp: Date.now() }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleQuickAction = (type: 'explain' | 'optimize' | 'debug') => {
      if (!selectedNode) return;
      const prompts = {
          explain: `What does the component '${selectedNode.label}' do?`,
          optimize: `How can I improve the performance of '${selectedNode.label}'?`,
          debug: `What are potential edge cases or bugs in '${selectedNode.label}'?`
      };
      handleSendMessage(prompts[type]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 animate-fade-in flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-14 border-b border-white/10 bg-[#0f0f14] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/20 rounded text-cyan-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
              </div>
              <h1 className="font-bold text-white tracking-tight">Dev<span className="text-cyan-400">Studio</span></h1>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Visual */}
          <div className="flex-1 bg-[#050508] relative border-r border-white/10">
              <D3FlowChart data={graphData} onNodeClick={setSelectedNode} />
              
              {/* Legend/Info Overlay */}
              <div className="absolute top-4 left-4 pointer-events-none">
                  <div className="bg-black/40 backdrop-blur px-3 py-1 rounded border border-white/5 text-xs text-gray-500 font-mono">
                      {graphData.nodes.length} nodes • {graphData.links.length} links
                  </div>
              </div>
          </div>

          {/* Right Pane: Terminal/Chat */}
          <div className="w-[400px] flex flex-col bg-[#0a0a0f] relative">
              {/* Context Header */}
              <div className="p-4 border-b border-white/10 bg-[#12121a]">
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Active Context</div>
                  <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm truncate">
                      {selectedNode ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            {selectedNode.path}
                          </>
                      ) : (
                          <span className="text-gray-500 italic">Select a node to begin...</span>
                      )}
                  </div>
              </div>

              {/* Quick Actions */}
              <div className="p-3 grid grid-cols-3 gap-2 border-b border-white/10">
                  <button onClick={() => handleQuickAction('explain')} disabled={!selectedNode} className="flex flex-col items-center gap-1 p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/5 group">
                      <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-[10px] text-gray-300">Explain</span>
                  </button>
                  <button onClick={() => handleQuickAction('optimize')} disabled={!selectedNode} className="flex flex-col items-center gap-1 p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/5 group">
                      <svg className="w-4 h-4 text-green-400 group-hover:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <span className="text-[10px] text-gray-300">Optimize</span>
                  </button>
                  <button onClick={() => handleQuickAction('debug')} disabled={!selectedNode} className="flex flex-col items-center gap-1 p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/5 group">
                      <svg className="w-4 h-4 text-red-400 group-hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-[10px] text-gray-300">Debug</span>
                  </button>
              </div>

              {/* Chat History */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20 font-mono text-sm">
                  {chatHistory.length === 0 && (
                      <div className="text-center mt-10 opacity-30">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p>Terminal Ready.</p>
                      </div>
                  )}
                  {chatHistory.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[90%] p-3 rounded-lg border ${
                              msg.role === 'user' 
                              ? 'bg-cyan-950/30 border-cyan-800/50 text-cyan-100' 
                              : 'bg-[#1a1a23] border-white/10 text-gray-300'
                          }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                      </div>
                  ))}
                  {isProcessing && (
                      <div className="flex items-start">
                          <div className="p-3 rounded-lg bg-[#1a1a23] border border-white/10 text-gray-300">
                              <Loader />
                          </div>
                      </div>
                  )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-white/10 bg-[#12121a]">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputQuery); }} className="relative">
                      <span className="absolute left-3 top-2.5 text-cyan-500 font-mono">{'>'}</span>
                      <input 
                        type="text" 
                        value={inputQuery}
                        onChange={(e) => setInputQuery(e.target.value)}
                        placeholder={selectedNode ? `Query ${selectedNode.label}...` : "Select a node to ask..."}
                        className="w-full bg-black/50 text-white font-mono text-sm pl-7 pr-10 py-2 rounded border border-white/10 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 placeholder-gray-600 transition-all"
                      />
                      <button type="submit" disabled={!inputQuery} className="absolute right-2 top-2 text-gray-500 hover:text-cyan-400 transition-colors disabled:opacity-0">
                          <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </button>
                  </form>
              </div>
          </div>
      </div>
    </div>
  );
};

import { useRef } from 'react';
export default DevStudio;
