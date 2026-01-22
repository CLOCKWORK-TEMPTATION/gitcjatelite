
import React, { useEffect, useRef, useState, useMemo } from 'react';
import mermaid from 'mermaid';
import { FileNode } from '../types';

interface MermaidDiagramProps {
  files: FileNode[];
  onClose: () => void;
}

// Helper to convert flat file paths to a nested tree object
const buildHierarchy = (files: FileNode[]) => {
  const root: any = {};
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      // If it's the last part, it's the file/node itself
      if (index === parts.length - 1) {
        current[part] = { __type: file.type === 'blob' ? 'file' : 'folder' };
      } else {
        // It's a directory
        if (!current[part]) {
          current[part] = { __type: 'folder', __children: {} };
        }
        // Normalize structure if we previously treated it as a leaf or mixed type
        if (!current[part].__children) {
             current[part].__children = {};
        }
        current = current[part].__children;
      }
    });
  });
  return root;
};

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ files, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState<number>(2); // Default depth to keep it clean initially
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Memoize the hierarchy so we don't rebuild it on every render
  const hierarchy = useMemo(() => buildHierarchy(files), [files]);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'base',
      themeVariables: {
        darkMode: true,
        background: '#050508',
        primaryColor: '#5A5296',
        secondaryColor: '#1a1d23',
        tertiaryColor: '#1a1d23',
        primaryBorderColor: '#7c3aed',
        lineColor: '#4b5563',
        textColor: '#e2e8f0',
        mainBkg: '#050508',
      },
      securityLevel: 'loose',
      fontFamily: 'IBM Plex Mono'
    });
    
    renderDiagram();
  }, [hierarchy, depth]); // Re-render when depth changes

  const generateMermaidCode = () => {
    let code = "graph LR\n";
    let nodeIdCounter = 0;
    const maxNodes = 100; // Hard limit to prevent browser crash on huge repos
    let currentNodes = 0;

    // Helper to escape characters for Mermaid IDs
    const getId = () => `node_${nodeIdCounter++}`;

    const traverse = (node: any, name: string, parentId: string | null, currentLevel: number) => {
        if (currentNodes >= maxNodes) return;
        
        const id = getId();
        const isFile = node.__type === 'file';
        const isFolder = node.__type === 'folder';
        
        // Visual Styling based on type
        // Folders get () round edges, Files get [] square edges
        // We add an icon to the label
        const cleanName = name.replace(/["\\]/g, ''); // Sanitize
        const label = isFolder ? `📂 ${cleanName}` : `📄 ${cleanName}`;
        const shapeStart = isFolder ? '(' : '[';
        const shapeEnd = isFolder ? ')' : ']';
        
        // Add Node
        code += `  ${id}${shapeStart}"${label}"${shapeEnd}:::${isFolder ? 'folder' : 'file'}\n`;
        currentNodes++;

        // Add Edge from Parent
        if (parentId) {
            code += `  ${parentId} --> ${id}\n`;
        }

        // Recursion for children (if folder and within depth limit)
        if (isFolder && currentLevel < depth && node.__children) {
            const childrenKeys = Object.keys(node.__children);
            
            // Limit breadth to avoid wide graphs
            const maxBreadth = 15;
            const visibleChildren = childrenKeys.slice(0, maxBreadth);
            
            visibleChildren.forEach(childKey => {
                traverse(node.__children[childKey], childKey, id, currentLevel + 1);
            });

            if (childrenKeys.length > maxBreadth) {
                 const moreId = getId();
                 code += `  ${moreId}("... ${childrenKeys.length - maxBreadth} more"):::meta\n`;
                 code += `  ${id} -.-> ${moreId}\n`;
            }
        } else if (isFolder && currentLevel >= depth) {
             // Indicate collapsed state
             const collapsedId = getId();
             code += `  ${collapsedId}(("...")):::meta\n`;
             code += `  ${id} --> ${collapsedId}\n`;
        }
    };

    // Start traversal from root keys
    const rootKeys = Object.keys(hierarchy);
    if (rootKeys.length === 0) return "graph TD;\nError[No Files Found];";

    // Create a virtual root for the repo
    const rootId = "repo_root";
    code += `  ${rootId}((📦 Repository)):::root\n`;

    rootKeys.forEach(key => {
        traverse(hierarchy[key], key, rootId, 1);
    });

    // Styles
    code += `
      classDef root fill:#7c3aed,stroke:#fff,stroke-width:2px,color:#fff;
      classDef folder fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#fcd34d;
      classDef file fill:#0f172a,stroke:#38bdf8,stroke-width:1px,color:#bae6fd;
      classDef meta fill:transparent,stroke:none,color:#64748b,font-style:italic;
      linkStyle default stroke:#475569,stroke-width:1px,fill:none;
    `;

    return code;
  };

  const renderDiagram = async () => {
    if (!containerRef.current) return;
    setError(null);
    
    try {
      const definition = generateMermaidCode();
      const id = `mermaid-svg-${Date.now()}`;
      // mermaid.render returns an object { svg: string }
      const { svg } = await mermaid.render(id, definition);
      if (containerRef.current) {
          containerRef.current.innerHTML = svg;
      }
    } catch (e) {
      console.error("Mermaid render error:", e);
      setError("Unable to render graph. The repository structure might be too complex for this view level.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#0a0a0c] w-full max-w-6xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center p-4 border-b border-white/10 bg-[#12121a] gap-4">
           <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Repository Blueprint</h3>
                    <p className="text-xs text-gray-500">Live Architecture Diagram</p>
                </div>
           </div>

           {/* Depth Control (Collapsible Logic) */}
           <div className="flex items-center gap-4 bg-black/30 p-2 rounded-xl border border-white/5">
                <span className="text-xs text-gray-400 font-medium px-2">Tree Depth:</span>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                            key={lvl}
                            onClick={() => setDepth(lvl)}
                            className={`
                                w-8 h-8 rounded-lg text-xs font-bold transition-all
                                ${depth === lvl 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' 
                                    : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                                }
                            `}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
           </div>

           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative bg-[#050508]" dir="ltr">
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-3">
                    <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-sm font-mono bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">{error}</span>
                    <button onClick={() => setDepth(Math.max(1, depth - 1))} className="text-xs underline hover:text-white">Try reducing depth</button>
                </div>
            ) : (
                <div 
                    className="w-full h-full overflow-auto custom-scrollbar flex items-center justify-center p-8 transition-transform duration-300"
                    style={{ transform: `scale(${zoomLevel})` }}
                >
                    <div 
                        ref={containerRef} 
                        className="mermaid-container [&>svg]:max-w-none [&>svg]:min-w-[600px]"
                    ></div>
                </div>
            )}

            {/* Zoom Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <button onClick={() => setZoomLevel(z => Math.min(z + 0.1, 2))} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur border border-white/5 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
                <button onClick={() => setZoomLevel(z => Math.max(z - 0.1, 0.5))} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur border border-white/5 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                </button>
            </div>
            
            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-6 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-[10px] font-mono text-gray-400 flex gap-4">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#fcd34d] border border-[#f59e0b]"></span> Directory</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-sm bg-[#bae6fd] border border-[#38bdf8]"></span> File</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MermaidDiagram;
