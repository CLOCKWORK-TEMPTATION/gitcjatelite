
import React, { useState } from 'react';
import { GeneratedVisual, VisualStyle, VisualLanguage } from '../types';
import { fetchRelevantFilePaths, parseGithubUrl } from '../services/githubService';
import { generateInfographic } from '../services/geminiService';
import Loader from './Loader';

interface RepoAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  githubToken?: string;
}

const RepoAnalyzer: React.FC<RepoAnalyzerProps> = ({ isOpen, onClose, githubToken }) => {
  const [repoInput, setRepoInput] = useState('');
  const [style, setStyle] = useState<VisualStyle>('Blueprint');
  const [language, setLanguage] = useState<VisualLanguage>('English');
  const [is3D, setIs3D] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<GeneratedVisual[]>([]);
  const [currentVisual, setCurrentVisual] = useState<GeneratedVisual | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
        // 1. Parse URL
        const parsed = parseGithubUrl(repoInput) || { owner: repoInput.split('/')[0], repo: repoInput.split('/')[1] };
        if (!parsed.owner || !parsed.repo) throw new Error("Invalid Repository Format. Use 'owner/repo' or full URL.");

        // 2. Fetch File Tree
        const filePaths = await fetchRelevantFilePaths(parsed.owner, parsed.repo, githubToken);
        if (filePaths.length === 0) throw new Error("No relevant code files found in this repository.");

        // 3. Generate Image
        const base64Image = await generateInfographic(parsed.repo, filePaths, style, is3D, language);

        const newVisual: GeneratedVisual = {
            id: Date.now().toString(),
            repoName: parsed.repo,
            imageUrl: base64Image,
            style: style,
            is3D: is3D,
            timestamp: Date.now()
        };

        setHistory(prev => [newVisual, ...prev]);
        setCurrentVisual(newVisual);

    } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-left" dir="ltr">
      <div className="bg-[#12141a] w-full max-w-6xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Left Panel: Controls */}
        <div className="w-full md:w-80 p-6 bg-[#0d0f14] border-r border-white/5 overflow-y-auto flex flex-col shrink-0">
            <h2 className="text-xl font-bold text-white mb-1">Repo<span className="text-blue-500">Visualizer</span></h2>
            <p className="text-xs text-gray-500 mb-6">Generative Architectural Blueprints</p>

            <form onSubmit={handleGenerate} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Repository</label>
                    <input 
                        type="text" 
                        value={repoInput}
                        onChange={(e) => setRepoInput(e.target.value)}
                        placeholder="owner/repo" 
                        className="w-full bg-[#1c1f26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Visual Style</label>
                    <select 
                        value={style}
                        onChange={(e) => setStyle(e.target.value as VisualStyle)}
                        disabled={is3D}
                        className={`w-full bg-[#1c1f26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none ${is3D ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <option value="Blueprint">Blueprint</option>
                        <option value="Neon Cyberpunk">Neon Cyberpunk</option>
                        <option value="Modern">Modern</option>
                    </select>
                </div>

                <div className="flex items-center justify-between bg-[#1c1f26] p-3 rounded-lg border border-white/10">
                    <label className="text-xs font-semibold text-gray-400">3D Isometric Mode</label>
                    <button 
                        type="button"
                        onClick={() => setIs3D(!is3D)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${is3D ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${is3D ? 'translate-x-5' : ''}`}></div>
                    </button>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400">Language</label>
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as VisualLanguage)}
                        className="w-full bg-[#1c1f26] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    >
                        <option value="English">English</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Spanish">Spanish</option>
                        <option value="German">German</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Japanese">Japanese</option>
                    </select>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading || !repoInput}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader /> : 'Generate Blueprint'}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                    {error}
                </div>
            )}

            {/* History List */}
            {history.length > 0 && (
                <div className="mt-8 flex-1">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">History</h3>
                    <div className="space-y-2">
                        {history.map(item => (
                            <div 
                                key={item.id}
                                onClick={() => setCurrentVisual(item)}
                                className={`p-2 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${currentVisual?.id === item.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-10 h-10 rounded bg-black/50 overflow-hidden shrink-0">
                                    <img src={`data:image/png;base64,${item.imageUrl}`} className="w-full h-full object-cover" alt="thumb" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-medium text-white truncate">{item.repoName}</div>
                                    <div className="text-[10px] text-gray-500">{item.style} • {item.is3D ? '3D' : '2D'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Right Panel: Display */}
        <div className="flex-1 bg-[#050508] relative flex items-center justify-center p-8">
            {!currentVisual && !isLoading ? (
                <div className="text-center text-gray-600">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-sm">Configure and generate a visualization to start.</p>
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                    </div>
                    <p className="text-sm text-blue-400 animate-pulse">Designing architecture...</p>
                </div>
            ) : currentVisual && (
                <div className="w-full h-full flex flex-col">
                     <div className="flex-1 relative rounded-lg overflow-hidden border border-white/5 shadow-2xl group">
                         <img 
                            src={`data:image/png;base64,${currentVisual.imageUrl}`} 
                            alt="Visualization" 
                            className="w-full h-full object-contain bg-[#0a0a0c]" 
                         />
                         
                         <a 
                            href={`data:image/png;base64,${currentVisual.imageUrl}`}
                            download={`${currentVisual.repoName}-arch.png`}
                            className="absolute bottom-4 right-4 px-4 py-2 bg-black/70 backdrop-blur text-white text-xs font-medium rounded hover:bg-black transition-colors opacity-0 group-hover:opacity-100"
                         >
                            Download PNG
                         </a>
                     </div>
                     <div className="mt-4 flex justify-between items-center">
                         <div className="text-xs text-gray-500">Generated with Gemini 3 Pro (Imagen)</div>
                     </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default RepoAnalyzer;
