
import React, { useMemo, useState } from 'react';
import { FileNode } from '../types';

interface FileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  files: FileNode[];
  onFileClick: (file: FileNode) => void;
  onShowDiagram: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
  originalNode?: FileNode;
}

const buildTree = (files: FileNode[]): TreeNode[] => {
  const root: TreeNode[] = [];
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  sortedFiles.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        const isFile = index === parts.length - 1 && file.type === 'blob';
        const newNode: TreeNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: [],
          originalNode: isFile ? file : undefined
        };
        
        currentLevel.push(newNode);
        existingNode = newNode;
      }

      if (existingNode.type === 'folder') {
        currentLevel = existingNode.children;
      }
    });
  });

  return root;
};

const TreeNodeComponent: React.FC<{ node: TreeNode; onFileClick: (file: FileNode) => void; depth: number }> = ({ node, onFileClick, depth }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else if (node.originalNode) {
      onFileClick(node.originalNode);
    }
  };

  const FolderIcon = () => (
    <svg className={`w-4 h-4 mr-1.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  const FileIcon = () => (
    <svg className="w-4 h-4 mr-2 text-muted-foreground/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <div className="select-none">
      <div 
        className={`
            flex items-center py-1.5 px-2 cursor-pointer rounded-md text-xs transition-colors duration-150
            hover:bg-secondary hover:text-foreground text-muted-foreground
            ${node.type === 'file' ? 'ml-0.5' : ''}
        `}
        style={{ paddingRight: `${depth * 12 + 12}px` }} 
        onClick={handleClick}
      >
        {node.type === 'folder' ? <FolderIcon /> : <FileIcon />}
        <span className="truncate">{node.name}</span>
      </div>
      {isExpanded && node.children.length > 0 && (
        <div className="border-r border-border mr-3 pr-1">
          {node.children.map(child => (
            <TreeNodeComponent key={child.path} node={child} onFileClick={onFileClick} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const FileSidebar: React.FC<FileSidebarProps> = ({ isOpen, onClose, files, onFileClick, onShowDiagram }) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const extensions = useMemo(() => {
    const exts = new Set<string>();
    files.forEach(f => {
      if (f.type === 'blob') {
        const match = f.path.match(/\.([a-z0-9]+)$/i);
        if (match) exts.add(match[1].toLowerCase());
      }
    });
    return Array.from(exts).sort();
  }, [files]);

  const tree = useMemo(() => {
    const filteredFiles = files.filter(f => {
        if (f.type !== 'blob') return false;
        const name = f.path.toLowerCase();
        const extMatch = activeFilter === 'all' || name.endsWith(`.${activeFilter}`);
        const searchMatch = !searchQuery || name.includes(searchQuery.toLowerCase());
        return extMatch && searchMatch;
    });
    return buildTree(filteredFiles);
  }, [files, activeFilter, searchQuery]);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      
      <div 
        className={`fixed inset-y-0 right-0 w-80 bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col shadow-xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Explorer</h2>
          <div className="flex items-center gap-1">
            {files.length > 0 && (
                <button 
                  onClick={onShowDiagram}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title="View Graph"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-border">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-secondary text-foreground text-xs rounded-md border-transparent focus:border-primary focus:ring-0 px-3 py-2 placeholder-muted-foreground transition-all"
            />
        </div>

        {/* Filters */}
        {extensions.length > 0 && (
            <div className="px-4 py-2 border-b border-border overflow-x-auto whitespace-nowrap custom-scrollbar bg-secondary/20" dir="rtl">
                <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ml-2 border ${
                        activeFilter === 'all' 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                >
                    All
                </button>
                {extensions.map(ext => (
                    <button
                        key={ext}
                        onClick={() => setActiveFilter(ext)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ml-2 border ${
                            activeFilter === ext 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        .{ext}
                    </button>
                ))}
            </div>
        )}
        
        {/* Tree */}
        <div className="overflow-y-auto flex-1 p-2 dir-rtl custom-scrollbar">
             {tree.length === 0 ? (
                 <div className="flex flex-col items-center justify-center mt-10 text-muted-foreground space-y-2">
                     <span className="text-xs">No files found</span>
                 </div>
             ) : (
                tree.map(node => (
                    <TreeNodeComponent key={node.path} node={node} onFileClick={onFileClick} depth={0} />
                ))
             )}
        </div>
      </div>
    </>
  );
};

export default FileSidebar;
